import { test, expect } from "@playwright/test";

test("login page renders", async ({ page }) => {
  await page.goto("/");
  const title = await page.title();
  expect(title.length).toBeGreaterThan(0);
});
