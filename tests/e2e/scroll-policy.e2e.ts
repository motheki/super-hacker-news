/* oxlint-disable typescript/prefer-readonly-parameter-types -- Playwright Pages are framework-owned mutable fixtures. */
import { expect, type Page, test } from "@playwright/test";

const TOP_PATH = "/top";
const NEW_PATH = "/new";
const KNOWN_POST_PATH = "/post/8863";
const MANUAL_SCROLL = "manual";
const MIN_SCROLL_Y = 400;
const SECOND_SCROLL_Y = 800;
const POST_LINK_INDEX = 15;
const HASH_COMMENT_INDEX = 10;
const SCROLL_TOLERANCE = 96;
const TARGET_TOP_TOLERANCE = 1;
const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;
const POST_LINK = 'a[href^="/post/"]';

const getScrollY = (page: Page) => page.evaluate(() => window.scrollY);

const scrollDown = async (page: Page) => {
  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight / 2);
  });

  const scrollY = await getScrollY(page);
  expect(scrollY).toBeGreaterThan(MIN_SCROLL_Y);
  return scrollY;
};

const expectTop = async (page: Page) => {
  await expect.poll(() => getScrollY(page)).toBe(0);
};

const expectManualScroll = async (page: Page) => {
  await expect
    .poll(() => page.evaluate(() => window.history.scrollRestoration))
    .toBe(MANUAL_SCROLL);
};

const openFeed = async (page: Page, path = TOP_PATH) => {
  await page.goto(path);
  await expect(page.getByRole("link", { name: "More..." })).toBeVisible();
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve();
          });
        });
      }),
  );
  await expectManualScroll(page);
};

test("starts a new topic at the top", async ({ page }) => {
  await openFeed(page);
  await scrollDown(page);

  await page.getByRole("link", { name: "New", exact: true }).click();

  await expect(page).toHaveURL(new RegExp(`${NEW_PATH}$`, "u"));
  await expectTop(page);
});

test("restores a feed position on Back", async ({ page }) => {
  await openFeed(page);
  await page.evaluate(() => {
    (window as typeof window & { sameDocument?: boolean }).sameDocument = true;
  });
  const postLink = page.locator(POST_LINK).nth(POST_LINK_INDEX);
  await postLink.scrollIntoViewIfNeeded();
  const feedScrollY = await getScrollY(page);
  expect(feedScrollY).toBeGreaterThan(MIN_SCROLL_Y);

  await postLink.click();
  await expect(page).toHaveURL(/\/post\/\d+$/u);
  expect(
    await page.evaluate(
      () => (window as typeof window & { sameDocument?: boolean }).sameDocument,
    ),
  ).toBe(true);
  await expectTop(page);
  await expectManualScroll(page);

  await page.goBack();

  await expect(page).toHaveURL(new RegExp(`${TOP_PATH}$`, "u"));
  await expect
    .poll(() => getScrollY(page))
    .toBeGreaterThanOrEqual(feedScrollY - SCROLL_TOLERANCE);
  await expect
    .poll(() => getScrollY(page))
    .toBeLessThanOrEqual(feedScrollY + SCROLL_TOLERANCE);
});

test("keeps positions separate for duplicate routes", async ({ page }) => {
  await openFeed(page);
  const firstMore = page.getByRole("link", { name: "More..." });
  await firstMore.scrollIntoViewIfNeeded();
  const firstScrollY = await getScrollY(page);
  await firstMore.click();
  await expect(page).toHaveURL(/\/top\?page=2$/u);
  await expect(page.getByRole("link", { name: "More..." })).toBeVisible();

  await page.getByRole("link", { name: "Top", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${TOP_PATH}$`, "u"));
  await expect(page.getByRole("link", { name: "More..." })).toBeVisible();
  const secondMore = page.getByRole("link", { name: "More..." });
  await page.evaluate((scrollY) => {
    window.scrollTo(0, scrollY);
  }, SECOND_SCROLL_Y);
  const secondScrollY = await getScrollY(page);
  expect(secondScrollY).toBeGreaterThan(MIN_SCROLL_Y);
  expect(secondScrollY).toBeLessThan(firstScrollY - SCROLL_TOLERANCE);
  await secondMore.evaluate((link) => {
    link.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
  });
  await expect(page).toHaveURL(/\/top\?page=2$/u);
  await expect(page.getByRole("link", { name: "More..." })).toBeVisible();

  await page.goBack();
  await expect
    .poll(() => getScrollY(page))
    .toBeGreaterThanOrEqual(secondScrollY - SCROLL_TOLERANCE);
  await page.goBack();
  await page.goBack();

  await expect
    .poll(() => getScrollY(page))
    .toBeGreaterThanOrEqual(firstScrollY - SCROLL_TOLERANCE);
  await expect
    .poll(() => getScrollY(page))
    .toBeLessThanOrEqual(firstScrollY + SCROLL_TOLERANCE);
});

test("starts a restored document at the top", async ({ page }) => {
  await openFeed(page);
  await scrollDown(page);

  await page.goto("about:blank");
  await page.goBack();

  await expect(page).toHaveURL(new RegExp(`${TOP_PATH}$`, "u"));
  await expectTop(page);
});

test("starts a reloaded document at the top", async ({ page }) => {
  await openFeed(page);
  await scrollDown(page);

  await page.reload();

  await expectTop(page);
});

test("starts pagination at the top and restores its source", async ({
  page,
}) => {
  await openFeed(page);
  const moreLink = page.getByRole("link", { name: "More..." });
  await moreLink.scrollIntoViewIfNeeded();
  const feedScrollY = await getScrollY(page);
  expect(feedScrollY).toBeGreaterThan(MIN_SCROLL_Y);

  await moreLink.click();

  await expect(page).toHaveURL(/\/top\?page=2$/u);
  await expectTop(page);

  await page.goBack();

  await expect(page).toHaveURL(new RegExp(`${TOP_PATH}$`, "u"));
  await expect
    .poll(() => getScrollY(page))
    .toBeGreaterThanOrEqual(feedScrollY - SCROLL_TOLERANCE);
});

test("preserves explicit comment anchors", async ({ page }) => {
  await page.setViewportSize(MOBILE_VIEWPORT);
  await page.goto(KNOWN_POST_PATH);

  const comment = page.locator('[id^="comment-"]').nth(HASH_COMMENT_INDEX);
  await expect(comment).toBeVisible();
  const commentId = await comment.getAttribute("id");
  expect(commentId).not.toBeNull();

  await page.goto(`${page.url()}#${commentId}`);
  await page.reload();

  await expect
    .poll(() =>
      comment.evaluate((element, tolerance) => {
        const rect = element.getBoundingClientRect();
        return rect.top >= -tolerance && rect.top < window.innerHeight;
      }, TARGET_TOP_TOLERANCE),
    )
    .toBe(true);

  const [headerBottom, commentTop] = await Promise.all([
    page
      .locator("header")
      .evaluate((element) => element.getBoundingClientRect().bottom),
    comment.evaluate((element) => element.getBoundingClientRect().top),
  ]);
  expect(commentTop).toBeGreaterThanOrEqual(headerBottom);
});

test("clears hash traversal state before the next route", async ({ page }) => {
  await openFeed(page);
  await page.locator(POST_LINK).first().click();
  await expect(page).toHaveURL(/\/post\/\d+$/u);

  await page.goto(`${page.url()}#comments`);
  await page.goBack();
  await scrollDown(page);

  await page.getByRole("link", { name: "New", exact: true }).click();

  await expect(page).toHaveURL(new RegExp(`${NEW_PATH}$`, "u"));
  await expectTop(page);
});
