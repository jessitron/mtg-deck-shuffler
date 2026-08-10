/**
 * End-to-End Verification: the "yo!" fast-start link (dev mode only)
 *
 * In developer mode (the devMode cookie, entered via /dontdie), the home page's
 * top menu grows a "yo!" link. Clicking it skips the whole deck-selection and
 * prep flow: it loads the Timey-Wimey precon (two commanders: The Tenth Doctor
 * and Rose Tyler), starts a game at table "Yo" as player "Jess", and lands
 * straight on the game screen. Without the cookie the link is absent from the
 * HTML entirely.
 *
 * RUN: npm run test:verify
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3001';

test.setTimeout(90000);

test.describe('yo! fast-start', () => {

  test('the yo! link is absent without dev mode', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    await expect(page.locator('.right-nav a', { hasText: 'yo!' })).toHaveCount(0);

    console.log('SUCCESS: no yo! link without dev mode');
  });

  test('yo! starts a Timey-Wimey game at table Yo', async ({ page }) => {
    await page.goto(`${BASE_URL}/dontdie`);
    await page.goto(`${BASE_URL}/`);

    const yoLink = page.locator('.right-nav a', { hasText: 'yo!' });
    await expect(yoLink).toBeVisible();
    await yoLink.click();

    // Straight onto the game screen. New games get a fun word-combo id
    // (e.g. "brave-falcon-42") rather than a sequential number.
    await expect(page).toHaveURL(/\/game\/[a-z]+-[a-z]+-\d+/);
    await expect(page.locator('.game-name')).toHaveText('Timey-Wimey');

    // Both commanders in the command zone.
    await expect(page.locator('.cool-command-zone-surround.two-commanders')).toBeVisible();
    await expect(page.locator('img[alt="The Tenth Doctor"]')).toBeVisible();
    await expect(page.locator('img[alt="Rose Tyler"]')).toBeVisible();

    // At the table named Yo (player name travels to the Tabletop, not this page).
    const tableLink = page.locator('.go-to-table-button');
    await expect(tableLink).toBeVisible();
    await expect(tableLink).toContainText('Yo');
    expect(await tableLink.getAttribute('href')).toContain('/t/Yo');

    // Game is started: a full hand of 7.
    await expect(page.locator('.hand-count')).toHaveText('7');

    console.log('SUCCESS: yo! fast-started a Timey-Wimey game at table Yo');
  });
});
