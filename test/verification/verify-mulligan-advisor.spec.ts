/**
 * End-to-End Verification: Mulligan Advisor chat (developer mode)
 *
 * The Mulligan Advisor shows a keep/mulligan recommendation in the hand section
 * during the mulligan stage (dev mode only). An "Improve this" button opens a
 * chat drawer to the right of the playmat; sending a message returns the agent's
 * reply (currently the placeholder "Well isn't that special"). The drawer lives
 * outside #game-container and its open state is a body class, so it survives
 * game-state swaps.
 *
 * RUN: start a server on port 3001, then
 *   npx playwright test test/verification/verify-mulligan-advisor.spec.ts
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3001';

test.setTimeout(90000);

async function setupGame(page: any): Promise<void> {
  await page.goto(`${BASE_URL}/choose-any-deck`);
  await page.waitForLoadState('networkidle');

  const preconTiles = page.locator('.precon-tile');
  await expect(preconTiles.first()).toBeVisible({ timeout: 10000 });
  await preconTiles.first().click();

  await page.waitForURL('**/prepare/*', { timeout: 30000 });
  await page.waitForLoadState('networkidle');

  const shuffleUpButton = page.locator('button.begin-button, button.start-game-button, button:has-text("Shuffle Up")');
  await expect(shuffleUpButton).toBeVisible();
  await shuffleUpButton.click();

  await page.waitForURL('**/game/*', { timeout: 30000 });
  await page.waitForLoadState('networkidle');
}

test.describe('Mulligan Advisor chat', () => {

  test('Improve this opens the chat, sending a message gets the placeholder reply', async ({ page }) => {
    await page.goto(`${BASE_URL}/dontdie`);
    await page.waitForLoadState('networkidle');

    await setupGame(page);
    await expect(page.locator('body')).toHaveClass(/dev-mode/);

    // Recommendation + Improve button are visible during the mulligan stage.
    await expect(page.locator('[data-testid="mulligan-recommendation"]')).toBeVisible();
    const improve = page.locator('.mulligan-recommendation-improve');
    await expect(improve).toBeVisible();

    // Drawer starts closed (slid off the right edge).
    const drawer = page.locator('#advisor-chat');
    const viewport = page.viewportSize()!;
    const closedBox = await drawer.boundingBox();

    // Open it; it slides left into view.
    await improve.click();
    await expect(page.locator('body')).toHaveClass(/advisor-chat-open/);
    await page.waitForTimeout(400); // slide transition
    const openBox = await drawer.boundingBox();
    expect(openBox!.x).toBeLessThan(closedBox!.x - 200); // slid in from the right
    expect(openBox!.x).toBeGreaterThanOrEqual(0);
    expect(openBox!.x).toBeLessThan(viewport.width);

    // Send a message; expect the user bubble + the placeholder advisor reply.
    await page.locator('.advisor-chat-input').fill('your rule ignores my commander colors');
    await page.locator('.advisor-chat-send').click();

    await expect(page.locator('.advisor-chat-bubble-you')).toContainText('your rule ignores my commander colors');
    await expect(page.locator('.advisor-chat-bubble-trainer')).toContainText("Well isn't that special");

    // A second message continues the same session (snapshot already sent on the
    // first); it still gets a reply. Two exchanges now.
    await page.locator('.advisor-chat-input').fill('what about ramp spells?');
    await page.locator('.advisor-chat-send').click();
    await expect(page.locator('.advisor-chat-bubble-trainer')).toHaveCount(2);
    await expect(page.locator('.advisor-chat-bubble-you')).toHaveCount(2);

    // The conversation survives a game-state swap (rearrange-free action): mulligan.
    await page.locator('button.mulligan-button').click();
    await page.waitForTimeout(1700); // shuffle animation
    await expect(page.locator('body')).toHaveClass(/advisor-chat-open/);
    await expect(page.locator('.advisor-chat-bubble-trainer').first()).toContainText("Well isn't that special");
    await expect(page.locator('.advisor-chat-bubble-trainer')).toHaveCount(2); // conversation intact across the swap

    // Close it.
    await page.locator('.advisor-chat-close').click();
    await expect(page.locator('body')).not.toHaveClass(/advisor-chat-open/);

    console.log('SUCCESS: advisor chat opens, replies, survives swap, and closes');
  });

  test('conversation comes back after a full page reload, with a "minutes ago" label', async ({ page }) => {
    await page.goto(`${BASE_URL}/dontdie`);
    await page.waitForLoadState('networkidle');

    await setupGame(page);
    await expect(page.locator('body')).toHaveClass(/dev-mode/);

    // Open the drawer and send a message.
    await page.locator('.mulligan-recommendation-improve').click();
    await expect(page.locator('body')).toHaveClass(/advisor-chat-open/);
    await page.locator('.advisor-chat-input').fill('does it weigh my commander colors?');
    await page.locator('.advisor-chat-send').click();
    await expect(page.locator('.advisor-chat-bubble-trainer')).toHaveCount(1);

    // The "minutes ago" label reports the most recent message (just sent → "just now").
    const lastSeen = page.locator('#advisor-chat-last-seen');
    await expect(lastSeen).toBeVisible();
    await expect(lastSeen).toContainText(/just now|0 min|less than a minute/i);

    // Reload the whole page. The conversation is backend in-memory, so it returns,
    // and the drawer auto-opens because a conversation exists.
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toHaveClass(/advisor-chat-open/);
    await expect(page.locator('.advisor-chat-bubble-you')).toContainText('does it weigh my commander colors?');
    await expect(page.locator('.advisor-chat-bubble-trainer')).toHaveText(/Well isn't that special/);
    await expect(page.locator('.advisor-chat-bubble-trainer')).toHaveCount(1);
    await expect(page.locator('#advisor-chat-last-seen')).toBeVisible();

    console.log('SUCCESS: conversation survives reload with a minutes-ago label');
  });

  test('End Chat shows an eval modal; Cancel keeps the chat, "We\'re done here" wipes it', async ({ page }) => {
    await page.goto(`${BASE_URL}/dontdie`);
    await page.waitForLoadState('networkidle');

    await setupGame(page);
    await page.locator('.mulligan-recommendation-improve').click();
    await page.locator('.advisor-chat-input').fill('feedback for the trainer');
    await page.locator('.advisor-chat-send').click();
    await expect(page.locator('.advisor-chat-bubble-trainer')).toHaveCount(1);

    // End Chat opens the evaluation modal.
    await page.locator('.advisor-chat-end').click();
    await expect(page.locator('.trainer-eval-modal')).toBeVisible();
    await expect(page.locator('.trainer-eval-modal')).toContainText(/How did the trainer do/i);

    // Cancel: modal closes, chat is untouched (conversation still present after reload).
    await page.locator('.trainer-eval-actions .trainer-eval-cancel').click();
    await expect(page.locator('.trainer-eval-modal')).toHaveCount(0);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.advisor-chat-bubble-trainer')).toHaveCount(1);

    // End Chat again, pick a rating, and finish. Rating is required.
    await page.locator('.advisor-chat-end').click();
    await expect(page.locator('.trainer-eval-modal')).toBeVisible();
    await page.locator('.trainer-eval-feedback').fill('helpful, but slow');
    // The radio is visually hidden behind the star glyph; click the star label.
    await page.locator('.trainer-eval-star:has(.trainer-eval-rating[value="4"])').click();
    await expect(page.locator('.trainer-eval-rating[value="4"]')).toBeChecked();
    await page.locator('.trainer-eval-submit').click();

    // Modal closes, drawer closes, conversation is wiped (gone after reload, drawer closed).
    await expect(page.locator('.trainer-eval-modal')).toHaveCount(0);
    await expect(page.locator('body')).not.toHaveClass(/advisor-chat-open/);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).not.toHaveClass(/advisor-chat-open/);
    await expect(page.locator('.advisor-chat-bubble-trainer')).toHaveCount(0);

    console.log('SUCCESS: End Chat eval modal cancels and wipes correctly');
  });

  test('chat drawer is absent without dev mode', async ({ page }) => {
    await setupGame(page);
    await expect(page.locator('body')).not.toHaveClass(/dev-mode/);
    await expect(page.locator('#advisor-chat')).toHaveCount(0);
    await expect(page.locator('.mulligan-recommendation-improve')).not.toBeVisible();
    console.log('SUCCESS: no advisor chat outside dev mode');
  });
});
