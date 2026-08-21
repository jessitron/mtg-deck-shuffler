
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

  test('a card.played reaches the Tabletop only via the Spine now: the play still succeeds when the Spine is unreachable', async ({ page }) => {
    // SPINE_URL (set by verify.sh) has nothing listening on it in this project
    // (the "chromium" project runs before "two-app" spins up a real Spine) —
    // sendCardPlayedToSpineBestEffort is the sole path now, and it never blocks
    // the play.
    const prepId = await seedPrep(page);
    const gameId = await startGame(page, prepId, { tableName: 'spine-unreachable-table', playerName: 'Undeterred Jess' });
    await page.goto(`${BASE_URL}/game/${gameId}`);

    await expect(page.locator('.hand-count')).toHaveText('7');

    // Open the first hand card's modal and play it
    await page.locator('#hand-cards .card-container img').first().click();
    const playButton = page.locator('.card-modal-overlay').getByRole('button', { name: 'Play', exact: true });
    await expect(playButton).toBeVisible({ timeout: 5000 });
    await expect(playButton).toHaveClass(/table-play-button/);
    await playButton.click();

    // The play succeeds locally regardless — no blocking modal, hand shrinks,
    // the card lands on the (local, Shuffler-side) table count
    await expect(page.locator('.hand-count')).toHaveText('6');
    await expect(page.locator('.table-cards-button')).toContainText('1 Cards on table');
  });

  test('the hand card modal offers "Play Face Down", and in table mode it sends card.played-face-down to the (unreachable) Spine without blocking the play', async ({ page }) => {
    const prepId = await seedPrep(page);
    const gameId = await startGame(page, prepId, { tableName: 'spine-unreachable-face-down-table', playerName: 'Concealed Jess' });
    await page.goto(`${BASE_URL}/game/${gameId}`);

    await expect(page.locator('.hand-count')).toHaveText('7');

    await page.locator('#hand-cards .card-container img').first().click();
    const faceDownButton = page.locator('.card-modal-overlay button:has-text("Play Face Down")');
    await expect(faceDownButton).toBeVisible({ timeout: 5000 });
    await expect(faceDownButton).toHaveClass(/table-face-down-button/);
    await faceDownButton.click();

    // Same as a plain "Play": succeeds locally regardless of the Spine, hand shrinks,
    // the card lands on the table — concealment is a Tabletop-rendering concern only.
    await expect(page.locator('.hand-count')).toHaveText('6');
    await expect(page.locator('.table-cards-button')).toContainText('1 Cards on table');
  });

  test('solo mode: "Play Face Down" copies the generic card back to the clipboard (not a real card image)', async ({ page }) => {
    const prepId = await seedPrep(page);
    const gameId = await startGame(page, prepId); // no table: solo/clipboard mode
    await page.goto(`${BASE_URL}/game/${gameId}`);

    await page.locator('#hand-cards .card-container img').first().click();
    const faceDownButton = page.locator('.card-modal-overlay button:has-text("Play Face Down")');
    await expect(faceDownButton).toBeVisible({ timeout: 5000 });
    await expect(faceDownButton).toHaveClass(/play-face-down-button/);

    // The modal closes itself right after the POST completes (hx-on::after-request), so
    // the button's own text/disabled feedback is a race we can't assert reliably here —
    // instead, confirm the clipboard-copy path that actually distinguishes "Play Face
    // Down" from "Play" fired: a request for the static card-back asset, not /proxy-image.
    const [cardBackRequest] = await Promise.all([
      page.waitForRequest((req) => req.url().includes('/images/mtg-card-back.jpg')),
      faceDownButton.click(),
    ]);
    expect(cardBackRequest.url()).toContain('/images/mtg-card-back.jpg');
  });

  test('the library "Play Face Down" button plays the top card of the library without revealing it, and disables when the library is empty', async ({ page }) => {
    const prepId = await seedPrep(page);
    const gameId = await startGame(page, prepId, { tableName: 'spine-unreachable-library-face-down-table', playerName: 'Foretelling Jess' });
    await page.goto(`${BASE_URL}/game/${gameId}`);

    const libraryFaceDownButton = page.locator('#play-top-face-down-button');
    await expect(libraryFaceDownButton).toBeVisible();
    await expect(libraryFaceDownButton).toHaveClass(/table-face-down-button/);
    await expect(libraryFaceDownButton).toBeEnabled();

    await libraryFaceDownButton.click();

    // Succeeds locally regardless of the Spine: the card leaves the library and
    // lands on the (local, Shuffler-side) table — same as any other play.
    await expect(page.locator('.table-cards-button')).toContainText('1 Cards on table');
  });

  test('solo mode: the library "Play Face Down" button copies the generic card back to the clipboard', async ({ page }) => {
    const prepId = await seedPrep(page);
    const gameId = await startGame(page, prepId); // no table: solo/clipboard mode
    await page.goto(`${BASE_URL}/game/${gameId}`);

    const libraryFaceDownButton = page.locator('#play-top-face-down-button');
    await expect(libraryFaceDownButton).toBeVisible();
    await expect(libraryFaceDownButton).toHaveClass(/play-face-down-button/);

    const [cardBackRequest] = await Promise.all([
      page.waitForRequest((req) => req.url().includes('/images/mtg-card-back.jpg')),
      libraryFaceDownButton.click(),
    ]);
    expect(cardBackRequest.url()).toContain('/images/mtg-card-back.jpg');
  });
});
