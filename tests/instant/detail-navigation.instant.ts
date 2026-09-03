import { instant } from "@next/playwright";
import { expect, test } from "@playwright/test";

const APP_URL = "http://localhost:3100";

const CASES = [
  {
    name: "post",
    path: "/post/8863",
    shell: "post-shell",
    content: "post-content",
  },
  {
    name: "user",
    path: "/user/pg",
    shell: "user-shell",
    content: "user-content",
  },
] as const;

for (const item of CASES) {
  test(`${item.name} serves cached content instantly`, async ({ page }) => {
    const url = `${APP_URL}${item.path}`;

    await instant(
      page,
      async () => {
        await page.goto(url);
        await expect(page.getByTestId(item.shell)).toBeVisible();
        await expect(page.getByTestId(item.content)).toBeVisible();
      },
      { baseURL: APP_URL },
    );
  });
}
