
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3001';

test.setTimeout(90000);

test.describe('yo! fast-start', () => {

  test('the yo! link is absent without dev mode', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    await expect(page.locator('.right-nav a', { hasText: 'yo!' })).toHaveCount(0);

    console.log('SUCCESS: no yo! link without dev mode');
  });

  test('yo! starts a Timey-Wimey game at a fresh random table', async ({ page }) => {
    await page.goto(`${BASE_URL}/dontdie`);
    await page.goto(`${BASE_URL}/`);

    const yoLink = page.locator('.right-nav a', { hasText: 'yo!' });
    await expect(yoLink).toBeVisible();
    await yoLink.click();

    await expect(page).toHaveURL(/\/game\/[a-z]+-[a-z]+-\d+/);
    await expect(page.locator('.game-name')).toHaveText('Timey-Wimey');

    // Both commanders in the command zone.
    await expect(page.locator('.cool-command-zone-surround.two-commanders')).toBeVisible();
    await expect(page.locator('img[alt="The Tenth Doctor"]')).toBeVisible();
    await expect(page.locator('img[alt="Rose Tyler"]')).toBeVisible();

    // First yo! click on a fresh server mints a random table name (YO-xxxx),
    // so it never collides with a "Yo" table left over from a previous run.
    // (player name travels to the Tabletop, not this page)
    // The link text shows the table name as minted (mixed case); the href is a
    // Tabletop room slug, which is always lowercased — by the Spine when the
    // join succeeds (services/spine/lib/table_slug.rb) and, when it doesn't,
    // by the fallback slug in active-game-page.ts that mirrors that format.
    const tableLink = page.locator('.go-to-table-button');
    await expect(tableLink).toBeVisible();
    await expect(tableLink).toContainText(/YO-[0-9a-f]{4}/);
    expect(await tableLink.getAttribute('href')).toMatch(/\/t\/yo-[0-9a-f]{4}/);

    // Game is started: a full hand of 7.
    await expect(page.locator('.hand-count')).toHaveText('7');

    console.log('SUCCESS: yo! fast-started a Timey-Wimey game at a fresh random table');
  });
});
