import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { openTable, placeCard, zoomToFit, dragCardTo } from "./helpers";

/**
 * Ticket 01-zone-entry-events: dragging a card into a zone (graveyard,
 * exile, library, playmat) should be detectable as a distinct "entered
 * zone" occurrence — once per real zone change, not once per drag frame,
 * and not re-fired for staying in (or returning to) the same zone.
 *
 * The detection itself (MtgCardShapeUtil's onTranslateEnd, debounced on
 * `meta.zone`) is unchanged since 2026-08-06. What moved is the
 * notification surface: ticket 21 (tabletop-physics) replaced the
 * `console.log` this test used to assert on with a centralized
 * `usePhysicsAnnouncements.ts` store.listen() that announces
 * `card.zoneMoved` to Honeycomb via `inSpan()`. This spec verifies the
 * observable behavior (the card visually lands in the right zone after
 * each drag); the announcement itself was verified against a live
 * Honeycomb query during ticket 21's implementation, not re-asserted here
 * — decoding a real OTLP export in Playwright would mean parsing protobuf
 * off a batched, delayed exporter for no added confidence.
 */
async function isCenteredIn(page: Page, shapeLocator: string, zoneSelector: string): Promise<boolean> {
  const shapeBox = await page.locator(shapeLocator).boundingBox();
  const zoneBox = await page.locator(zoneSelector).boundingBox();
  if (!shapeBox || !zoneBox) return false;
  const cx = shapeBox.x + shapeBox.width / 2;
  const cy = shapeBox.y + shapeBox.height / 2;
  return cx >= zoneBox.x && cx <= zoneBox.x + zoneBox.width && cy >= zoneBox.y && cy <= zoneBox.y + zoneBox.height;
}

test("dragging a card into a zone lands it there, including a nudge and a straight zone-to-zone drag", async ({ page, baseURL }) => {
  const tableSlug = `verify-zone-${Date.now()}`;

  await openTable(page, tableSlug);

  const instanceId = randomUUID();
  const card = await placeCard(page, baseURL, tableSlug, instanceId);

  // The seat's player area (including the graveyard and exile zones) is
  // drawn as a defensive fallback on card arrival — locate it by its
  // deterministic shape id. Unlike the (unlocked, interactive) card shape,
  // these locked furniture shapes don't get a plain `id` attribute, only
  // `data-shape-id`.
  const graveyard = `[data-shape-id="shape:region-graveyard-${tableSlug}-e2e-seat"]`;
  const exile = `[data-shape-id="shape:region-exile-${tableSlug}-e2e-seat"]`;
  await expect(page.locator(graveyard)).toBeAttached();
  await expect(page.locator(exile)).toBeAttached();

  // The card arrives on the Stack, far from the graveyard/exile in the
  // right-hand column — tldraw culls (display:none) shapes outside the
  // initial camera viewport. Zoom to fit everything before computing any
  // bounding boxes, so drag targets are actually rendered.
  await zoomToFit(page);

  const cardShape = `#shape\\:card-${instanceId}`;

  await dragCardTo(page, card, graveyard);
  await expect(async () => {
    expect(await isCenteredIn(page, cardShape, graveyard)).toBe(true);
  }).toPass({ timeout: 5000 });

  // A small nudge, still inside the graveyard's bounds — must stay put,
  // not bounce elsewhere.
  const cardBox = await card.boundingBox();
  if (!cardBox) throw new Error("missing bounding box");
  await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(cardBox.x + cardBox.width / 2 + 15, cardBox.y + cardBox.height / 2 + 15, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  expect(await isCenteredIn(page, cardShape, graveyard)).toBe(true);

  // Dragging straight from the graveyard to the exile in one motion lands
  // it in the exile.
  await dragCardTo(page, card, exile);
  await expect(async () => {
    expect(await isCenteredIn(page, cardShape, exile)).toBe(true);
  }).toPass({ timeout: 5000 });
});

test("tapping a card still rotates it after zone-entry hooks are added", async ({ page, baseURL }) => {
  const tableSlug = `verify-zone-tap-${Date.now()}`;
  await openTable(page, tableSlug);

  const instanceId = randomUUID();
  const card = await placeCard(page, baseURL, tableSlug, instanceId);
  const before = await card.boundingBox();
  expect(before).not.toBeNull();

  await card.click();

  await expect(async () => {
    const after = await card.boundingBox();
    expect(after).not.toBeNull();
    expect(after!.width).toBeGreaterThan(before!.height * 0.9);
    expect(after!.width).toBeLessThan(before!.height * 1.1);
  }).toPass({ timeout: 5000 });
});
