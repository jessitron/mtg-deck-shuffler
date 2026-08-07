/**
 * End-to-End Verification: Flipping a two-faced commander on the prepare screen.
 *
 * The prepare screen has no game yet, so flipping there must not touch game state.
 * Regression guard for JES-90: the inline flip button used to POST to the *game*
 * route /flip-card/<prepId>/0, which replaced the commander with
 * "Game <prepId> not found" (or, on an id collision, silently mutated an
 * unrelated game).
 *
 * RUN: npm run test:verify
 */

import { test, expect, Page } from '@playwright/test';
import { seedPrep } from './seedGame.js';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3001';

// "From Cute to Brute" — its commander, Esika, God of the Tree // The Prismatic
// Bridge, is a genuine two-faced (modal DFC) card, so it gets a flip button.
const TWO_FACED_COMMANDER_DECK = 'precon-mtgjson-FromCutetoBrute_SLD.json';

test.setTimeout(90000);

async function setupPrepWithTwoFacedCommander(page: Page): Promise<string> {
  return seedPrep(page, TWO_FACED_COMMANDER_DECK);
}

test.describe('Prepare screen - flipping a two-faced commander', () => {
  test('clicking Flip shows the back face and does not touch game state', async ({ page }) => {
    const prepId = await setupPrepWithTwoFacedCommander(page);

    await page.goto(`${BASE_URL}/prepare/${prepId}`);

    const flipContainer = page.locator('#card-0-outer-flip-container');
    const flipButton = page.locator('#card-0-flip-button');

    await expect(flipButton).toBeVisible({ timeout: 5000 });
    // Starts on the front face
    await expect(flipContainer).not.toHaveClass(/card-flipped/);

    await flipButton.click();

    // Now showing the back face
    await expect(page.locator('#card-0-outer-flip-container')).toHaveClass(/card-flipped/, { timeout: 5000 });

    // The commander is still a card, not an error message
    await expect(page.locator('#card-0-back-face')).toBeVisible();
    await expect(page.locator('.playmat')).not.toContainText('not found');

    // And flipping back returns to the front face
    await page.locator('#card-0-flip-button').click();
    await expect(page.locator('#card-0-outer-flip-container')).not.toHaveClass(/card-flipped/, { timeout: 5000 });
    await expect(page.locator('#card-0-front-face')).toBeVisible();
  });

  test('the card modal opens on whichever face the page is showing', async ({ page }) => {
    const prepId = await setupPrepWithTwoFacedCommander(page);

    await page.goto(`${BASE_URL}/prepare/${prepId}`);

    // Clicking the unflipped card opens the modal on the front face
    await page.locator('#card-0-container').click();
    await expect(page.locator('.card-modal-overlay')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.modal-card-image')).toHaveAttribute('src', /\/front\//);
    await page.locator('.card-modal-close').click();
    await expect(page.locator('.card-modal-overlay')).toHaveCount(0);

    // Flip the card on the page, then open the modal again
    await page.locator('#card-0-flip-button').click();
    await expect(page.locator('#card-0-outer-flip-container')).toHaveClass(/card-flipped/, { timeout: 5000 });

    await page.locator('#card-0-container').click();
    await expect(page.locator('.card-modal-overlay')).toBeVisible({ timeout: 5000 });
    // The modal follows the page's face rather than resetting to the front
    await expect(page.locator('.modal-card-image')).toHaveAttribute('src', /\/back\//);
  });

  test('flipping inside the modal leaves the page as it was', async ({ page }) => {
    const prepId = await setupPrepWithTwoFacedCommander(page);

    await page.goto(`${BASE_URL}/prepare/${prepId}`);

    await page.locator('#card-0-container').click();
    await expect(page.locator('.card-modal-overlay')).toBeVisible({ timeout: 5000 });

    // Flip within the modal — deliberately a modal-only concern
    await page.locator('.modal-action-button.flip-button').click();
    await expect(page.locator('.modal-card-image')).toHaveAttribute('src', /\/back\//, { timeout: 5000 });

    // Retry the close: a click landing during the flip's htmx swap/settle gets
    // swallowed, which made this flaky in a full-suite run (same pattern as
    // verify-discard).
    const modal = page.locator('.card-modal-overlay');
    await expect(async () => {
      if ((await modal.count()) === 0) return;
      await page.locator('.card-modal-close').click({ timeout: 2000 });
      await expect(modal).toHaveCount(0, { timeout: 3000 });
    }).toPass({ timeout: 20000 });

    // The card on the page is untouched
    await expect(page.locator('#card-0-outer-flip-container')).not.toHaveClass(/card-flipped/);
    await expect(page.locator('#card-0-front-face')).toBeVisible();
  });
});
