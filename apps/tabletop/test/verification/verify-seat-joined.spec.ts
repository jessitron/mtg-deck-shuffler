import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";

/**
 * JES-140: seat.joined draws a full player area (playmat, library, command
 * zone, graveyard, exile, name label) before any card is played. The shared
 * Stack is a fixed-size square centered on the board (ticket 14, the square)
 * — it does not move or resize as a second seat joins.
 *
 * Since tabletop-cards-come-and-go ticket 05, the body posted is a real
 * envelope (contracts/envelope.v1.json) carrying a seat.joined payload
 * (contracts/payloads/seat.joined.v1.json).
 */
function fakeTraceparent(): string {
  return `00-${randomUUID().replace(/-/g, "")}-${randomUUID().replace(/-/g, "").slice(0, 16)}-01`;
}

function seatJoined(tableId: string, initiator: { seatId: string; playerName: string }) {
  return {
    id: randomUUID(),
    tableId,
    name: "seat.joined",
    occurredAt: new Date().toISOString(),
    initiator,
    occurredIn: "shuffler",
    visibility: "public",
    traceparent: fakeTraceparent(),
    schemaVersion: 1,
    payload: {
      deckName: "E2E Deck",
      playmatImageUrl: "https://example.com/e2e-playmat.png",
      cardBackImageUrl: "https://example.com/e2e-card-back.jpg",
    },
  };
}

test("a player area appears before any card, and the Stack stays fixed as a second seat joins", async ({ page, baseURL }) => {
  const tableSlug = `verify-seat-joined-${Date.now()}`;
  await page.goto(`/t/${tableSlug}`);
  await expect(page.locator(".tl-canvas")).toBeVisible({ timeout: 15000 });

  const first = seatJoined(tableSlug, { seatId: `e2e-seat-a-${Date.now()}`, playerName: "Jess" });
  const firstResponse = await page.request.post(`${baseURL}/api/tables/${tableSlug}/events`, { data: first });
  expect(firstResponse.status()).toBe(201);

  // Player area furniture (playmat outline + library outline + command zone +
  // graveyard + exile) plus the Stack square render as mtg-zone shapes; the
  // playmat/library images and the name label render too — all before any
  // card is posted.
  const zoneShapes = page.locator(`.tl-shape[data-shape-type="mtg-zone"]`);
  await expect(zoneShapes).toHaveCount(6, { timeout: 10000 }); // mat, library, command zone, graveyard, exile, stack
  const imageShapes = page.locator(`.tl-shape[data-shape-type="image"]`);
  await expect(imageShapes).toHaveCount(2); // playmat picture, library card back
  const textShapes = page.locator(`.tl-shape[data-shape-type="text"]`);
  await expect(textShapes).toHaveCount(1); // name label

  const stackShape = zoneShapes.filter({ hasText: "The Stack" });
  const stackBefore = await stackShape.boundingBox();
  expect(stackBefore).not.toBeNull();

  const second = seatJoined(tableSlug, { seatId: `e2e-seat-b-${Date.now()}`, playerName: "Sam" });
  const secondResponse = await page.request.post(`${baseURL}/api/tables/${tableSlug}/events`, { data: second });
  expect(secondResponse.status()).toBe(201);

  await expect(textShapes).toHaveCount(2, { timeout: 10000 });
  await expect(zoneShapes).toHaveCount(11); // two player areas' furniture (5 each) + one shared stack
  await expect(imageShapes).toHaveCount(4);

  // The Stack is fixed: same footprint and position at two seats as at one.
  const stackAfter = await stackShape.boundingBox();
  expect(stackAfter).toEqual(stackBefore);
});
