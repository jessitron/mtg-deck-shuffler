import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { openTable, placeCard, zoomToFit, dragCardTo } from "./helpers";

/**
 * Ticket 01-zone-entry-events: dragging a card into a zone (graveyard,
 * exile, library, playmat) should be detectable as a distinct "entered
 * zone" occurrence — once per real zone change, not once per drag frame,
 * and not re-fired for staying in (or returning to) the same zone.
 *
 * Descoped 2026-08-06 (Jess): no callback/emitter yet — the whole
 * notification surface for now is a `console.log` from the card shape's
 * `onTranslateEnd`. This test drives real mouse drags in the browser and
 * asserts on captured console output, so it needs no human watching the
 * canvas or reading logs by eye.
 */
function zoneEntryLogs(messages: string[]): Array<{ instanceId: string; zone: string }> {
  return messages
    .map((m) => /^zone-entry (\S+) (\S+)$/.exec(m))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => ({ instanceId: m[1], zone: m[2] }));
}

test("dragging a card into a zone logs zone entry exactly once", async ({ page, baseURL }) => {
  const tableSlug = `verify-zone-${Date.now()}`;
  const consoleMessages: string[] = [];
  page.on("console", (msg) => consoleMessages.push(msg.text()));

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

  consoleMessages.length = 0;
  await dragCardTo(page, card, graveyard);

  await expect(async () => {
    const entries = zoneEntryLogs(consoleMessages);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({ instanceId, zone: "graveyard" });
  }).toPass({ timeout: 5000 });

  // Dragging within the same zone (a small nudge, still inside the
  // graveyard's bounds) must not re-fire.
  consoleMessages.length = 0;
  const graveyardBox = await page.locator(graveyard).boundingBox();
  const cardBox = await card.boundingBox();
  if (!graveyardBox || !cardBox) throw new Error("missing bounding box");
  await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(cardBox.x + cardBox.width / 2 + 15, cardBox.y + cardBox.height / 2 + 15, { steps: 5 });
  await page.mouse.up();

  await page.waitForTimeout(300);
  expect(zoneEntryLogs(consoleMessages)).toHaveLength(0);

  // Dragging straight from the graveyard to the exile in one motion logs
  // exactly once, naming the destination zone.
  consoleMessages.length = 0;
  await dragCardTo(page, card, exile);

  await expect(async () => {
    const entries = zoneEntryLogs(consoleMessages);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({ instanceId, zone: "exile" });
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
