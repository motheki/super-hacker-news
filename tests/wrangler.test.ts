import { describe, expect, test } from "bun:test";

const CONFIG_PATH = new URL("../wrangler.jsonc", import.meta.url);

describe("public worker configuration", () => {
  test("has no private Hacker News data service", async () => {
    const config = await Bun.file(CONFIG_PATH).text();

    expect(config).not.toContain("HN_DATA");
    expect(config).not.toContain("super-hn-data");
  });
});
