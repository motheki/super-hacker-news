import { describe, expect, test } from "bun:test";
import { percentile } from "./live-benchmark";

describe("live benchmark", () => {
  test("uses nearest-rank percentiles", () => {
    expect(percentile([50, 10, 30, 20, 40], 0.5)).toBe(30);
    expect(percentile([50, 10, 30, 20, 40], 0.95)).toBe(50);
  });
});
