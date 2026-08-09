import { test, expect } from "@playwright/test";

/**
 * At a loopback host the canvas must survive tldraw's license check no matter
 * what TLDRAW_LICENSE_KEY was baked into the bundle. tldraw's dev exemption
 * only covers missing/unparseable keys; a parseable-but-expired evaluation key
 * replaces the whole editor with <div data-testid="tl-license-expired"> about
 * 5 seconds after mount — even at localhost. So we withhold the key on
 * loopback hosts (TablePage.tsx), where tldraw doesn't want one anyway.
 */
test("canvas survives the license check at localhost", async ({ page }) => {
  await page.goto(`/t/verify-license-${Date.now()}`);
  await expect(page.locator(".tl-canvas")).toBeVisible({ timeout: 15000 });

  // The license timer fires ~5s after mount; outwait it.
  await page.waitForTimeout(7000);

  await expect(page.locator('[data-testid="tl-license-expired"]')).toHaveCount(0);
  await expect(page.locator(".tl-canvas")).toBeVisible();
});
