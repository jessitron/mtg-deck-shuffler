import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";

/**
 * A5: cards POSTed to the arrival API appear on the canvas — a land
 * (zoneHint battlefield) and a nonland (zoneHint stack) in different areas.
 *
 * Since tabletop-cards-come-and-go ticket 05, the body posted is a real
 * envelope (contracts/envelope.v1.json) carrying a card.played payload
 * (contracts/payloads/card.played.v1.json).
 */
function fakeTraceparent(): string {
  return `00-${randomUUID().replace(/-/g, "")}-${randomUUID().replace(/-/g, "").slice(0, 16)}-01`;
}

function cardPlayed(tableId: string, payloadOverrides: Record<string, unknown>) {
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
      owner: "e2e-seat",
      isCommander: false,
      ...payloadOverrides,
    },
  };
}

test("a land and a nonland arrive in different areas of the canvas", async ({ page, baseURL }) => {
  const tableSlug = `verify-arrival-${Date.now()}`;
  await page.goto(`/t/${tableSlug}`);
  await expect(page.locator(".tl-canvas")).toBeVisible({ timeout: 15000 });

  const land = cardPlayed(tableSlug, {
    zoneHint: "battlefield",
    cardName: "Forest",
    card: { scryfallId: "aaaaaaaa-1111-4111-8111-000000000001", instanceId: randomUUID() },
  });
  const nonland = cardPlayed(tableSlug, {
    zoneHint: "stack",
    cardName: "Llanowar Elves",
    card: { scryfallId: "aaaaaaaa-1111-4111-8111-000000000002", instanceId: randomUUID() },
  });

  for (const event of [land, nonland]) {
    const response = await page.request.post(`${baseURL}/api/tables/${tableSlug}/cards`, { data: event });
    expect(response.status()).toBe(201);
  }

  // Both cards render as mtg-card shapes on the live canvas (no reload
  // needed — they arrive over the websocket sync), identified by their
  // deterministic shape ids. Exact placement (land on the playmat vs.
  // everything else on the Stack) is covered by cardArrival.test.ts against
  // the room's tldraw snapshot directly — the player area (JES-140) is now
  // big enough that a land far from the origin only gets its inner <img>
  // lazily mounted by tldraw once in view, so this doesn't assert on that
  // inner element.
  const cardShapes = page.locator(`.tl-shape[data-shape-type="mtg-card"]`);
  await expect(cardShapes).toHaveCount(2, { timeout: 10000 });
  await expect(page.locator(`#shape\\:card-${land.payload.card.instanceId}`)).toBeAttached();
  await expect(page.locator(`#shape\\:card-${nonland.payload.card.instanceId}`)).toBeAttached();
});
