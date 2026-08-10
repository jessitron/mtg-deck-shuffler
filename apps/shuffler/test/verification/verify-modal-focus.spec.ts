/**
 * End-to-End Verification: Modal Focus Management
 *
 * The Shuffler's HTMX-swapped modals (card modal, library modal, history
 * modal, table modal) had NO focus management at all: opening one never
 * moved focus in, nothing stopped Tab from reaching the page behind, and
 * closing never restored focus to the opener. `modal-focus.js` is one
 * generic mechanism shared by every consumer of #modal-container /
 * #card-modal-container (all of them render the same `.modal-overlay` /
 * `.card-modal-overlay` shape with role="dialog"/aria-modal/tabindex — see
 * card-modal.ejs, library-modal.ejs, game-modals.ts, history-components.ts),
 * so proving it once against the library modal (opened from a real <button>,
 * closed via the × button) covers the mechanism for all of them. A second,
 * lighter test checks the card modal picks up the same dialog semantics.
 *
 * RUN: ./verify.sh verify-modal-focus
 */

import { test, expect } from '@playwright/test';
import { seedGame } from './seedGame.js';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3001';

test('opening the library modal traps focus and closing it restores focus to the opener', async ({ page }) => {
  const gameId = await seedGame(page);
  await page.goto(`${BASE_URL}/game/${gameId}`);

  const opener = page.locator('.search-button');
  await expect(opener).toBeVisible();
  await opener.focus();
  await opener.click();

  const libraryModal = page.locator('.modal-overlay');
  await expect(libraryModal).toBeVisible({ timeout: 5000 });

  // Dialog semantics are present.
  await expect(libraryModal).toHaveAttribute('role', 'dialog');
  await expect(libraryModal).toHaveAttribute('aria-modal', 'true');

  // Focus moved into the modal on open.
  await expect(async () => {
    const focusIsInsideModal = await page.evaluate(() => !!document.activeElement?.closest('.modal-overlay'));
    expect(focusIsInsideModal).toBe(true);
  }).toPass({ timeout: 5000 });

  // The background is inert while the modal is open.
  await expect(page.locator('#game-container')).toHaveAttribute('inert', '');

  // Tab repeatedly — focus must never land outside the modal (the classic
  // "tabs through to the page behind" bug this fixes).
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Tab');
    const focusIsInsideModal = await page.evaluate(() => !!document.activeElement?.closest('.modal-overlay'));
    expect(focusIsInsideModal).toBe(true);
  }

  // Shift+Tab from the first stop wraps to the last, rather than escaping.
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Shift+Tab');
    const focusIsInsideModal = await page.evaluate(() => !!document.activeElement?.closest('.modal-overlay'));
    expect(focusIsInsideModal).toBe(true);
  }

  // Close via the × button.
  await page.locator('.modal-close').click();
  await expect(libraryModal).toHaveCount(0);

  // Background is interactive again.
  await expect(page.locator('#game-container')).not.toHaveAttribute('inert', '');

  // Focus returned to the opener.
  await expect(async () => {
    const isOpenerFocused = await opener.evaluate((el) => el === document.activeElement);
    expect(isOpenerFocused).toBe(true);
  }).toPass({ timeout: 5000 });
});

test('the card modal gets the same dialog semantics and background inert', async ({ page }) => {
  const gameId = await seedGame(page);
  await page.goto(`${BASE_URL}/game/${gameId}?openCard=0`);

  const cardModal = page.locator('.card-modal-overlay');
  await expect(cardModal).toBeVisible({ timeout: 5000 });
  await expect(cardModal).toHaveAttribute('role', 'dialog');
  await expect(cardModal).toHaveAttribute('aria-modal', 'true');

  await expect(async () => {
    const focusIsInsideModal = await page.evaluate(() => !!document.activeElement?.closest('.card-modal-overlay'));
    expect(focusIsInsideModal).toBe(true);
  }).toPass({ timeout: 5000 });

  await expect(page.locator('#game-container')).toHaveAttribute('inert', '');

  await page.locator('.card-modal-close').click();
  await expect(cardModal).toHaveCount(0);
  await expect(page.locator('#game-container')).not.toHaveAttribute('inert', '');
});
