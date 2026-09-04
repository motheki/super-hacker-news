import { describe, expect, test } from "bun:test";

const CONFIG_PATH = new URL("../wrangler.jsonc", import.meta.url);

describe("public worker configuration", () => {
  test("has no private Hacker News data service", async () => {
    const config = await Bun.file(CONFIG_PATH).text();

    expect(config).not.toContain("HN_DATA");
    expect(config).not.toContain("super-hn-data");
  });

  test("checks transport before Astro and static assets", async () => {
    const config = await Bun.file(CONFIG_PATH).text();

    expect(config).toContain('"main": "./src/worker.ts"');
    expect(config).toContain('"run_worker_first": true');
  });
});
