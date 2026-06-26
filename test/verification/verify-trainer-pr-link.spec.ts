/**
 * End-to-End Verification: live Trainer wiring renders status + PR link.
 *
 * With TRAINER_AGENT_URL pointed at a fake front door that returns
 * `{status: "done", pr_url}`, sending a chat message should render the Trainer's
 * status tag and a clickable "View PR" link in the reply bubble.
 *
 * RUN: start the fake front door (scratchpad/fake-frontdoor.mjs) on :8099, start a
 * server on port 3001 with TRAINER_AGENT_URL=http://localhost:8099/, then
 *   npx playwright test test/verification/verify-trainer-pr-link.spec.ts
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

// This spec needs the app wired to the fake front door (TRAINER_AGENT_URL set).
// verify-trainer-live.sh sets TRAINER_LIVE_VERIFY; the default verify.sh run (no
// fake door, placeholder reply) skips it.
test.skip(!process.env.TRAINER_LIVE_VERIFY, 'requires the fake front door — run via verify-trainer-live.sh');

test('Trainer reply renders the status tag and a clickable PR link', async ({ page }) => {
  await page.goto(`${BASE_URL}/dontdie`);
  await page.waitForLoadState('networkidle');

  await setupGame(page);
  await expect(page.locator('body')).toHaveClass(/dev-mode/);

  await page.locator('.mulligan-recommendation-improve').click();
  const input = page.locator('.advisor-chat-input');
  await expect(input).toBeVisible();
  await input.fill('Please open a PR adding this hand as a blessed case');
  await page.locator('.advisor-chat-send').click();

  // The PR link from the fake front door's pr_url.
  const prLink = page.locator('.advisor-chat-pr-link');
  await expect(prLink).toBeVisible({ timeout: 10000 });
  await expect(prLink).toHaveAttribute('href', 'https://github.com/jessitron/mtg-deck-shuffler/pull/0');

  // The "done" status tag (chatting would be hidden).
  await expect(page.locator('.advisor-chat-bubble-status-done')).toHaveText('done');

  console.log('SUCCESS: Trainer reply shows status tag + PR link');
});
