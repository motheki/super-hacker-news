import { expect, test } from "@playwright/test";

const TOP_PATH = "/top";
const NEW_PATH = "/new";
const KNOWN_POST_PATH = "/post/8863";
const MIN_SCROLL_Y = 400;

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

test("uses Next navigation without custom scroll state", async ({ page }) => {
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

test("preserves comment anchors", async ({ page }) => {
  await page.goto(`${KNOWN_POST_PATH}#comments`);

  await expect(page).toHaveURL(/#comments$/u);
  await expect(page.locator("#comments")).toBeVisible();
});
