import { test, expect, Browser, Page, Locator } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { openTable, placeCard, zoomToFit, center, dragCenterTo } from "./helpers";

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

// Running WAAPI animations on a shape's own .tl-image-container, found by
// walking up from a testid'd descendant — mirrors runningAnimationDurations
// above but for a shape (the counter) whose element isn't addressable by a
// predictable id the way `#shape\:card-<instanceId>` is.
async function runningAnimationDurationsFor(locator: Locator): Promise<number[]> {
  return locator.evaluate((el) => {
    const container = el.closest(".tl-image-container");
    if (!container) return [];
    return container
      .getAnimations()
      .filter((a) => a.playState === "running")
      .map((a) => Number((a.effect as KeyframeEffect | null)?.getTiming().duration ?? 0));
  });
}

/** Create a blank counter via the toolbar tool, clicking at the given screen point. */
async function createCounter(page: Page, at: { x: number; y: number }) {
  await page.getByTestId("tools.mtg-counter").click();
  await page.mouse.click(at.x, at.y);
  // Outlive tldraw's double-click window: grabbing the new counter at the
  // same point right away would classify as a double-click and open editing.
  await page.waitForTimeout(500);
}

/** A grip near the card's top edge — same rationale as verify-counter.spec.ts's
 * topGrip: counters in these tests sit lower on the card, so clicking/grabbing
 * here reliably hits the CARD (its hit-test region, not just its pixels), even
 * though a nearby counter's own hit-test margin extends past its visible disc. */
async function topGrip(card: Locator): Promise<{ x: number; y: number }> {
  const box = await card.boundingBox();
  if (!box) throw new Error("missing bounding box");
  return { x: box.x + box.width / 2, y: box.y + box.height * 0.12 };
}

test("a counter riding a tapped card animates along with it", async ({ page, baseURL }) => {
  // TODO.md regression: the counter used to snap to the new angle a frame
  // before the card's own content eased back — this proves the counter now
  // plays the identical 0.5s catch-up as its host.
  const tableSlug = `verify-tap-anim-counter-${Date.now()}`;
  await openTable(page, tableSlug);

  const instanceId = randomUUID();
  const card = await placeCard(page, baseURL, tableSlug, instanceId);
  await zoomToFit(page);

  const cardCenter = await center(card);
  await createCounter(page, { x: cardCenter.x + 300, y: cardCenter.y });
  const counter = page.getByTestId("mtg-counter");
  await expect(counter).toHaveCount(1);

  // Attach the counter to the card's lower half (top edge stays free to grab
  // the card itself for the tap click below).
  const cardBox = await card.boundingBox();
  if (!cardBox) throw new Error("missing card box");
  await dragCenterTo(page, counter, { x: cardCenter.x, y: cardBox.y + cardBox.height * 0.7 });

  // Attaching itself must not animate — only an actual tap should.
  expect(await runningAnimationDurationsFor(counter)).toHaveLength(0);

  // Click near the card's top edge, not its center: at this zoom level the
  // counter's own hit-test margin extends well past its visible disc, and a
  // center click can resolve to the counter instead of the card underneath.
  const grip = await topGrip(card);
  await page.mouse.click(grip.x, grip.y);
  const durations = await runningAnimationDurationsFor(counter);
  expect(durations).toContain(500);

  // Untap animates the counter too.
  await page.waitForTimeout(600);
  await page.mouse.click(grip.x, grip.y);
  const untapDurations = await runningAnimationDurationsFor(counter);
  expect(untapDurations).toContain(500);
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
