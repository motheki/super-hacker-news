export type JsonParser<T> = (value: unknown) => T | null;

type Fetcher = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;
type Sleep = (delayMs: number) => Promise<void>;

export interface UpstreamMetric {
  readonly attempt: number;
  readonly bytes?: number;
  readonly durationMs: number;
  readonly operation: string;
  readonly outcome: "failure" | "invalid" | "not-found" | "retry" | "success";
  readonly provider: string;
  readonly status?: number;
}

interface FetchJsonOptions {
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
    readonly cacheTtl: number;
  };
}

const HTTP_NOT_FOUND = 404;
const HTTP_RATE_LIMITED = 429;
const HTTP_SERVER_ERROR = 500;
const REQUEST_TIMEOUT_MS = 3_000;
const RETRY_COUNT = 1;
const RETRY_DELAY_MS = 100;
const SLOW_REQUEST_MS = 250;

function wait(delayMs: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function reportMetric(metric: UpstreamMetric) {
  if (metric.outcome === "success" && metric.durationMs < SLOW_REQUEST_MS) {
    return;
  }

  console.info("hn.upstream", metric);
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
            cacheTtl: options.cacheTtlSeconds,
          },
        }),
  };

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const start = performance.now();
    let response: Response;

    try {
      response = await fetcher(url, {
        ...requestInit,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      const outcome = attempt < attempts ? "retry" : "failure";
      report({
        attempt,
        durationMs: durationSince(start),
        operation: options.operation,
        outcome,
        provider: options.provider,
      });

      if (attempt >= attempts) {
        throw new Error("Upstream request failed", { cause: toError(error) });
      }

      await sleep(RETRY_DELAY_MS * attempt);
      continue;
    }

    const bytes = contentLength(response);
    const metric = () => ({
      attempt,
      ...(bytes === undefined ? {} : { bytes }),
      durationMs: durationSince(start),
      operation: options.operation,
      provider: options.provider,
      status: response.status,
    });

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
    } catch {
      report({ ...metric(), outcome: "invalid" });
      return null;
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

  try {
    const value = await primary();
    if (value !== null) return value;
  } catch (error) {
    reason = `primary-failure: ${toError(error).message}`;
  }

  console.warn("hn.fallback", { operation, reason });
  return official();
}
