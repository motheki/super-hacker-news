import { describe, expect, test } from "bun:test";
import { cacheHtml, getPostCache } from "./cache";

const DAY_SECONDS = 86_400;
const MONTH_SECONDS = 30 * DAY_SECONDS;
const NOW_SECONDS = 2_000_000_000;

describe("cacheHtml", () => {
  test("adds a short browser cache to successful HTML", async () => {
    const response = cacheHtml(
      new Response("<main>cached</main>", {
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
    );

    expect(response.headers.get("cache-control")).toBe("public, max-age=15");
    expect(await response.text()).toBe("<main>cached</main>");
  });

  test("does not cache errors or non-HTML responses", () => {
    const error = cacheHtml(
      new Response("error", {
        headers: { "content-type": "text/html" },
        status: 500,
      }),
    );
    const json = cacheHtml(Response.json({ ok: true }));

    expect(error.headers.has("cache-control")).toBe(false);
    expect(json.headers.has("cache-control")).toBe(false);
  });
});

describe("getPostCache", () => {
  test("keeps active discussions fresh", () => {
    expect(getPostCache(NOW_SECONDS - DAY_SECONDS + 1, NOW_SECONDS)).toEqual({
      maxAge: 60,
      swr: 240,
    });
  });

  test("caches settled discussions briefly", () => {
    expect(getPostCache(NOW_SECONDS - DAY_SECONDS, NOW_SECONDS)).toEqual({
      maxAge: 300,
      swr: 3_600,
    });
  });

  test("caches archived discussions at the edge", () => {
    expect(getPostCache(NOW_SECONDS - MONTH_SECONDS, NOW_SECONDS)).toEqual({
      maxAge: 3_600,
      swr: 86_400,
    });
  });
});
