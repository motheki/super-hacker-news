export type JsonParser<T> = (value: unknown) => T | null;
import { RequestBudget, SubrequestBudgetError, type BudgetSnapshot } from "./budget";

type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
type Sleep = (delayMs: number) => Promise<void>;

interface SafeUpstreamError {
  readonly category: "timeout" | "abort" | "network" | "invalid-json" | "subrequest-limit" | "unknown";
  readonly name: string;
  readonly code?: string;
  readonly cause?: SafeUpstreamError;
}

export interface UpstreamMetric {
  readonly error?: SafeUpstreamError;
  readonly attempt: number;
  readonly bytes?: number;
  readonly durationMs: number;
  readonly operation: string;
  readonly outcome: "failure" | "invalid" | "not-found" | "retry" | "success";
  readonly provider: string;
  readonly status?: number;
  readonly subrequestsRemaining?: number;
  readonly subrequestsUsed?: number;
}

interface FetchJsonOptions {
  readonly budget?: RequestBudget;
  readonly cacheTtlSeconds?: number;
  readonly fetcher?: Fetcher;
  readonly operation: string;
  readonly provider: string;
  readonly report?: (metric: UpstreamMetric) => void;
  readonly retryCount?: number;
  readonly sleep?: Sleep;
  readonly timeoutMs?: number;
}

interface CloudflareRequestInit extends RequestInit {
  readonly cf?: {
    readonly cacheEverything: boolean;
    readonly cacheTtlByStatus: Readonly<Record<string, number>>;
  };
}

const HTTP_NOT_FOUND = 404;
const HTTP_RATE_LIMITED = 429;
const HTTP_SERVER_ERROR = 500;
const REQUEST_TIMEOUT_MS = 3_000;
const RETRY_COUNT = 1;
const RETRY_DELAY_MS = 100;
const SLOW_REQUEST_MS = 250;
const SUBREQUEST_LIMIT_MESSAGE = "Too many subrequests";

function wait(delayMs: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function reportMetric(metric: UpstreamMetric) {
  if (metric.outcome === "success" && metric.durationMs < SLOW_REQUEST_MS) {
    return;
  }

  console.info(JSON.stringify({ event: "hn.upstream", ...metric }));
}

function durationSince(start: number) {
  return Math.round((performance.now() - start) * 10) / 10;
}

function canRetry(status: number) {
  return status === HTTP_RATE_LIMITED || status >= HTTP_SERVER_ERROR;
}

function contentLength(response: Response) {
  const header = response.headers.get("content-length");
  if (header === null) return undefined;

  const bytes = Number(header);
  return Number.isSafeInteger(bytes) && bytes >= 0 ? bytes : undefined;
}

function toError(error: unknown) {
  return error instanceof Error ? error : new Error(String(error));
}

function hitSubrequestLimit(error: unknown) {
  return (
    error instanceof SubrequestBudgetError ||
    toError(error).message.includes(SUBREQUEST_LIMIT_MESSAGE)
  );
}

const SAFE_ERROR_NAMES = new Set([
  "Error", "TypeError", "SyntaxError", "RangeError", "AggregateError",
  "DOMException", "TimeoutError", "AbortError", "SubrequestBudgetError",
]);
const TIMEOUT_ERROR_CODES = new Set([
  "ETIMEDOUT", "UND_ERR_CONNECT_TIMEOUT", "UND_ERR_HEADERS_TIMEOUT", "UND_ERR_BODY_TIMEOUT",
]);
const NETWORK_ERROR_CODES = new Set([
  "ECONNRESET", "ECONNREFUSED", "ECONNABORTED", "ENOTFOUND", "EAI_AGAIN",
  "ENETUNREACH", "EHOSTUNREACH", "EPIPE", "UND_ERR_SOCKET",
]);

function errorField(error: unknown, key: "name" | "code" | "cause"): unknown {
  // Thrown values need not be Errors, and custom accessors must not break reporting.
  try {
    return typeof error === "object" && error !== null ? Reflect.get(error, key) : undefined;
  } catch {
    return undefined;
  }
}

function safeError(error: unknown, depth = 0): SafeUpstreamError {
  const rawName = errorField(error, "name");
  const name = typeof rawName === "string" && SAFE_ERROR_NAMES.has(rawName) ? rawName : "UnknownError";
  const rawCode = errorField(error, "code");
  const code = typeof rawCode === "string" &&
    (TIMEOUT_ERROR_CODES.has(rawCode) || NETWORK_ERROR_CODES.has(rawCode)) ? rawCode : undefined;
  const rawCause = errorField(error, "cause");
  // Bound both cyclic and excessively deep chains; never serialize messages, stacks, or URLs.
  const cause = depth < 3 && rawCause !== undefined ? safeError(rawCause, depth + 1) : undefined;
  let category: SafeUpstreamError["category"] = cause?.category ?? "unknown";
  if (name === "TimeoutError" || (code !== undefined && TIMEOUT_ERROR_CODES.has(code))) {
    category = "timeout";
  } else if (name === "AbortError") {
    category = "abort";
  } else if (name === "SubrequestBudgetError") {
    category = "subrequest-limit";
  } else if (name === "SyntaxError") {
    category = "invalid-json";
  } else if (category === "unknown" && (name === "TypeError" || code !== undefined)) {
    category = "network";
  }
  return { category, name, ...(code === undefined ? {} : { code }), ...(cause ? { cause } : {}) };
}

function budgetMetric(budget: RequestBudget | undefined): Partial<BudgetSnapshot> {
  return budget?.snapshot() ?? {};
}

export async function fetchJson<T>(
  url: string,
  parse: JsonParser<T>,
  options: Readonly<FetchJsonOptions>,
): Promise<T | null> {
  const fetcher = options.fetcher ?? fetch;
  const report = options.report ?? reportMetric;
  const retryCount = options.retryCount ?? RETRY_COUNT;
  const sleep = options.sleep ?? wait;
  const timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS;
  const attempts = retryCount + 1;
  const requestInit: CloudflareRequestInit = {
    headers: { accept: "application/json" },
    ...(options.cacheTtlSeconds === undefined
      ? {}
      : {
          cf: {
            cacheEverything: true,
            cacheTtlByStatus: {
              "200-299": options.cacheTtlSeconds,
              "300-599": -1,
            },
          },
        }),
  };

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const start = performance.now();
    let response: Response;

    try {
      options.budget?.take();
      response = await fetcher(url, {
        ...requestInit,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      const canRetryError = !hitSubrequestLimit(error) && attempt < attempts;
      const outcome = canRetryError ? "retry" : "failure";
      report({
        attempt,
        ...budgetMetric(options.budget),
        durationMs: durationSince(start),
        error: safeError(error),
        operation: options.operation,
        outcome,
        provider: options.provider,
      });

      if (!canRetryError) {
        throw new Error("Upstream request failed", { cause: error });
      }

      await sleep(RETRY_DELAY_MS * attempt);
      continue;
    }

    const bytes = contentLength(response);
    const metric = () => ({
      attempt,
      ...budgetMetric(options.budget),
      ...(bytes === undefined ? {} : { bytes }),
      durationMs: durationSince(start),
      operation: options.operation,
      provider: options.provider,
      status: response.status,
    });

    // Release the connection before retrying or falling back to another provider.
    if (!response.ok) await response.body?.cancel();

    if (response.status === HTTP_NOT_FOUND) {
      report({ ...metric(), outcome: "not-found" });
      return null;
    }

    if (!response.ok) {
      if (attempt < attempts && canRetry(response.status)) {
        report({ ...metric(), outcome: "retry" });
        await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }

      report({ ...metric(), outcome: "failure" });
      throw new Error(`Upstream request failed with status ${response.status}`);
    }

    let value: unknown;
    try {
      value = await response.json();
    } catch (error) {
      report({ ...metric(), error: safeError(error), outcome: "invalid" });
      throw new Error("Upstream returned unreadable JSON", { cause: error });
    }

    const parsed = parse(value);
    report({ ...metric(), outcome: parsed === null ? "invalid" : "success" });
    return parsed;
  }

  throw new Error("Upstream request exhausted its attempts");
}

export async function preferPrimary<T>(
  operation: string,
  primary: () => Promise<T | null>,
  official: () => Promise<T | null>,
): Promise<T | null> {
  let reason = "primary-miss";
  let failure: SafeUpstreamError | undefined;

  try {
    const value = await primary();
    if (value !== null) return value;
  } catch (error) {
    reason = "primary-failure";
    failure = safeError(error);
  }

  console.warn(JSON.stringify({
    event: "hn.fallback", operation, reason, ...(failure ? { error: failure } : {}),
  }));
  return official();
}
