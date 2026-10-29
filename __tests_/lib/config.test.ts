import { expect, test } from "bun:test";
const root = new URL("../../", import.meta.url);
test("deployment serves assets without a Worker entrypoint or Worker cache", async () => {
  const config = JSON.parse(await Bun.file(new URL("wrangler.jsonc", root)).text());
  expect(config.main).toBeUndefined();
  expect(config.cache).toBeUndefined();
  expect(config.assets).toEqual({ directory: "./dist", not_found_handling: "404-page", html_handling: "drop-trailing-slash" });
  const astro = await Bun.file(new URL("astro.config.ts", root)).text();
  expect(astro).not.toContain("@astrojs/cloudflare");
  expect(astro).not.toContain("routeRules");
  expect(astro).toContain('output: "static"');
  for await (const file of new Bun.Glob("src/pages/**/*.{astro,ts}").scan({ cwd: root.pathname, absolute: true })) {
    const source = await Bun.file(file).text();
    expect(source).not.toContain("prerender = false");
    expect(source).not.toContain("Astro.cache");
  }
});
