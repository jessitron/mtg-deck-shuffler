import { test, expect, Browser, Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { openTable, placeCard } from "./helpers";

/**
 * tabletop-physics ticket 15: tapping reads as a quick rotation, not a snap.
 * The mechanism is a local counter-rotation catch-up (WAAPI, 0.5s ease-out)
 * on the card's content, keyed off `props.tapped` changing — so it's
 * observable via `element.getAnimations()` on the `.tl-image-container`.
 *
 * Free rotation not triggering the animation (ticket checkbox 3) is covered
 * structurally, not here: the effect's only input is `props.tapped`, so it
 * cannot see `shape.rotation` change.
 */

// Running WAAPI animations on the card's image container, [duration, ...].
async function runningAnimationDurations(page: Page, instanceId: string): Promise<number[]> {
  return page.evaluate((id) => {
    const el = document.querySelector(`#shape\\:card-${id} .tl-image-container`);
    if (!el) return [];
    return el
      .getAnimations()
      .filter((a) => a.playState === "running")
      .map((a) => Number((a.effect as KeyframeEffect | null)?.getTiming().duration ?? 0));
  }, instanceId);
}

test("tapping a card plays a 0.5s rotation catch-up animation", async ({ page, baseURL }) => {
  const tableSlug = `verify-tap-anim-${Date.now()}`;
  await openTable(page, tableSlug);

  const instanceId = randomUUID();
  const card = await placeCard(page, baseURL, tableSlug, instanceId);

  await card.click();
  const durations = await runningAnimationDurations(page, instanceId);
  expect(durations).toContain(500);

  // Untap animates too. Wait out the animation AND tldraw's double-click
  // window (450ms) so the second click is an independent onClick.
  await page.waitForTimeout(600);
  await card.click();
  const untapDurations = await runningAnimationDurations(page, instanceId);
  expect(untapDurations).toContain(500);
});

test("a card arriving already-tapped does not animate on mount", async ({ page, baseURL }) => {
  const tableSlug = `verify-tap-mount-${Date.now()}`;
  await openTable(page, tableSlug);

  const instanceId = randomUUID();
  const card = await placeCard(page, baseURL, tableSlug, instanceId);

  // Tap it, let the animation finish, then reload: the card arrives from the
  // store already-tapped and must not swing on mount.
  await card.click();
  await expect(async () => {
    expect(await runningAnimationDurations(page, instanceId)).toHaveLength(0);
  }).toPass({ timeout: 3000 });

  await page.reload();
  await expect(page.locator(`#shape\\:card-${instanceId}`)).toBeAttached({ timeout: 15000 });
  expect(await runningAnimationDurations(page, instanceId)).toHaveLength(0);
});

test("a remote peer sees the tap animation when the prop syncs in", async ({ browser, baseURL }) => {
  const tableSlug = `verify-tap-remote-${Date.now()}`;

  async function openTableInNewContext(b: Browser) {
    const context = await b.newContext();
    const page = await context.newPage();
    await openTable(page, tableSlug);
    return { context, page };
  }

  const alice = await openTableInNewContext(browser);
  const bob = await openTableInNewContext(browser);

  const instanceId = randomUUID();
  const card = await placeCard(alice.page, baseURL, tableSlug, instanceId);
  await expect(bob.page.locator(`#shape\\:card-${instanceId}`)).toBeAttached({ timeout: 10000 });

  await card.click();

  // The prop change syncs to Bob and triggers the same catch-up there.
  await expect(async () => {
    expect(await runningAnimationDurations(bob.page, instanceId)).toContain(500);
  }).toPass({ timeout: 3000 });

  await alice.context.close();
  await bob.context.close();
});
