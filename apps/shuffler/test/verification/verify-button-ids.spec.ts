
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3001';

test.setTimeout(90000);

// Every button gets an id so the Honeycomb click auto-instrumentation records a
// legible target_xpath (//*[@id="..."]) telling us what was clicked.
test.describe('button ids for click telemetry', () => {

  test('the game screen buttons expose their ids', async ({ page }) => {
    await page.goto(`${BASE_URL}/dontdie`);
    await page.goto(`${BASE_URL}/`);

    const yoLink = page.locator('.right-nav a', { hasText: 'yo!' });
    await expect(yoLink).toBeVisible();
    await yoLink.click();

    await expect(page).toHaveURL(/\/game\/[a-z]+-[a-z]+-\d+/);

    // Library controls, table-cards, and the menu toggle carry stable ids.
    for (const id of ['draw-button', 'shuffle-button', 'library-search-button',
                       'reveal-button', 'mill-button', 'table-cards-button', 'menu-toggle']) {
      await expect(page.locator(`button#${id}`)).toHaveCount(1);
    }

    // No button on the page is left without an id.
    const buttonsWithoutId = await page.locator('button:not([id])').count();
    expect(buttonsWithoutId).toBe(0);

    console.log('SUCCESS: game-screen buttons all carry ids');
  });
});
