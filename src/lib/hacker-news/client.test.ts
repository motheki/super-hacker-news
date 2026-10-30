import { describe, expect, spyOn, test } from "bun:test";
import { fetchJson, preferPrimary, type UpstreamMetric } from "./client";
import { RequestBudget } from "./budget";

const parseNumber = (value: unknown) => (typeof value === "number" ? value : null);

const noWait = () => Promise.resolve();

describe("fetchJson", () => {
  test("caches successes without retaining upstream errors or redirects", async () => {
    let init: RequestInit | undefined;
    await fetchJson("https://example.test/item", parseNumber, {
      cacheTtlSeconds: 60,
      fetcher: (_url, options) => {
        init = options;
        return Promise.resolve(Response.json(42));
      },
      operation: "item",
      provider: "test",
    });

    expect(init).toMatchObject({
      cf: { cacheEverything: true, cacheTtlByStatus: { "200-299": 60, "300-599": -1 } },
    });
    expect(init).not.toHaveProperty("cf.cacheTtl");
  });

  test("cancels unused error bodies before a retry", async () => {
    let cancelled = false;
    let calls = 0;
    const value = await fetchJson("https://example.test/item", parseNumber, {
      fetcher: () => {
        calls += 1;
        if (calls === 1) {
          return Promise.resolve(new Response(new ReadableStream({
            cancel() { cancelled = true; },
          }), { status: 503 }));
        }
        expect(cancelled).toBe(true);
        return Promise.resolve(Response.json(42));
      },
      operation: "item",
      provider: "test",
      sleep: noWait,
    });

    expect(value).toBe(42);
  });

  test("unreadable JSON is an outage, not a missing resource", async () => {
    await expect(fetchJson("https://example.test/item", parseNumber, {
      fetcher: () => Promise.resolve(new Response("{broken")),
      operation: "item",
      provider: "test",
    })).rejects.toThrow("Upstream returned unreadable JSON");
  });

  test("reports a timeout category without retrying when retries are disabled", async () => {
    const metrics: UpstreamMetric[] = [];
    let calls = 0;
    await expect(fetchJson("https://example.test/item", parseNumber, {
      fetcher: (_url, init) => {
        calls += 1;
        const signal = init!.signal!;
        return new Promise<Response>((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(signal.reason), { once: true });
        });
      },
      operation: "post",
      provider: "test",
      report: (metric) => metrics.push(metric),
      retryCount: 0,
      timeoutMs: 5,
    })).rejects.toThrow("Upstream request failed");

    expect(calls).toBe(1);
    expect(metrics).toHaveLength(1);
    expect(metrics[0]).toMatchObject({
      outcome: "failure",
      error: { category: "timeout", name: "TimeoutError" },
    });
  });

  test.each(["fetch", "body"] as const)("logs safe nested network causes on %s rejection", async (phase) => {
    const secret = "https://user:password@example.test/private?token=secret";
    const root = Object.assign(new Error(secret), { code: "ECONNRESET" });
    const failure = new TypeError(secret, { cause: new Error(secret, { cause: root }) });
    const log = spyOn(console, "info").mockImplementation(() => {});
    try {
      const response = Response.json(42);
      response.json = () => Promise.reject(failure);
      const result = fetchJson(secret, parseNumber, {
        fetcher: () => phase === "fetch" ? Promise.reject(failure) : Promise.resolve(response),
        operation: "post",
        provider: "test",
        retryCount: 0,
      });
      await expect(result).rejects.toThrow(
        phase === "fetch" ? "Upstream request failed" : "Upstream returned unreadable JSON",
      );
      // Preserve the original cause for callers while only emitting safe metadata.
      await result.catch((error) => expect(error.cause).toBe(failure));
      expect(log).toHaveBeenCalledTimes(1);
      const output = String(log.mock.calls[0]?.[0]);
      expect(JSON.parse(output)).toMatchObject({
        event: "hn.upstream",
        outcome: phase === "fetch" ? "failure" : "invalid",
        error: {
          category: "network",
          name: "TypeError",
          cause: {
            category: "network",
            name: "Error",
            cause: { category: "network", name: "Error", code: "ECONNRESET" },
          },
        },
      });
      expect(output).not.toContain(secret);
      expect(output).not.toContain("message");
      expect(output).not.toContain("stack");
    } finally {
      log.mockRestore();
    }
  });

  test("reports malformed JSON as invalid-json", async () => {
    const metrics: UpstreamMetric[] = [];
    await expect(fetchJson("https://example.test/item", parseNumber, {
      fetcher: () => Promise.resolve(new Response("{broken")),
      operation: "post",
      provider: "test",
      report: (metric) => metrics.push(metric),
    })).rejects.toThrow("Upstream returned unreadable JSON");
    expect(metrics[0]).toMatchObject({
      outcome: "invalid",
      error: { category: "invalid-json", name: "SyntaxError" },
    });
  });

  test("bounds cyclic causes and redacts arbitrary error names and codes", async () => {
    const secret = "https://user:password@example.test/?token=secret";
    const failure = Object.assign(new Error(secret), { name: secret, code: secret });
    failure.cause = failure;
    const metrics: UpstreamMetric[] = [];
    await expect(fetchJson(secret, parseNumber, {
      fetcher: () => Promise.reject(failure),
      operation: "post",
      provider: "test",
      report: (metric) => metrics.push(metric),
      retryCount: 0,
    })).rejects.toThrow("Upstream request failed");
    const summary = metrics[0]?.error;
    expect(summary).toMatchObject({ category: "unknown", name: "UnknownError" });
    expect(summary?.cause?.cause?.cause).toEqual({ category: "unknown", name: "UnknownError" });
    expect(JSON.stringify(metrics)).not.toContain(secret);
  });

  test("reports safe details on retries as well as final failures", async () => {
    const metrics: UpstreamMetric[] = [];
    await expect(fetchJson("https://example.test/item", parseNumber, {
      fetcher: () => Promise.reject(new DOMException("private detail", "TimeoutError")),
      operation: "post",
      provider: "test",
      report: (metric) => metrics.push(metric),
      sleep: noWait,
    })).rejects.toThrow("Upstream request failed");
    expect(metrics.map(({ outcome, error }) => ({ outcome, error }))).toEqual([
      { outcome: "retry", error: { category: "timeout", name: "TimeoutError" } },
      { outcome: "failure", error: { category: "timeout", name: "TimeoutError" } },
    ]);
  });

  test("valid JSON null still represents a missing resource", async () => {
    expect(await fetchJson("https://example.test/item", parseNumber, {
      fetcher: () => Promise.resolve(Response.json(null)),
      operation: "item",
      provider: "test",
    })).toBeNull();
  });

  test("retries transient responses", async () => {
    let calls = 0;
    const fetcher = () => {
      calls += 1;
      const response = calls === 1 ? new Response(null, { status: 503 }) : Response.json(42);

      return Promise.resolve(response);
    };

    const value = await fetchJson("https://example.test/item", parseNumber, {
      fetcher,
      operation: "item",
      provider: "test",
      sleep: noWait,
    });

    expect(value).toBe(42);
    expect(calls).toBe(2);
  });

  test("does not retry missing resources", async () => {
    let calls = 0;
    const fetcher = () => {
      calls += 1;
      return Promise.resolve(new Response(null, { status: 404 }));
    };

    const value = await fetchJson("https://example.test/item", parseNumber, {
      fetcher,
      operation: "item",
      provider: "test",
      sleep: noWait,
    });

    expect(value).toBeNull();
    expect(calls).toBe(1);
  });

  test("does not retry a Worker subrequest limit", async () => {
    let calls = 0;
    const fetcher = () => {
      calls += 1;
      return Promise.reject(new Error("Too many subrequests by single Worker invocation"));
    };

    const result = fetchJson("https://example.test/item", parseNumber, {
      fetcher,
      operation: "item",
      provider: "test",
      sleep: noWait,
    });

    expect(result).rejects.toThrow("Upstream request failed");
    await result.catch(() => undefined);
    expect(calls).toBe(1);
  });

  test("counts every retry against the request budget", async () => {
    const budget = new RequestBudget(2);
    let calls = 0;
    const fetcher = () => {
      calls += 1;
      return Promise.resolve(new Response(null, { status: 503 }));
    };

    const result = fetchJson("https://example.test/item", parseNumber, {
      budget,
      fetcher,
      operation: "item",
      provider: "test",
      retryCount: 2,
      sleep: noWait,
    });

    expect(result).rejects.toThrow("Upstream request failed");
    await result.catch(() => undefined);
    expect(calls).toBe(2);
    expect(budget.snapshot()).toEqual({
      subrequestsRemaining: 0,
      subrequestsUsed: 2,
    });
  });
});

describe("preferPrimary", () => {
  test("logs structured causes instead of arbitrary primary error messages", async () => {
    const log = spyOn(console, "warn").mockImplementation(() => {});
    const secret = "https://user:password@example.test/?token=secret";
    try {
      const value = await preferPrimary(
        "post",
        () => Promise.reject(new Error(secret, {
          cause: Object.assign(new Error(secret), { code: "ETIMEDOUT" }),
        })),
        () => Promise.resolve(42),
      );
      expect(value).toBe(42);
      expect(log).toHaveBeenCalledTimes(1);
      const output = String(log.mock.calls[0]?.[0]);
      expect(JSON.parse(output)).toEqual({
        event: "hn.fallback",
        operation: "post",
        reason: "primary-failure",
        error: {
          category: "timeout",
          name: "Error",
          cause: { category: "timeout", name: "Error", code: "ETIMEDOUT" },
        },
      });
      expect(output).not.toContain(secret);
    } finally {
      log.mockRestore();
    }
  });

  test("uses the official fallback after a primary failure", async () => {
    const value = await preferPrimary(
      "post",
      () => Promise.reject(new Error("primary unavailable")),
      () => Promise.resolve(42),
    );

    expect(value).toBe(42);
  });

  test("uses the official fallback after invalid primary data", async () => {
    const value = await preferPrimary(
      "post",
      () => Promise.resolve(null),
      () => Promise.resolve(42),
    );

    expect(value).toBe(42);
  });
});
