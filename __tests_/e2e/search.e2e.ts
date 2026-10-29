import { expect, test, type Page } from "@playwright/test";

async function queryFromIndex(page: Page) {
  return page.evaluate(async () => {
    const path = "/pagefind/pagefind.js";
    const pagefind = await import(/* @vite-ignore */ path);
    const found = await pagefind.search(null);
    const hit = await found.results[0].data();
    return { query: hit.meta.title as string, url: hit.url as string };
  });
}

test("real search index supports shareable queries, date sorting, clearing and empty results", async ({ page }) => {
  await page.goto("/search");
  const indexed = await queryFromIndex(page);
  await page.goto(`/search?q=${encodeURIComponent(indexed.query)}&sort=date`);
  await expect(page.locator("#search-results .story-link").first()).toBeVisible();
  await expect(page.locator("#search-query")).toHaveValue(indexed.query);
  await expect(page.locator("#search-sort")).toHaveValue("date");
  await expect(page.locator("#search-snapshot")).toContainText("stories indexed");
  await expect(page.locator("#search-results .story-link").first()).toHaveAttribute("href", /^\/post\/\d+$/);
  await page.locator("#search-range").selectOption("week");
  await expect(page).toHaveURL(/range=week/);
  await expect(page.locator("#search-status")).not.toHaveText("Searching…");
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(page.locator("#search-query")).toHaveValue("");
  await expect(page).toHaveURL(/\/search$/);
  await page.locator("#search-query").fill("zzzzsuperhnnonexistentphrasezzzz");
  await expect(page.locator("#search-status")).toContainText("No results found");
});

test("failed index fetch can be retried", async ({ page }) => {
  await page.route("**/pagefind/pagefind.js*", (route) => route.abort());
  await page.goto("/search?q=computer");
  await expect(page.locator("#search-status")).toContainText("Search could not load");
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  await page.unroute("**/pagefind/pagefind.js*");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.locator("#search-status")).not.toContainText("Search could not load");
});

test("system fonts and search controls fit a narrow viewport in both themes", async ({ page }, testInfo) => {
  const fonts: string[] = [];
  page.on("request", (request) => { if (request.resourceType() === "font") fonts.push(request.url()); });
  await page.setViewportSize({ width: 320, height: 780 });
  await page.goto("/search");
  await expect(page.getByRole("link", { name: "Search stories", exact: true })).toBeVisible();
  expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toContain("system-ui");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("search-light.png"), fullPage: true });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.screenshot({ path: testInfo.outputPath("search-dark.png"), fullPage: true });
  expect(fonts).toEqual([]);
  await expect(page.locator("#search-more")).toBeHidden();
  const show = await page.getByRole("link", { name: "Show", exact: true }).boundingBox();
  const search = await page.getByRole("link", { name: "Search stories", exact: true }).boundingBox();
  expect(show!.x + show!.width).toBeLessThanOrEqual(search!.x);
  await expect(page.getByRole("link", { name: "Search stories", exact: true })).toHaveAttribute("aria-current", "page");
});

test("new queries suppress stale results and result pages append without duplicates", async ({ page }) => {
  await page.route("**/pagefind/pagefind.js", (route) => route.fulfill({
    contentType: "text/javascript",
    body: `export async function search(query) {
      if (query === 'slow') await new Promise(resolve => setTimeout(resolve, 700));
      return { results: Array.from({ length: 25 }, (_, i) => ({ data: async () => ({
        url: '/post/' + (i + 1), meta: { title: query + ' ' + (i + 1), time: '1700000000' }
      }) })) };
    }`,
  }));
  await page.goto("/search?q=slow");
  await page.locator("#search-query").fill("fast");
  await expect(page.locator("#search-results .story-link")).toHaveCount(20);
  await expect(page.locator("#search-results .story-link").first()).toHaveText("fast 1");
  await page.getByRole("button", { name: "More results", exact: true }).click();
  await expect(page.locator("#search-results .story-link")).toHaveCount(25);
  await expect(page.locator("#search-results .story-link").last()).toHaveText("fast 25");
  await expect(page.locator("#search-more")).toBeHidden();
  await expect(page.locator("#search-status")).toContainText("Showing 25");
});
