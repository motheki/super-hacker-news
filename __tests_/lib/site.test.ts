import { describe, expect, test } from "bun:test";
import { SITE_URL } from "../../src/lib/site";

describe("site metadata", () => {
  test("uses the canonical apex domain", () => {
    expect(SITE_URL).toBe("https://superhn.org");
  });
});
