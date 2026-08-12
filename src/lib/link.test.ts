import { describe, expect, test } from "bun:test";
import { isInternalPath, isSafeExternalUrl, replaceHnPostLinks } from "./link";

test("replaceHnPostLinks rewrites Hacker News discussion URLs only", () => {
  expect(replaceHnPostLinks("https://news.ycombinator.com/item?id=42")).toBe(
    "/post/42",
  );
  expect(replaceHnPostLinks("https://example.com/item?id=42")).toBe(
    "https://example.com/item?id=42",
  );
});

describe("link classification", () => {
  test("accepts only single-leading-slash paths as internal", () => {
    expect(isInternalPath("/post/42")).toBe(true);
    expect(isInternalPath("//example.com/path")).toBe(false);
    expect(isInternalPath("https://example.com/path")).toBe(false);
  });

  test("allows only HTTP(S) external URLs", () => {
    expect(isSafeExternalUrl("https://example.com/path")).toBe(true);
    expect(isSafeExternalUrl("http://example.com/path")).toBe(true);
    expect(isSafeExternalUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeExternalUrl("//example.com/path")).toBe(false);
    expect(isSafeExternalUrl()).toBe(false);
  });
});
