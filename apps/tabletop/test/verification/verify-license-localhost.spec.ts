import { test, expect } from "@playwright/test";

test("canvas survives the license check at localhost", async ({ page }) => {
  await page.goto(`/t/verify-license-${Date.now()}`);
  await expect(page.locator(".tl-canvas")).toBeVisible({ timeout: 15000 });

  // The license timer fires ~5s after mount; outwait it.
  await page.waitForTimeout(7000);

  await expect(page.locator('[data-testid="tl-license-expired"]')).toHaveCount(0);
  await expect(page.locator(".tl-canvas")).toBeVisible();
});
