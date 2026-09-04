import { expect, test } from "@playwright/test";

const TOP_PATH = "/top";
const NEW_PATH = "/new";
const KNOWN_POST_PATH = "/post/8863";
const KNOWN_COMMENT_ID = 11_003;
const ACTIVE_POST_PATH = "/post/49522137";
const MIN_SCROLL_Y = 400;
const HTML_CACHE_CONTROL = "public, max-age=15";

test("caches successful HTML briefly in the browser", async ({ page }) => {
  const response = await page.goto(TOP_PATH);

  expect(response?.headers()["cache-control"]).toBe(HTML_CACHE_CONTROL);
});

test("prefetches discussion links on intent", async ({ page }) => {
  await page.goto(TOP_PATH);

  await expect(page.locator('a[href^="/post/"]').last()).toHaveAttribute(
    "data-astro-prefetch",
    "hover",
  );
});

test("omits search and share controls", async ({ page }) => {
  await page.goto(TOP_PATH);

  await expect(
    page.getByRole("link", { name: "Search Hacker News" }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Share page" })).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Project source code" }),
  ).toBeAttached();
});

test("uses native navigation without custom scroll state", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(new RegExp(`${TOP_PATH}$`, "u"));
  await expect(page.getByRole("link", { name: "More..." })).toBeVisible();

  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight / 2);
  });
  const scrollY = await page.evaluate(() => window.scrollY);
  expect(scrollY).toBeGreaterThan(MIN_SCROLL_Y);

  await page.getByRole("link", { name: "New", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${NEW_PATH}$`, "u"));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`${TOP_PATH}$`, "u"));
});

test("opens the second feed page without losing pagination", async ({
  page,
}) => {
  await page.goto(TOP_PATH);
  await page.getByRole("link", { name: "More..." }).click();

  await expect(page).toHaveURL(/\/top\/2$/u);
  await expect(page.locator(".feed-index").first()).toHaveText("31");
});

test("ships no framework runtime", async ({ page }) => {
  const response = await page.goto(TOP_PATH);
  const html = await response?.text();
  const scripts = await page.locator("script[src]").count();

  expect(html?.length).toBeLessThan(80_000);
  expect(html).not.toContain("__next");
  expect(html).not.toContain("react");
  expect(scripts).toBeLessThanOrEqual(1);
});

test("uses the newspaper palettes and Alike", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(TOP_PATH);

  const light = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return {
      background: style.backgroundColor,
      color: style.color,
      font: style.fontFamily,
    };
  });
  expect(light).toMatchObject({
    background: "rgb(217, 196, 168)",
    color: "rgb(33, 32, 32)",
  });
  expect(light.font).toContain("Alike");

  await page.emulateMedia({ colorScheme: "dark" });
  const dark = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return {
      background: style.backgroundColor,
      color: style.color,
    };
  });
  expect(dark).toEqual({
    background: "rgb(15, 14, 15)",
    color: "rgb(195, 195, 196)",
  });
});

test("uses native disclosure for comment threads", async ({ page }) => {
  await page.goto(KNOWN_POST_PATH);

  const details = page.locator("details").first();
  const summary = details.locator("summary").first();
  await expect(details).toHaveJSProperty("open", true);

  await summary.click();
  await expect(details).toHaveJSProperty("open", false);

  await summary.click();
  await expect(details).toHaveJSProperty("open", true);
});

test("renders comments for a lagging active discussion", async ({ page }) => {
  await page.goto(ACTIVE_POST_PATH);

  await expect(page.locator("details").first()).toBeVisible();
  await expect(page.getByTestId("post-content")).not.toContainText(
    /\|\s*0 comments/u,
  );
});

test("preserves comment anchors", async ({ page }) => {
  await page.goto(`${KNOWN_POST_PATH}#comments`);

  await expect(page).toHaveURL(/#comments$/u);
  await expect(page.locator("#comments")).toBeVisible();
});

test("redirects comment routes to their containing discussion", async ({
  page,
}) => {
  await page.goto(`/post/${KNOWN_COMMENT_ID}`);

  await expect(page).toHaveURL(
    new RegExp(`${KNOWN_POST_PATH}#comment-${KNOWN_COMMENT_ID}$`, "u"),
  );
  await expect(page.locator(`#comment-${KNOWN_COMMENT_ID}`)).toBeVisible();
});
