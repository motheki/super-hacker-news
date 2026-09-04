import { describe, expect, test } from "bun:test";
import { redirectHttp, redirectLegacy } from "./lib/redirect";

describe("legacy host redirect", () => {
  test("preserves the path and query in a permanent redirect", () => {
    const response = redirectLegacy(
      new URL(
        "https://super-hn.trevor-opiyo.workers.dev/post/8863?from=legacy",
      ),
    );

    expect(response?.status).toBe(308);
    expect(response?.headers.get("location")).toBe(
      "https://superhn.org/post/8863?from=legacy",
    );
  });

  test("ignores every other host", () => {
    expect(redirectLegacy(new URL("https://superhn.org/top"))).toBeNull();
  });
});

describe("HTTP redirect", () => {
  test("redirects the canonical production host to HTTPS", () => {
    const response = redirectHttp(
      new URL("http://superhn.org/post/8863?from=http"),
    );

    expect(response?.status).toBe(308);
    expect(response?.headers.get("location")).toBe(
      "https://superhn.org/post/8863?from=http",
    );
  });

  test("does not redirect local development", () => {
    expect(redirectHttp(new URL("http://localhost:3000/top"))).toBeNull();
  });
});
