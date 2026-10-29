import { expect, test, type Page } from "@playwright/test";
import { fixtureData } from "../fixtures/static-site";

async function mockHn(page: Page) {
  const calls: string[] = [];
  await page.route("https://hacker-news.firebaseio.com/v0/**", async (route) => {
    const key = new URL(route.request().url()).pathname.replace("/v0/", "").replace(/\.json$/, "");
    calls.push(key);
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(fixtureData[key] ?? null) });
  });
  return calls;
}

test("static HTML has useful feeds and posts without JavaScript or HN access", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  try {
    const page = await context.newPage();
    const calls = await mockHn(page);
    await page.goto("/top");
    await expect(page.locator(".feed-item")).toHaveCount(30);
    await page.getByRole("link", { name: "More…", exact: true }).click();
    await expect(page.locator(".feed-item")).toHaveCount(6);
    await expect(page.locator("[data-feed-more]")).toHaveCount(0);
    await page.goto("/post/1");
    await expect(page.locator("h1")).toContainText("Building a search engine");
    await expect(page.locator(".post-body")).toContainText("Astro and Pagefind");
    await expect(page.getByRole("link", { name: "Read the discussion on Hacker News" })).toHaveAttribute("href", "https://news.ycombinator.com/item?id=1");
    expect(calls).toEqual([]);
  } finally { await context.close(); }
});

test("comments fetch directly from HN in pages of 20; nested and deleted branches stay reachable", async ({ page }) => {
  const calls = await mockHn(page);
  await page.goto("/post/1");
  await expect(page.locator("#comments .comment")).toHaveCount(20);
  expect(calls).toHaveLength(21);
  expect(calls).not.toContain("item/50");
  await page.locator("#comment-2").getByRole("button", { name: "Show 1 reply" }).click();
  await expect(page.locator("#comment-2 .replies")).toContainText("Nested reply");
  await expect(page.locator("#comment-3")).toContainText("[deleted]");
  await page.locator("#comment-3").getByRole("button", { name: "Show 1 reply" }).click();
  await expect(page.locator("#comment-3 .replies")).toContainText("Reply to deleted parent");
  await page.getByRole("button", { name: "More comments…" }).click();
  await expect(page.locator("#comment-26")).toBeVisible();
  await expect(page.getByRole("button", { name: "More comments…" })).toHaveCount(0);
  expect(await page.locator(".comment").evaluateAll((nodes) => new Set(nodes.map((node) => node.id)).size)).toBe(27);
  await expect(page.locator('#comments img, #comments script, #comments [href^="javascript:"]')).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
});

test("old story, comment and profile URLs recover into static viewers", async ({ page }) => {
  await mockHn(page);
  await page.goto("/post/8863");
  await expect(page).toHaveURL(/\/item\?id=8863$/);
  await expect(page.locator("h1")).toContainText("An archived story");
  await page.goto("/post/2");
  await expect(page.locator("h1")).toHaveText("Comment thread");
  await expect(page.locator("#comment-50")).toBeVisible();
  await page.goto("/thread/1/2");
  await expect(page).toHaveURL(/\/thread\?id=1&page=2$/);
  await expect(page.locator("#comment-22")).toBeVisible();
  await expect(page.locator("#comment-2")).toHaveCount(0);
  await page.goto("/user/alice");
  await expect(page).toHaveURL(/\/user\?name=alice$/);
  await expect(page.locator("h1")).toHaveText("alice");
  await expect(page.locator(".user-facts")).toContainText("42");
  await expect(page.locator(".rich-text")).toContainText("Hello world");
  await expect(page.locator('.rich-text img, .rich-text [href^="javascript:"]')).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, follow");
});

test("feed refresh preserves the snapshot on failure and switches pagination to live data", async ({ page }) => {
  const calls = await mockHn(page);
  await page.goto("/top");
  expect(calls).toEqual([]);
  await page.route("**/v0/topstories.json", (route) => route.abort());
  await page.getByRole("button", { name: "Refresh stories" }).click();
  await expect(page.locator("[data-feed-status]")).toContainText("Could not refresh");
  await expect(page.locator(".feed-item")).toHaveCount(30);
  await page.unroute("**/v0/topstories.json");
  await page.getByRole("button", { name: "Refresh stories" }).click();
  await expect(page.locator("[data-feed-status]")).toContainText("Updated");
  await expect(page.locator("[data-feed-more]")).toHaveAttribute("href", "/feed?topic=top&page=2");
  await page.locator("[data-feed-more]").click();
  await expect(page.locator(".feed-item")).toHaveCount(6);
  await expect(page.getByRole("link", { name: "More stories…" })).toHaveCount(0);
});

test("live errors can retry; missing and invalid targets have distinct states", async ({ page }) => {
  await mockHn(page);
  await page.route("**/v0/item/8863.json", (route) => route.abort());
  await page.goto("/item?id=8863");
  await expect(page.locator("[data-viewer-status]")).toContainText("could not be reached");
  await page.unroute("**/v0/item/8863.json");
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.locator("h1")).toContainText("An archived story");
  await page.goto("/item?id=999999");
  await expect(page.locator("[data-viewer-status]")).toHaveText("Story or comment not found.");
  await page.goto("/item?id=not-an-id");
  await expect(page.locator("[data-viewer-status]")).toContainText("Invalid");
  await page.goto("/post/1");
  await expect(page.locator("#comment-2")).toBeVisible();
  await page.route("**/v0/item/2.json", (route) => route.abort());
  await page.locator("#comment-2").getByRole("button", { name: "Show 1 reply" }).click();
  await expect(page.locator("#comment-2 .replies")).toContainText("Could not load replies");
  await page.unroute("**/v0/item/2.json");
  await page.locator("#comment-2").getByRole("button", { name: "Show 1 reply" }).click();
  await expect(page.locator("#comment-50")).toBeVisible();
});

test("asset routing, headers, sitemap and search metadata reflect only prerendered content", async ({ request, page }) => {
  const root = await request.get("/", { maxRedirects: 0 });
  expect(root.status()).toBe(302);
  expect(root.headers().location).toBe("/top");
  const response = await request.get("/top");
  expect(response.status()).toBe(200);
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["cache-control"]).toContain("must-revalidate");
  const html = await response.text();
  const asset = html.match(/(?:src|href)="([^" ]*\/_astro\/[^" ]+\.(?:js|css))"/)?.[1];
  expect(asset).toBeDefined();
  const assetResponse = await request.get(asset!);
  expect(assetResponse.headers()["cache-control"]).toBe("public, max-age=31536000, immutable");
  const indexResponse = await request.get("/pagefind/pagefind.js");
  expect(indexResponse.headers()["cache-control"]).toBe("public, max-age=0, must-revalidate");
  for (const path of ["/top/18", "/post/not-an-id", "/unrelated"]) expect((await request.get(path)).status()).toBe(404);
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/top/2</loc>");
  expect(sitemap).toContain("/post/1</loc>");
  expect(sitemap).not.toContain("/post/8863");
  expect(sitemap).not.toContain("/user");
  await page.goto("/search");
  const hit = await page.evaluate(async () => {
    const path = "/pagefind/pagefind.js";
    const pagefind = await import(/* @vite-ignore */ path);
    const results = await pagefind.search("Building a search engine", { filters: { range: "day" }, sort: { date: "desc" } });
    return await results.results[0].data();
  });
  expect(hit.url).toMatch(/\/post\/1\/?$/);
  expect(hit.meta).toMatchObject({ user: "alice", points: "42", comments: "26", domain: "example.com" });
  expect((await request.get(hit.url)).status()).toBe(200);
});
