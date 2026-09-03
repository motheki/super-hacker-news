import { instant } from "@next/playwright";
import { expect, test } from "@playwright/test";

const TOPIC_SHELL = "topic-shell";
const TOPIC_CONTENT = "topic-content-new";
const APP_URL = "http://localhost:3100";
const PAGED_NEW_PATH = "/new?page=2";
const STREAM_TIMEOUT_MS = 15_000;

test("topic shell commits instantly and streams content", async ({ page }) => {
  await page.goto("/top");
  const newTopic = page.getByRole("link", { name: "New", exact: true });

  await instant(page, async () => {
    await newTopic.click();
    const shell = page.locator(`[data-testid="${TOPIC_SHELL}"]:visible`);
    await expect(shell).toHaveCount(1);
    await expect(shell.getByRole("status")).toHaveText("Loading stories…");
  });

  await expect(
    page.locator(`[data-testid="${TOPIC_CONTENT}"]:visible`),
  ).toBeVisible({ timeout: STREAM_TIMEOUT_MS });
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
