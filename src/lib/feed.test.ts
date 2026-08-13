import { describe, expect, test } from "bun:test";
import { getVisibleFeedCount } from "./feed";

describe("getVisibleFeedCount", () => {
  test("fits complete rows and their gaps within the available viewport", () => {
    expect(getVisibleFeedCount([40, 50, 60], 106, 8)).toBe(2);
    expect(getVisibleFeedCount([40, 50, 60], 157, 8)).toBe(2);
    expect(getVisibleFeedCount([40, 50, 60], 166, 8)).toBe(3);
  });

  test("keeps navigation useful in unusually short viewports", () => {
    expect(getVisibleFeedCount([80, 40], 20, 16)).toBe(1);
    expect(getVisibleFeedCount([], 100, 16)).toBe(0);
  });
});
