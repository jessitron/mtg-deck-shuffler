/**
 * Verification: precon deck tile images are lazy-loaded
 *
 * /choose-any-deck ships one <img> per precon deck (191 remote Scryfall images).
 * Without loading="lazy", the browser fetches all of them eagerly even though
 * only a handful are ever in the viewport. This verifies the attribute is present
 * so off-screen commander art defers until it's needed.
 *
 * RUN: npm run test:verify
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3001';

test.describe('Precon deck chooser image loading', () => {
  test('precon deck tile images are marked loading="lazy"', async ({ page }) => {
    await page.goto(`${BASE_URL}/choose-any-deck`);

    const preconTiles = page.locator('.precon-tile');
    await expect(preconTiles.first()).toBeVisible({ timeout: 15000 });

    const tileCount = await preconTiles.count();
    expect(tileCount).toBeGreaterThan(1);

    const commanderImages = page.locator('.tile-commander-art img');
    const imageCount = await commanderImages.count();
    expect(imageCount).toBe(tileCount);

    for (let i = 0; i < imageCount; i++) {
      await expect(commanderImages.nth(i)).toHaveAttribute('loading', 'lazy');
    }
  });
});
