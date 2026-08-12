import { test, expect, Browser, Page, Locator } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { openTable, placeCard, zoomToFit, center, dragCenterTo } from "./helpers";


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

  await card.click();
  await expect(async () => {
    expect(await runningAnimationDurations(page, instanceId)).toHaveLength(0);
  }).toPass({ timeout: 3000 });

  await page.reload();
  await expect(page.locator(`#shape\\:card-${instanceId}`)).toBeAttached({ timeout: 15000 });
  expect(await runningAnimationDurations(page, instanceId)).toHaveLength(0);
});

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
  await page.waitForTimeout(500);
}

async function topGrip(card: Locator): Promise<{ x: number; y: number }> {
  const box = await card.boundingBox();
  if (!box) throw new Error("missing bounding box");
  return { x: box.x + box.width / 2, y: box.y + box.height * 0.12 };
}

test("a counter riding a tapped card animates along with it", async ({ page, baseURL }) => {
  const tableSlug = `verify-tap-anim-counter-${Date.now()}`;
  await openTable(page, tableSlug);

  const instanceId = randomUUID();
  const card = await placeCard(page, baseURL, tableSlug, instanceId);
  await zoomToFit(page);

  const cardCenter = await center(card);
  await createCounter(page, { x: cardCenter.x + 300, y: cardCenter.y });
  const counter = page.getByTestId("mtg-counter");
  await expect(counter).toHaveCount(1);

  const cardBox = await card.boundingBox();
  if (!cardBox) throw new Error("missing card box");
  await dragCenterTo(page, counter, { x: cardCenter.x, y: cardBox.y + cardBox.height * 0.7 });

  // Attaching itself must not animate — only an actual tap should.
  expect(await runningAnimationDurationsFor(counter)).toHaveLength(0);

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

test("a counter's orbit around a tapped card starts from its pre-tap spot, not a jump", async ({ page, baseURL }) => {
  const tableSlug = `verify-tap-anim-orbit-${Date.now()}`;
  await openTable(page, tableSlug);

  const instanceId = randomUUID();
  const card = await placeCard(page, baseURL, tableSlug, instanceId);
  await zoomToFit(page);

  const cardCenter = await center(card);
  await createCounter(page, { x: cardCenter.x + 300, y: cardCenter.y });
  const counter = page.getByTestId("mtg-counter");
  await expect(counter).toHaveCount(1);

  const cardBox = await card.boundingBox();
  if (!cardBox) throw new Error("missing card box");
  await dragCenterTo(page, counter, { x: cardCenter.x, y: cardBox.y + cardBox.height * 0.7 });

  const preTapBox = await counter.boundingBox();
  if (!preTapBox) throw new Error("missing counter box before tap");

  const grip = await topGrip(card);
  await page.mouse.click(grip.x, grip.y);

  // Read the WAAPI keyframes directly, right as the animation starts — this
  // avoids racing real elapsed time against a 500ms ease-out curve (which moves
  // fast early and makes any bounding-box snapshot's timing flaky). The catch-up
  // keyframe must combine a translate (the orbit compensation) with the rotate
  // (the existing self-rotation compensation); a translate of ~0 would mean the
  // counter still jumps to its new orbited spot instead of swinging into it.
  const keyframe0Transform = await counter.evaluate((el) => {
    const container = el.closest(".tl-image-container");
    const anim = container?.getAnimations().find((a) => a.playState === "running");
    const keyframes = (anim?.effect as KeyframeEffect | null)?.getKeyframes();
    return keyframes?.[0]?.transform as string | undefined;
  });
  if (!keyframe0Transform) throw new Error("no running animation with keyframes found");
  const translateMatch = keyframe0Transform.match(/translate\(\s*(-?[\d.]+)px,\s*(-?[\d.]+)px\s*\)/);
  if (!translateMatch) throw new Error(`expected a translate() in "${keyframe0Transform}"`);
  const [dx, dy] = [Number(translateMatch[1]), Number(translateMatch[2])];
  expect(Math.hypot(dx, dy)).toBeGreaterThan(5);

  // After the animation settles, the counter has actually orbited to a new spot.
  await page.waitForTimeout(600);
  const settledBox = await counter.boundingBox();
  if (!settledBox) throw new Error("missing counter box after settling");
  expect(Math.hypot(settledBox.x - preTapBox.x, settledBox.y - preTapBox.y)).toBeGreaterThan(15);
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
