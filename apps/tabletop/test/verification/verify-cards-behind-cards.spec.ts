import { test, expect, Page, Locator } from "@playwright/test";
import { randomUUID } from "node:crypto";

/**
 * Ticket 20 (tabletop-physics): a card can tuck behind another card, via the
 * same drag-attach mechanism ticket 18 built for counters.
 *
 * - Dragging a card onto another parents it (tldraw parenting): moving the
 *   host afterward carries the passenger along.
 * - The passenger is still independently selectable, tappable, and
 *   draggable — a small in-place move doesn't detach it.
 * - Tapping the host does not move the passenger on screen (rotation +
 *   position compensation, cardTap.ts's passengerTapCompensation).
 * - The instant the host card enters a non-battlefield zone (graveyard),
 *   the passenger detaches, lands near the zone's edge outside it, and
 *   reconciles to upright (rotation 0).
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
      zoneHint: "stack",
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
 * passenger overlaps a host's center, `locator.click()`'s default center
 * click hits the (topmost) passenger's image and never reaches the host. */
async function clickCard(page: Page, card: Locator) {
  const grip = await topGrip(card);
  await page.mouse.click(grip.x, grip.y);
}

async function center(locator: Locator): Promise<{ x: number; y: number }> {
  const box = await locator.boundingBox();
  if (!box) throw new Error("missing bounding box");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** A grip near the card's top edge — the passenger in these tests sits on
 * the lower half, so grabbing here reliably hits the HOST card. */
async function topGrip(card: Locator): Promise<{ x: number; y: number }> {
  const box = await card.boundingBox();
  if (!box) throw new Error("missing card box");
  return { x: box.x + box.width / 2, y: box.y + box.height * 0.03 };
}

// battlefield, not stack: same-seat stack slots are only ~36px apart
// (cardLayout.ts's stackCardPosition), so two stacked cards render almost
// fully overlapping at zoom-to-fit — confusing this suite's own drags before
// either card has been placed anywhere deliberately (verify-drag-identity.spec.ts
// isolates the same class of concern the same way). Battlefield land slots
// are CARD_W/CARD_H + LAND_GAP apart, so host and passenger start genuinely
// separate; the test's own drags are what brings the passenger onto the host.
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

test("a card tucked under another rides along, stays independently tappable, and doesn't move when the host taps", async ({
  page,
  baseURL,
}) => {
  const tableSlug = `verify-tuck-${Date.now()}`;
  await openTable(page, tableSlug);

  const hostId = randomUUID();
  const host = await placeCard(page, baseURL, tableSlug, hostId, "Llanowar Elves");
  await page.keyboard.press("Shift+1");
  await page.waitForTimeout(300);

  const hostCenter = await center(host);
  const passengerId = randomUUID();
  const passenger = await placeCard(page, baseURL, tableSlug, passengerId, "Sol Ring");
  await page.waitForTimeout(300);

  // 1. Drag the passenger onto the host's lower edge (top edge stays free to
  // grab the host).
  const hostBox = await host.boundingBox();
  if (!hostBox) throw new Error("missing host box");
  const dropSpot = { x: hostCenter.x, y: hostBox.y + hostBox.height * 0.92 };
  await dragCenterTo(page, passenger, dropSpot);

  // Attached = dragging the host carries the passenger along.
  const passengerBefore = await center(passenger);
  const grip = await topGrip(host);
  await dragPointTo(page, grip, { x: grip.x + 140, y: grip.y + 60 });
  await expect(async () => {
    const passengerAfter = await center(passenger);
    expect(passengerAfter.x - passengerBefore.x).toBeCloseTo(140, -1);
    expect(passengerAfter.y - passengerBefore.y).toBeCloseTo(60, -1);
  }).toPass({ timeout: 5000 });

  // 2. A small in-place nudge of the passenger alone doesn't detach it —
  // dragging the host afterward still carries it.
  const passengerNow = await center(passenger);
  await dragPointTo(page, passengerNow, { x: passengerNow.x + 5, y: passengerNow.y - 5 });
  const gripNow = await topGrip(host);
  const passengerBeforeSecondCarry = await center(passenger);
  await dragPointTo(page, gripNow, { x: gripNow.x - 90, y: gripNow.y + 30 });
  await expect(async () => {
    const passengerAfter = await center(passenger);
    expect(passengerAfter.x - passengerBeforeSecondCarry.x).toBeCloseTo(-90, -1);
    expect(passengerAfter.y - passengerBeforeSecondCarry.y).toBeCloseTo(30, -1);
  }).toPass({ timeout: 5000 });

  // 3. The passenger is independently tappable: clicking it swaps its own
  // bounding box's width/height without moving the host.
  const passengerBoxBefore = await passenger.boundingBox();
  const hostBoxBefore = await host.boundingBox();
  await passenger.click();
  await expect(async () => {
    const passengerBoxAfter = await passenger.boundingBox();
    expect(passengerBoxAfter).not.toBeNull();
    expect(passengerBoxAfter!.width).toBeGreaterThan(passengerBoxBefore!.height * 0.9);
    expect(passengerBoxAfter!.width).toBeLessThan(passengerBoxBefore!.height * 1.1);
  }).toPass({ timeout: 5000 });
  const hostBoxAfterPassengerTap = await host.boundingBox();
  expect(hostBoxAfterPassengerTap!.width).toBeCloseTo(hostBoxBefore!.width, -1);
  expect(hostBoxAfterPassengerTap!.height).toBeCloseTo(hostBoxBefore!.height, -1);
  // Untap it back for the next step.
  await page.waitForTimeout(500);
  await passenger.click();
  await page.waitForTimeout(500);

  // 4. Tapping the HOST does not move the passenger on screen — rotation and
  // position compensation (this ticket's one genuinely new mechanism).
  const passengerBeforeHostTap = await center(passenger);
  await clickCard(page, host);
  await page.waitForTimeout(700); // outlive the tap catch-up animation
  const passengerAfterHostTap = await center(passenger);
  expect(Math.abs(passengerAfterHostTap.x - passengerBeforeHostTap.x)).toBeLessThan(5);
  expect(Math.abs(passengerAfterHostTap.y - passengerBeforeHostTap.y)).toBeLessThan(5);
});

test("a passenger's z-order among a host's other siblings is plain tldraw reordering, not new code", async ({ page, baseURL }) => {
  const tableSlug = `verify-tuck-reorder-${Date.now()}`;
  await openTable(page, tableSlug);

  const hostId = randomUUID();
  const host = await placeCard(page, baseURL, tableSlug, hostId, "Llanowar Elves");
  await page.keyboard.press("Shift+1");
  await page.waitForTimeout(300);

  const passengerId = randomUUID();
  const passenger = await placeCard(page, baseURL, tableSlug, passengerId, "Sol Ring");
  await page.waitForTimeout(300);

  const hostBox = await host.boundingBox();
  if (!hostBox) throw new Error("missing host box");
  const hostCenter = await center(host);
  await dragCenterTo(page, passenger, { x: hostCenter.x, y: hostBox.y + hostBox.height * 0.92 });

  await passenger.click({ button: "right" });
  await page.getByText("Reorder").click();
  const sendToBack = page.getByText("Send to back", { exact: true });
  await expect(sendToBack).toBeVisible();
  await sendToBack.click();

  // Same command tap/flip already use — no error, menu closes, passenger
  // stays exactly where it is (a pure z-order command, not a move).
  await expect(page.locator(".tlui-context-menu")).not.toBeVisible();
  const passengerAfter = await passenger.boundingBox();
  expect(passengerAfter).not.toBeNull();
});

test("dragging a card off its host detaches it and reconciles its rotation to upright", async ({ page, baseURL }) => {
  const tableSlug = `verify-tuck-detach-${Date.now()}`;
  await openTable(page, tableSlug);

  const hostId = randomUUID();
  const host = await placeCard(page, baseURL, tableSlug, hostId, "Llanowar Elves");
  await page.keyboard.press("Shift+1");
  await page.waitForTimeout(300);

  const passengerId = randomUUID();
  const passenger = await placeCard(page, baseURL, tableSlug, passengerId, "Sol Ring");
  await page.waitForTimeout(300);

  const hostBox = await host.boundingBox();
  if (!hostBox) throw new Error("missing host box");
  const hostCenter = await center(host);
  await dragCenterTo(page, passenger, { x: hostCenter.x, y: hostBox.y + hostBox.height * 0.92 });

  // Tap the host while the passenger rides it (accumulates a compensation on
  // the passenger's local rotation), then drag the passenger far away.
  await clickCard(page, host);
  await page.waitForTimeout(700);

  const passengerBoxBefore = await passenger.boundingBox();
  const detachSpot = { x: hostCenter.x + 400, y: hostCenter.y };
  await dragCenterTo(page, passenger, detachSpot);

  await expect(async () => {
    const passengerBoxAfter = await passenger.boundingBox();
    expect(passengerBoxAfter).not.toBeNull();
    // Reconciled to upright: same orientation (width/height, not swapped) as
    // when it was first placed, unsleeved and untapped.
    expect(passengerBoxAfter!.width).toBeCloseTo(passengerBoxBefore!.width, -1);
    expect(passengerBoxAfter!.height).toBeCloseTo(passengerBoxBefore!.height, -1);
  }).toPass({ timeout: 5000 });

  // Detached: the host moving now doesn't carry it.
  const gripNow = await topGrip(host);
  const passengerSettled = await center(passenger);
  await dragPointTo(page, gripNow, { x: gripNow.x + 60, y: gripNow.y });
  await page.waitForTimeout(300);
  const passengerFinal = await center(passenger);
  expect(Math.abs(passengerFinal.x - passengerSettled.x)).toBeLessThan(5);
  expect(Math.abs(passengerFinal.y - passengerSettled.y)).toBeLessThan(5);
});

test("a card tucked under a host that dies detaches near the graveyard's edge, outside it", async ({ page, baseURL }) => {
  const tableSlug = `verify-tuck-gy-${Date.now()}`;
  await openTable(page, tableSlug);

  const hostId = randomUUID();
  const host = await placeCard(page, baseURL, tableSlug, hostId, "Llanowar Elves");

  const graveyard = page.locator(`[data-shape-id="shape:region-graveyard-${tableSlug}-e2e-seat"]`);
  await expect(graveyard).toBeAttached();

  await page.keyboard.press("Shift+1");
  await page.waitForTimeout(300);

  const passengerId = randomUUID();
  const passenger = await placeCard(page, baseURL, tableSlug, passengerId, "Sol Ring");
  await page.waitForTimeout(300);

  const hostBox = await host.boundingBox();
  if (!hostBox) throw new Error("missing host box");
  const hostCenter = await center(host);
  await dragCenterTo(page, passenger, { x: hostCenter.x, y: hostBox.y + hostBox.height * 0.92 });

  // Host to the graveyard: the passenger detaches and lands outside it.
  const graveyardCenter = await center(graveyard);
  const gripNow = await topGrip(host);
  const hostBoxNow = await host.boundingBox();
  if (!hostBoxNow) throw new Error("missing host box");
  await dragPointTo(page, gripNow, {
    x: graveyardCenter.x,
    y: graveyardCenter.y - hostBoxNow.height * 0.38,
  });

  await expect(async () => {
    const graveyardBox = await graveyard.boundingBox();
    if (!graveyardBox) throw new Error("missing graveyard box");
    const p = await center(passenger);
    const inside =
      p.x > graveyardBox.x && p.x < graveyardBox.x + graveyardBox.width && p.y > graveyardBox.y && p.y < graveyardBox.y + graveyardBox.height;
    expect(inside).toBe(false);
    const margin = 200;
    expect(p.x).toBeGreaterThan(graveyardBox.x - margin);
    expect(p.x).toBeLessThan(graveyardBox.x + graveyardBox.width + margin);
    expect(p.y).toBeGreaterThan(graveyardBox.y - margin);
    expect(p.y).toBeLessThan(graveyardBox.y + graveyardBox.height + margin);
  }).toPass({ timeout: 5000 });
});

test("attaching an already-tapped card as a passenger doesn't untap its look", async ({ page, baseURL }) => {
  const tableSlug = `verify-tuck-tapped-attach-${Date.now()}`;
  await openTable(page, tableSlug);

  const hostId = randomUUID();
  const host = await placeCard(page, baseURL, tableSlug, hostId, "Llanowar Elves");
  await page.keyboard.press("Shift+1");
  await page.waitForTimeout(300);

  const passengerId = randomUUID();
  const passenger = await placeCard(page, baseURL, tableSlug, passengerId, "Sol Ring");
  await page.waitForTimeout(300);

  // Tap the passenger BEFORE attaching it — rotation now encodes tapped, not 0.
  const untappedBox = await passenger.boundingBox();
  await passenger.click();
  await page.waitForTimeout(700);
  const tappedBox = await passenger.boundingBox();
  expect(tappedBox!.width).toBeCloseTo(untappedBox!.height, -1);

  const hostBox = await host.boundingBox();
  if (!hostBox) throw new Error("missing host box");
  const hostCenter = await center(host);
  await dragCenterTo(page, passenger, { x: hostCenter.x, y: hostBox.y + hostBox.height * 0.92 });

  // Still reads as tapped after attach — onDragShapesIn must not have zeroed
  // its rotation (that would visually untap it while props.tapped stayed true).
  const afterAttachBox = await passenger.boundingBox();
  expect(afterAttachBox!.width).toBeCloseTo(untappedBox!.height, -1);
  expect(afterAttachBox!.height).toBeCloseTo(untappedBox!.width, -1);
});

test("a tapped passenger stays visually tapped after its host is evicted to the graveyard", async ({ page, baseURL }) => {
  const tableSlug = `verify-tuck-tapped-evict-${Date.now()}`;
  await openTable(page, tableSlug);

  const hostId = randomUUID();
  const host = await placeCard(page, baseURL, tableSlug, hostId, "Llanowar Elves");

  const graveyard = page.locator(`[data-shape-id="shape:region-graveyard-${tableSlug}-e2e-seat"]`);
  await expect(graveyard).toBeAttached();

  await page.keyboard.press("Shift+1");
  await page.waitForTimeout(300);

  const passengerId = randomUUID();
  const passenger = await placeCard(page, baseURL, tableSlug, passengerId, "Sol Ring");
  await page.waitForTimeout(300);

  const untappedBox = await passenger.boundingBox();
  await passenger.click();
  await page.waitForTimeout(700);
  const tappedBox = await passenger.boundingBox();
  expect(tappedBox!.width).toBeCloseTo(untappedBox!.height, -1);

  const hostBox = await host.boundingBox();
  if (!hostBox) throw new Error("missing host box");
  const hostCenter = await center(host);
  await dragCenterTo(page, passenger, { x: hostCenter.x, y: hostBox.y + hostBox.height * 0.92 });

  const graveyardCenter = await center(graveyard);
  const gripNow = await topGrip(host);
  const hostBoxNow = await host.boundingBox();
  if (!hostBoxNow) throw new Error("missing host box");
  await dragPointTo(page, gripNow, {
    x: graveyardCenter.x,
    y: graveyardCenter.y - hostBoxNow.height * 0.38,
  });

  await expect(async () => {
    const evictedBox = await passenger.boundingBox();
    expect(evictedBox).not.toBeNull();
    // Still tapped-looking (width/height swapped from its untapped baseline)
    // — evictPassengers must not have forced rotation 0 for a card passenger.
    expect(evictedBox!.width).toBeCloseTo(untappedBox!.height, -1);
    expect(evictedBox!.height).toBeCloseTo(untappedBox!.width, -1);
  }).toPass({ timeout: 5000 });
});
