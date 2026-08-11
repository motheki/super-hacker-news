import { test, expect } from "@playwright/test";

test.describe("Theme toggle", () => {
	test("follows the browser color scheme until the user chooses a theme", async ({ page }) => {
		await page.emulateMedia({ colorScheme: "dark" });
		await page.goto("/top");

		await expect(page.locator("html")).toHaveClass(/dark/);

		await page.emulateMedia({ colorScheme: "light" });
		await expect(page.locator("html")).not.toHaveClass(/dark/);

		await page.getByTestId("theme-toggle").click();
		await expect(page.locator("html")).toHaveClass(/dark/);

		await page.emulateMedia({ colorScheme: "dark" });
		await page.emulateMedia({ colorScheme: "light" });
		await expect(page.locator("html")).toHaveClass(/dark/);
	});

	test("persists a manually selected theme", async ({ page }) => {
		await page.emulateMedia({ colorScheme: "light" });
		await page.goto("/top");

		await page.getByTestId("theme-toggle").click();
		await expect(page.locator("html")).toHaveClass(/dark/);

		await page.reload();
		await expect(page.locator("html")).toHaveClass(/dark/);
	});
});
