import { describe, expect, test } from "bun:test";
import { fetchJson, preferPrimary } from "./client";

const parseNumber = (value: unknown) =>
  typeof value === "number" ? value : null;

const noWait = () => Promise.resolve();

describe("fetchJson", () => {
  test("retries transient responses", async () => {
    let calls = 0;
    const fetcher = () => {
      calls += 1;
      const response =
        calls === 1 ? new Response(null, { status: 503 }) : Response.json(42);

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
      return Promise.reject(
        new Error("Too many subrequests by single Worker invocation"),
      );
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
