import { expect, test } from "bun:test";

const CONFIG = new URL("../../astro.config.ts", import.meta.url);

test("keeps server builds free of unused experiments", async () => {
  const source = await Bun.file(CONFIG).text();

  expect(source).not.toContain("incrementalBuild");
  expect(source).not.toContain("chromeDevtoolsWorkspace");
});
