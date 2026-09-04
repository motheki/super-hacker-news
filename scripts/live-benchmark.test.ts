import { describe, expect, test } from "bun:test";
import {
  cacheState,
  decodedLength,
  followRedirects,
  parseServerTiming,
  percentile,
  selectPostIds,
} from "./live-benchmark";

describe("live benchmark", () => {
  test("uses nearest-rank percentiles", () => {
    expect(percentile([50, 10, 30, 20, 40], 0.5)).toBe(30);
    expect(percentile([50, 10, 30, 20, 40], 0.95)).toBe(50);
  });

  test("normalizes Cloudflare and Vercel cache headers", () => {
    expect(cacheState(new Headers({ "cf-cache-status": "HIT" }))).toEqual({
      provider: "cloudflare",
      status: "HIT",
    });
    expect(cacheState(new Headers({ "x-vercel-cache": "miss" }))).toEqual({
      provider: "vercel",
      status: "MISS",
    });
    expect(cacheState(new Headers())).toEqual({
      provider: "none",
      status: "NONE",
    });
  });

  test("records every redirect and the final URL", async () => {
    const requests: string[] = [];
    const fetcher = (input: string | URL | Request) => {
      const url = input instanceof Request ? input.url : input.toString();
      requests.push(url);
      if (url.endsWith("/start")) {
        return Promise.resolve(
          new Response(null, { headers: { location: "/middle" }, status: 302 }),
        );
      }
      if (url.endsWith("/middle")) {
        return Promise.resolve(
          new Response(null, { headers: { location: "/final" }, status: 308 }),
        );
      }

      return Promise.resolve(new Response("done"));
    };

    const result = await followRedirects("https://example.test/start", fetcher);

    expect(requests).toHaveLength(3);
    expect(result.redirects).toBe(2);
    expect(result.finalUrl).toBe("https://example.test/final");
  });

  test("parses named server timing durations", () => {
    expect(
      parseServerTiming('fetch;dur=8.4, render;dur=12.5;desc="page"'),
    ).toEqual({ fetch: 8.4, render: 12.5 });
  });

  test("measures encoded and decoded body sizes", () => {
    const body = new TextEncoder().encode("a".repeat(1_000));
    const encoded = Bun.gzipSync(body);

    expect(decodedLength(encoded, "gzip")).toBe(body.byteLength);
    expect(encoded.byteLength).toBeLessThan(body.byteLength);
  });

  test("selects ten valid post IDs", () => {
    expect(selectPostIds([1, 0, "2", 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])).toEqual(
      [1, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    );
    expect(
      selectPostIds([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], new Set([1, 2])),
    ).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(selectPostIds(null)).toEqual([]);
  });
});
