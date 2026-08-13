import { describe, expect, test } from "bun:test";
import {
  isTopicName,
  isValidUserName,
  MAX_USER_NAME_LENGTH,
  parseFeedOffset,
  parsePage,
  parsePostId,
} from "./route";

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
  });

  test("parses one non-negative decimal feed offset", () => {
    expect(parseFeedOffset()).toBe(0);
    expect(parseFeedOffset([])).toBe(0);
    expect(parseFeedOffset("0")).toBe(0);
    expect(parseFeedOffset("12")).toBe(12);
    expect(parseFeedOffset("29")).toBe(29);
    expect(parseFeedOffset(["12"])).toBe(12);
    expect(parseFeedOffset(["12", "13"])).toBeNull();
    expect(parseFeedOffset("-1")).toBeNull();
    expect(parseFeedOffset("1.5")).toBeNull();
    expect(parseFeedOffset("01")).toBeNull();
    expect(parseFeedOffset("30")).toBeNull();
    expect(parseFeedOffset("31")).toBeNull();
    expect(parseFeedOffset(String(Number.MAX_SAFE_INTEGER))).toBeNull();
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
