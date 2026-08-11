import { test, expect, Browser } from "@playwright/test";

async function openTable(browser: Browser, tableSlug: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`/t/${tableSlug}`);
  await expect(page.locator(".tl-canvas")).toBeVisible({ timeout: 15000 });
  return { context, page };
}

test("two contexts share a room: draw in one, see it in the other", async ({ browser }) => {
  const tableSlug = `verify-shared-${Date.now()}`;
  const alice = await openTable(browser, tableSlug);
  const bob = await openTable(browser, tableSlug);

  // Alice draws a stroke with the draw tool
  await alice.page.keyboard.press("d");
  const canvas = alice.page.locator(".tl-canvas");
  const box = (await canvas.boundingBox())!;
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  await alice.page.mouse.move(startX, startY);
  await alice.page.mouse.down();
  await alice.page.mouse.move(startX + 120, startY + 60, { steps: 10 });
  await alice.page.mouse.up();

  // Alice sees her own shape...
  await expect(alice.page.locator(".tl-shape")).toHaveCount(1, { timeout: 10000 });
  // ...and Bob sees it arrive over the sync server
  await expect(bob.page.locator(".tl-shape")).toHaveCount(1, { timeout: 10000 });

  await alice.context.close();
  await bob.context.close();
});
