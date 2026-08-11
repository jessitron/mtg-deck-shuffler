
import { test, expect } from '@playwright/test';
import { seedPrep, startGame } from './seedGame.js';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3001';

test.setTimeout(90000);

async function goToPrepare(page: any): Promise<string> {
  const prepId = await seedPrep(page);
  await page.goto(`${BASE_URL}/prepare/${prepId}`);
  return prepId;
}

async function openJoinTable(page: any): Promise<void> {
  const details = page.locator('details.join-table-details');
  if (!(await details.evaluate((el: HTMLDetailsElement) => el.open))) {
    await page.locator('summary.join-table-summary').click();
  }
  await expect(page.locator('input[name="table-name"]')).toBeVisible();
}

test.describe('Table mode', () => {
  test('prep screen has optional table and player name inputs; solo (blank) games show no table link', async ({ page }) => {
    const prepId = await goToPrepare(page);
    await openJoinTable(page);

    await expect(page.locator('input[name="table-name"]')).toBeVisible();
    await expect(page.locator('input[name="player-name"]')).toBeVisible();

    // Leave both blank: solo mode, unchanged
    const gameId = await startGame(page, prepId);
    await page.goto(`${BASE_URL}/game/${gameId}`);
    await expect(page.locator('.go-to-table-button')).toHaveCount(0);
  });

  test('joining a table shows a "Go to Table" spectator link on the game page, surviving restart', async ({ page }) => {
    const prepId = await seedPrep(page);
    const gameId = await startGame(page, prepId, { tableName: 'verify-table', playerName: 'Playwright Jess' });
    await page.goto(`${BASE_URL}/game/${gameId}`);

    const link = page.locator('.go-to-table-button');
    await expect(link).toBeVisible();
    await expect(link).toContainText('verify-table');
    await expect(link).toHaveAttribute('target', '_blank');
    const href = await link.getAttribute('href');
    expect(href).toContain('/t/verify-table');

    // Restart carries the table info forward
    await page.locator('#menu-toggle').click();
    await page.locator('button:has-text("Restart Game")').click();
    await page.waitForURL('**/game/*', { timeout: 30000 });
    await expect(page.locator('.go-to-table-button')).toContainText('verify-table');
  });

  test('send-then-commit: when the tabletop is unreachable, the play is blocked and the card stays in hand', async ({ page }) => {
    const prepId = await seedPrep(page);
    const gameId = await startGame(page, prepId, { tableName: 'unreachable-table', playerName: 'Blocked Jess' });
    await page.goto(`${BASE_URL}/game/${gameId}`);

    await expect(page.locator('.hand-count')).toHaveText('7');

    // Open the first hand card's modal and try to play it
    await page.locator('#hand-cards .card-container img').first().click();
    const playButton = page.locator('.card-modal-overlay button:has-text("Play")');
    await expect(playButton).toBeVisible({ timeout: 5000 });
    await expect(playButton).toHaveClass(/table-play-button/);
    await playButton.click();

    // The play is blocked: an explanatory modal appears, the hand is unchanged
    await expect(page.locator('.modal-overlay')).toContainText("didn't get the card", { timeout: 10000 });
    await expect(page.locator('.modal-overlay')).toContainText('unreachable-table');
    await page.locator('.modal-overlay .modal-close').click();
    await expect(page.locator('.hand-count')).toHaveText('7');
    await expect(page.locator('.table-cards-button')).toContainText('0 Cards on table');
  });
});
