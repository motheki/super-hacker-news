/* oxlint-disable typescript/prefer-readonly-parameter-types -- Playwright Pages are framework-owned mutable fixtures. */
import { instant } from "@next/playwright";
import { expect, test } from "@playwright/test";

const TOPIC_SHELL = "topic-shell";
const TOPIC_CONTENT = "topic-content-new";
const APP_URL = "http://localhost:3100";
const PAGED_NEW_PATH = "/new?page=2";

test("topic content commits instantly", async ({ page }) => {
  await page.goto("/top");
  const newTopic = page.getByRole("link", { name: "New", exact: true });

  await instant(page, async () => {
    await newTopic.click();
    await expect(page.getByTestId(TOPIC_CONTENT)).toBeVisible();
  });
});

test("paged topic serves cached content instantly", async ({ page }) => {
  const url = `${APP_URL}${PAGED_NEW_PATH}`;

  await instant(
    page,
    async () => {
      await page.goto(url);
      await expect(page.getByTestId(TOPIC_SHELL)).toBeVisible();
      await expect(page.getByTestId(TOPIC_CONTENT)).toBeVisible();
    },
    { baseURL: APP_URL },
  );
});
