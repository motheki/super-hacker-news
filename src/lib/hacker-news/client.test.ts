import { describe, expect, test } from "bun:test";
import { fetchJson, preferPrimary } from "./client";
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
