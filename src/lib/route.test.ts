import { describe, expect, test } from "bun:test";
import {
  canonicalRoute,
  isCacheablePath,
  isTopicName,
  isValidUserName,
  MAX_USER_NAME_LENGTH,
  parsePage,
  parsePostId,
} from "./route";

describe("cache URL canonicalization", () => {
  test("normalizes slashes and tracking queries in one redirect", () => {
    const cases = [
      ["/top/?utm_source=test", "/top"],
      ["/top/?page=2&utm_source=test", "/top/2"],
      ["/top/2/?page=3", "/top/2"],
      ["/post/123/", "/post/123"],
      ["/user/pg/?tracking=1", "/user/pg"],
      ["/sitemap.xml/?tracking=1", "/sitemap.xml"],
    ] as const;
    for (const [path, canonical] of cases) {
      const url = new URL(path, "https://superhn.org");
      expect(isCacheablePath(url.pathname)).toBe(true);
      expect(canonicalRoute(url)).toBe(canonical);
    }
  });

  test("leaves canonical routes and unrelated assets alone", () => {
    for (const path of ["/top", "/top/2", "/post/123", "/user/pg", "/_astro/app.js?v=1"]) {
      expect(canonicalRoute(new URL(path, "https://superhn.org"))).toBeNull();
    }
    expect(isCacheablePath("/_astro/app.js")).toBe(false);
    expect(isCacheablePath("/unknown/")).toBe(false);
  });
});

describe("topic routes", () => {
  test("recognizes configured topic names", () => {
    expect(isTopicName("top")).toBe(true);
    expect(isTopicName("unknown")).toBe(false);
  });

  test("parses one positive decimal page query", () => {
    expect(parsePage()).toBe(1);
    expect(parsePage([])).toBe(1);
    expect(parsePage("2")).toBe(2);
    expect(parsePage(["3"])).toBe(3);
    expect(parsePage(["3", "4"])).toBeNull();
    expect(parsePage("0")).toBeNull();
    expect(parsePage("1.5")).toBeNull();
    expect(parsePage("1e2")).toBeNull();
    expect(parsePage("0x10")).toBeNull();
    expect(parsePage("bad")).toBeNull();
    expect(parsePage("10")).toBe(10);
    expect(parsePage(["10"])).toBe(10);
    expect(parsePage("11")).toBeNull();
    expect(parsePage(["11"])).toBeNull();
    expect(parsePage("9007199254740991")).toBeNull();
  });
});

describe("parsePostId", () => {
  test("accepts positive safe integers", () => {
    expect(parsePostId("1")).toBe(1);
    expect(parsePostId("9000")).toBe(9000);
  });

  test("rejects malformed and non-positive IDs", () => {
    expect(parsePostId("0")).toBeNull();
    expect(parsePostId("-1")).toBeNull();
    expect(parsePostId("1.5")).toBeNull();
    expect(parsePostId("1e2")).toBeNull();
    expect(parsePostId("0x10")).toBeNull();
    expect(parsePostId("not-a-number")).toBeNull();
  });
});

describe("isValidUserName", () => {
  test("requires a non-empty username within the upstream limit", () => {
    expect(isValidUserName("pg")).toBe(true);
    expect(isValidUserName("")).toBe(false);
    expect(isValidUserName("a".repeat(MAX_USER_NAME_LENGTH))).toBe(true);
    expect(isValidUserName("a".repeat(MAX_USER_NAME_LENGTH + 1))).toBe(false);
  });
});
