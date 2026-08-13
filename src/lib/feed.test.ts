import { describe, expect, test } from "bun:test";
import { getFeedContinuation, getVisibleFeedCount } from "./feed";

describe("getFeedContinuation", () => {
  test("continues within an upstream page", () => {
    expect(getFeedContinuation(1, 0, 10)).toEqual({ page: 1, offset: 10 });
    expect(getFeedContinuation(2, 10, 10)).toEqual({ page: 2, offset: 20 });
  });

  test("carries overflow into the next upstream page", () => {
    expect(getFeedContinuation(1, 20, 10)).toEqual({ page: 2 });
    expect(getFeedContinuation(1, 28, 10)).toEqual({ page: 2, offset: 8 });
  });
});

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
