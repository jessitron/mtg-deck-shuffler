import { test, expect, Page, Locator } from "@playwright/test";
import { randomUUID } from "node:crypto";

/**
 * Ticket 20 (tabletop-physics), corrected 2026-08-10 after a live bug
 * report: a card can tuck under another, but NOT via real tldraw parenting
 * — tldraw's renderer guarantees a child always paints in front of its own
 * parent, so "Send to back" on a real child is structurally a no-op
 * (verified against tldraw source). Cards tuck via a `meta.tuckedWith` link
 * instead, staying ordinary page siblings so tldraw's stock reorder
 * ("Send to back"/"Bring to front") genuinely works between them.
 *
 * "Host" (whoever's drag carries the other) is whichever of the pair is
 * CURRENTLY on top by z-order — Jess's correction, "whichever card is on
 * top should be the parent" — not a fixed role assigned at attach time.
 *
 * - Dropping a card onto another tucks it, on top by default.
 * - The topmost of a tucked pair carries the other when dragged; the
 *   bottom one, dragged alone, does not carry the top one, and detaches if
 *   it moves far enough to stop overlapping.
 * - "Send to back"/"Bring to front" actually swaps who's on top — and
 *   which one is host swaps with it.
 * - A tucked card is still independently selectable, tappable, and
 *   draggable, and tapping either one never rotates the other (no shared
 *   transform at all now — there's nothing to compensate).
 * - A host leaving the battlefield detaches its passenger, which stays
 *   exactly where it was.
 */

function fakeTraceparent(): string {
  return `00-${randomUUID().replace(/-/g, "")}-${randomUUID().replace(/-/g, "").slice(0, 16)}-01`;
}

function cardPlayed(tableId: string, instanceId: string, payloadOverrides: Record<string, unknown>) {
  return {
    id: randomUUID(),
    tableId,
    name: "card.played",
    occurredAt: new Date().toISOString(),
    initiator: { seatId: "e2e-seat", playerName: "Jess" },
    occurredIn: "shuffler",
    visibility: "public",
    traceparent: fakeTraceparent(),
    schemaVersion: 1,
    payload: {
      face: "front",
      frontImageUrl: "https://cards.scryfall.io/normal/front/6/8/688b73bb-7952-4a1b-a878-49f13cf3ba25.jpg",
      backImageUrl: null,
      zoneHint: "battlefield",
      owner: "e2e-seat",
      isCommander: false,
      card: { scryfallId: randomUUID(), instanceId },
      ...payloadOverrides,
    },
  };
}

async function dragPointTo(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 10 });
  await page.mouse.up();
}

async function dragCenterTo(page: Page, from: Locator, to: { x: number; y: number }) {
  await dragPointTo(page, await center(from), to);
}

/** Click a card at its top-edge grip point rather than its center — once a
 * passenger overlaps a host's center, a plain center click can hit
 * whichever card is currently on top instead of the one you meant. */
async function clickCard(page: Page, card: Locator) {
  const grip = await topGrip(card);
  await page.mouse.click(grip.x, grip.y);
}

async function center(locator: Locator): Promise<{ x: number; y: number }> {
  const box = await locator.boundingBox();
  if (!box) throw new Error("missing bounding box");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** A grip near the card's top edge — the tucked partner in these tests sits
 * on the lower half, so grabbing here reliably hits the card whose box this
 * is, not whatever's overlapping its lower half. */
async function topGrip(card: Locator): Promise<{ x: number; y: number }> {
  const box = await card.boundingBox();
  if (!box) throw new Error("missing card box");
  return { x: box.x + box.width / 2, y: box.y + box.height * 0.03 };
}

// Battlefield land slots are spaced CARD_W/CARD_H + LAND_GAP apart
// (cardLayout.ts's landPosition), so two cards start genuinely separate;
// the test's own drags are what brings one onto the other.
async function placeCard(page: Page, baseURL: string | undefined, tableSlug: string, instanceId: string, name: string) {
  const event = cardPlayed(tableSlug, instanceId, { cardName: name, zoneHint: "battlefield" });
  const response = await page.request.post(`${baseURL}/api/tables/${tableSlug}/cards`, { data: event });
  expect(response.status()).toBe(201);
  const card = page.locator(`#shape\\:card-${instanceId}`);
  await expect(card).toBeAttached();
  return card;
}

async function openTable(page: Page, tableSlug: string) {
  await page.goto(`/t/${tableSlug}`);
  await expect(page.locator(".tl-canvas")).toBeVisible({ timeout: 15000 });
}

/** Marquee-select both cards by brushing a box around their combined
 * bounds, starting outside both — a left click taps a card (this app's own
 * gesture), so a marquee is the only way to multi-select without tapping. */
async function marqueeSelect(page: Page, cards: Locator[]) {
  const boxes = [];
  for (const card of cards) {
    const box = await card.boundingBox();
    if (!box) throw new Error("missing card box");
    boxes.push(box);
  }
  const left = Math.min(...boxes.map((b) => b.x));
  const top = Math.min(...boxes.map((b) => b.y));
  const right = Math.max(...boxes.map((b) => b.x + b.width));
  const bottom = Math.max(...boxes.map((b) => b.y + b.height));
  await page.mouse.move(left - 15, top - 15);
  await page.mouse.down();
  await page.mouse.move(right + 15, bottom + 15, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(500); // outlive the double-click window
}

async function reorder(page: Page, card: Locator, action: "Send to back" | "Bring to front") {
  // tldraw's Idle.onRightClick PRESERVES the current selection when the
  // right-click point falls inside its bounds ("so that right-clicking
  // inside the selection preserves it, even when a filled shape sits behind
  // it") — with two overlapping tucked cards, if the OTHER card is still
  // selected from an earlier drag, right-clicking on THIS card's pixel hits
  // that guard and opens the menu for the stale selection instead. Deselect
  // first (a real click on empty canvas) so the right-click falls through
  // to real hit-testing.
  await page.mouse.click(1000, 200);
  // A single right-click both selects the card AND opens its context menu —
  // no preceding left-click: a left click is this app's TAP gesture
  // (MtgCardShapeUtil.onClick), so clicking first would tap the card, not
  // just select it.
  const grip = await topGrip(card);
  await page.mouse.click(grip.x, grip.y, { button: "right" });
  await page.getByText("Reorder").click();
  const item = page.getByText(action, { exact: true });
  await expect(item).toBeVisible();
  await item.click();
  await expect(page.locator(".tlui-context-menu")).not.toBeVisible();
  await page.waitForTimeout(300);
  // Closing the menu can leave some overlay/focus state that swallows the
  // very next raw pointer drag — a real click on empty canvas resets it.
  await page.mouse.click(1000, 200);
  await page.waitForTimeout(300);
}

/** Drop `passenger` onto the lower edge of `host` — tucks it, on top by default. */
async function tuck(page: Page, passenger: Locator, host: Locator) {
  const hostBox = await host.boundingBox();
  if (!hostBox) throw new Error("missing host box");
  const hostCenter = await center(host);
  await dragCenterTo(page, passenger, { x: hostCenter.x, y: hostBox.y + hostBox.height * 0.92 });
}

test("dropping a card onto another tucks it, on top by default, and carries the other when dragged", async ({ page, baseURL }) => {
  const tableSlug = `verify-tuck-${Date.now()}`;
  await openTable(page, tableSlug);

  const aId = randomUUID();
  const cardA = await placeCard(page, baseURL, tableSlug, aId, "Llanowar Elves");
  await page.keyboard.press("Shift+1");
  await page.waitForTimeout(300);

  const bId = randomUUID();
  const cardB = await placeCard(page, baseURL, tableSlug, bId, "Sol Ring");
  await page.waitForTimeout(300);

  // B dropped onto A: B tucks, landing on top by default.
  await tuck(page, cardB, cardA);

  // B is on top now (host) — dragging B carries A along.
  const aBefore = await center(cardA);
  const bGrip = await topGrip(cardB);
  await dragPointTo(page, bGrip, { x: bGrip.x + 140, y: bGrip.y + 60 });
  await expect(async () => {
    const aAfter = await center(cardA);
    expect(aAfter.x - aBefore.x).toBeCloseTo(140, -1);
    expect(aAfter.y - aBefore.y).toBeCloseTo(60, -1);
  }).toPass({ timeout: 5000 });
});

test("a small nudge of the passenger doesn't detach it; dragging it far enough does", async ({ page, baseURL }) => {
  const tableSlug = `verify-tuck-nudge-${Date.now()}`;
  await openTable(page, tableSlug);

  const aId = randomUUID();
  const cardA = await placeCard(page, baseURL, tableSlug, aId, "Llanowar Elves");
  await page.keyboard.press("Shift+1");
  await page.waitForTimeout(300);

  const bId = randomUUID();
  const cardB = await placeCard(page, baseURL, tableSlug, bId, "Sol Ring");
  await page.waitForTimeout(300);

  await tuck(page, cardB, cardA); // B on top (host), A tucked underneath (passenger)

  // Nudge A (the passenger) a few px — still overlaps B, link survives:
  // dragging B afterward still carries A.
  const aNow = await center(cardA);
  await dragPointTo(page, aNow, { x: aNow.x + 5, y: aNow.y - 5 });
  const bGrip = await topGrip(cardB);
  const aBeforeCarry = await center(cardA);
  await dragPointTo(page, bGrip, { x: bGrip.x - 90, y: bGrip.y + 30 });
  await expect(async () => {
    const aAfter = await center(cardA);
    expect(aAfter.x - aBeforeCarry.x).toBeCloseTo(-90, -1);
    expect(aAfter.y - aBeforeCarry.y).toBeCloseTo(30, -1);
  }).toPass({ timeout: 5000 });

  // Now drag A (still the passenger) far away — detaches: B no longer moves it.
  const aBeforeDetach = await center(cardA);
  await dragPointTo(page, aBeforeDetach, { x: aBeforeDetach.x + 400, y: aBeforeDetach.y });
  await page.waitForTimeout(300);

  const bGripNow = await topGrip(cardB);
  const aSettled = await center(cardA);
  await dragPointTo(page, bGripNow, { x: bGripNow.x + 60, y: bGripNow.y });
  await page.waitForTimeout(300);
  const aFinal = await center(cardA);
  expect(Math.abs(aFinal.x - aSettled.x)).toBeLessThan(5);
  expect(Math.abs(aFinal.y - aSettled.y)).toBeLessThan(5);
});

test("Send to back / Bring to front swaps which card is host", async ({ page, baseURL }) => {
  const tableSlug = `verify-tuck-reorder-${Date.now()}`;
  await openTable(page, tableSlug);

  const aId = randomUUID();
  const cardA = await placeCard(page, baseURL, tableSlug, aId, "Llanowar Elves");
  await page.keyboard.press("Shift+1");
  await page.waitForTimeout(300);

  const bId = randomUUID();
  const cardB = await placeCard(page, baseURL, tableSlug, bId, "Sol Ring");
  await page.waitForTimeout(300);

  await tuck(page, cardB, cardA); // B on top (host) by default

  // Swap: bring A to front instead.
  await reorder(page, cardA, "Bring to front");

  // Now A is host — dragging A carries B along.
  const bBefore = await center(cardB);
  const aGrip = await topGrip(cardA);
  await dragPointTo(page, aGrip, { x: aGrip.x + 100, y: aGrip.y + 40 });
  await expect(async () => {
    const bAfter = await center(cardB);
    expect(bAfter.x - bBefore.x).toBeCloseTo(100, -1);
    expect(bAfter.y - bBefore.y).toBeCloseTo(40, -1);
  }).toPass({ timeout: 5000 });

  // And B (now the passenger) no longer carries A when dragged alone.
  const aBefore = await center(cardA);
  const bGrip = await topGrip(cardB);
  await dragPointTo(page, bGrip, { x: bGrip.x - 60, y: bGrip.y - 20 });
  await page.waitForTimeout(300);
  const aAfter = await center(cardA);
  expect(Math.abs(aAfter.x - aBefore.x)).toBeLessThan(5);
  expect(Math.abs(aAfter.y - aBefore.y)).toBeLessThan(5);
});

test("a tucked card is independently tappable and draggable, and tapping never rotates the other", async ({ page, baseURL }) => {
  const tableSlug = `verify-tuck-tap-${Date.now()}`;
  await openTable(page, tableSlug);

  const aId = randomUUID();
  const cardA = await placeCard(page, baseURL, tableSlug, aId, "Llanowar Elves");
  await page.keyboard.press("Shift+1");
  await page.waitForTimeout(300);

  const bId = randomUUID();
  const cardB = await placeCard(page, baseURL, tableSlug, bId, "Sol Ring");
  await page.waitForTimeout(300);

  await tuck(page, cardB, cardA);

  // Tap A (the passenger, tucked underneath) — its own box swaps
  // width/height; B is untouched.
  const aBoxBefore = await cardA.boundingBox();
  const bBoxBefore = await cardB.boundingBox();
  await clickCard(page, cardA);
  await page.waitForTimeout(700);
  const aBoxAfter = await cardA.boundingBox();
  expect(aBoxAfter!.width).toBeCloseTo(aBoxBefore!.height, -1);
  expect(aBoxAfter!.height).toBeCloseTo(aBoxBefore!.width, -1);
  const bBoxAfter = await cardB.boundingBox();
  expect(bBoxAfter!.width).toBeCloseTo(bBoxBefore!.width, -1);
  expect(bBoxAfter!.height).toBeCloseTo(bBoxBefore!.height, -1);

  // Tap B (the host, on top) — B's own box swaps; A stays exactly put.
  await page.waitForTimeout(500);
  const aCenterBefore = await center(cardA);
  const bGrip = await topGrip(cardB);
  await page.mouse.click(bGrip.x, bGrip.y);
  await page.waitForTimeout(700);
  const bBoxAfterTap = await cardB.boundingBox();
  expect(bBoxAfterTap!.width).toBeCloseTo(bBoxBefore!.height, -1);
  const aCenterAfter = await center(cardA);
  expect(Math.abs(aCenterAfter.x - aCenterBefore.x)).toBeLessThan(5);
  expect(Math.abs(aCenterAfter.y - aCenterBefore.y)).toBeLessThan(5);
});

test("a host leaving the battlefield detaches its passenger, which stays exactly where it was", async ({ page, baseURL }) => {
  const tableSlug = `verify-tuck-gy-${Date.now()}`;
  await openTable(page, tableSlug);

  const aId = randomUUID();
  const cardA = await placeCard(page, baseURL, tableSlug, aId, "Llanowar Elves");

  const graveyard = page.locator(`[data-shape-id="shape:region-graveyard-${tableSlug}-e2e-seat"]`);
  await expect(graveyard).toBeAttached();

  await page.keyboard.press("Shift+1");
  await page.waitForTimeout(300);

  const bId = randomUUID();
  const cardB = await placeCard(page, baseURL, tableSlug, bId, "Sol Ring");
  await page.waitForTimeout(300);

  await tuck(page, cardB, cardA); // B on top (host), A tucked underneath

  // Drag B (the host) to the graveyard: A detaches and stays exactly put.
  const aSettled = await center(cardA);
  const graveyardCenter = await center(graveyard);
  const bGrip = await topGrip(cardB);
  const bBoxNow = await cardB.boundingBox();
  if (!bBoxNow) throw new Error("missing card box");
  await dragPointTo(page, bGrip, {
    x: graveyardCenter.x,
    y: graveyardCenter.y - bBoxNow.height * 0.38,
  });

  await expect(async () => {
    const bBox = await cardB.boundingBox();
    const graveyardBox = await graveyard.boundingBox();
    if (!bBox || !graveyardBox) throw new Error("missing box");
    const inside = bBox.x > graveyardBox.x && bBox.x < graveyardBox.x + graveyardBox.width;
    expect(inside).toBe(true);
  }).toPass({ timeout: 5000 });

  const aFinal = await center(cardA);
  expect(Math.abs(aFinal.x - aSettled.x)).toBeLessThan(5);
  expect(Math.abs(aFinal.y - aSettled.y)).toBeLessThan(5);

  // Detached: A moving now doesn't drag B, and B moving doesn't drag A.
  const aGrip = await topGrip(cardA);
  const bBefore = await center(cardB);
  await dragPointTo(page, aGrip, { x: aGrip.x + 50, y: aGrip.y });
  await page.waitForTimeout(300);
  const bAfter = await center(cardB);
  expect(Math.abs(bAfter.x - bBefore.x)).toBeLessThan(5);
  expect(Math.abs(bAfter.y - bBefore.y)).toBeLessThan(5);
});

test("nudging both tucked cards together (marquee-selected) moves each by the same amount, not double", async ({ page, baseURL }) => {
  const tableSlug = `verify-tuck-multiselect-${Date.now()}`;
  await openTable(page, tableSlug);

  const aId = randomUUID();
  const cardA = await placeCard(page, baseURL, tableSlug, aId, "Llanowar Elves");
  await page.keyboard.press("Shift+1");
  await page.waitForTimeout(300);

  const bId = randomUUID();
  const cardB = await placeCard(page, baseURL, tableSlug, bId, "Sol Ring");
  await page.waitForTimeout(300);

  await tuck(page, cardB, cardA); // B on top (host), A tucked underneath

  // Sanity check that a multi-select move of a tucked pair keeps them in
  // lockstep. Arrow-nudge (not a pointer drag) because a raw pointer drag
  // right after this suite's marqueeSelect gesture is unreliable here — but
  // note this doesn't reproduce the specific bug carryTuckedPartner's
  // `gestureSelection` field guards against (a POINTER drag's
  // Translating.ts calls onTranslateEnd per shape synchronously, so the
  // second shape processed could see an already-emptied live selection);
  // nudgeShapes batches its position writes differently and empirically
  // doesn't double-carry either way this was tested. The pointer-drag path
  // is covered by direct source reading (Translating.ts) and code review,
  // not by an automated regression test here.
  await marqueeSelect(page, [cardA, cardB]);
  const aBefore = await center(cardA);
  const bBefore = await center(cardB);
  // Shift+Arrow is tldraw's "major nudge" (10x a plain arrow step) — plain
  // arrow steps are sub-pixel at this zoom level, too small to assert on.
  for (let i = 0; i < 10; i++) await page.keyboard.press("Shift+ArrowRight");
  for (let i = 0; i < 5; i++) await page.keyboard.press("Shift+ArrowDown");
  await page.waitForTimeout(300);

  const aAfter = await center(cardA);
  const bAfter = await center(cardB);
  const aDelta = { x: aAfter.x - aBefore.x, y: aAfter.y - aBefore.y };
  const bDelta = { x: bAfter.x - bBefore.x, y: bAfter.y - bBefore.y };
  expect(Math.abs(aDelta.x)).toBeGreaterThan(1); // sanity: it actually moved
  expect(bDelta.x).toBeCloseTo(aDelta.x, 0);
  expect(bDelta.y).toBeCloseTo(aDelta.y, 0);
});
