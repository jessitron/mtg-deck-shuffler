import { test, expect } from "@playwright/test";

/**
 * A5: cards POSTed to the arrival API appear on the canvas — a land
 * (zoneHint battlefield) and a nonland (zoneHint stack) in different areas.
 */
function cardPlayed(overrides: Record<string, unknown>) {
  return {
    id: `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: "card.played",
    occurredAt: new Date().toISOString(),
    initiator: { seatId: "e2e-seat", playerName: "Jess" },
    face: "front",
    imageUrl: "https://cards.scryfall.io/normal/front/6/8/688b73bb-7952-4a1b-a878-49f13cf3ba25.jpg",
    ...overrides,
  };
}

test("a land and a nonland arrive in different areas of the canvas", async ({ page, baseURL }) => {
  const tableSlug = `verify-arrival-${Date.now()}`;
  await page.goto(`/t/${tableSlug}`);
  await expect(page.locator(".tl-canvas")).toBeVisible({ timeout: 15000 });

  const land = cardPlayed({
    zoneHint: "battlefield",
    cardName: "Forest",
    card: { scryfallId: "aaaaaaaa-0000-0000-0000-000000000001", instanceId: `land-${Date.now()}` },
  });
  const nonland = cardPlayed({
    zoneHint: "stack",
    cardName: "Llanowar Elves",
    card: { scryfallId: "aaaaaaaa-0000-0000-0000-000000000002", instanceId: `spell-${Date.now()}` },
  });

  for (const event of [land, nonland]) {
    const response = await page.request.post(`${baseURL}/api/tables/${tableSlug}/cards`, { data: event });
    expect(response.status()).toBe(201);
  }

  // Both cards render as image shapes on the live canvas (no reload needed —
  // they arrive over the websocket sync), identified by their deterministic
  // shape ids. Exact placement (land on the playmat vs. everything else on
  // the Stack) is covered by cardArrival.test.ts against the room's tldraw
  // snapshot directly — the player area (JES-140) is now big enough that a
  // land far from the origin only gets its inner <img> lazily mounted by
  // tldraw once in view, so this doesn't assert on that inner element.
  const cardShapes = page.locator(`.tl-shape[data-shape-type="image"]`);
  await expect(cardShapes).toHaveCount(2, { timeout: 10000 });
  await expect(page.locator(`#shape\\:card-${land.card.instanceId}`)).toBeAttached();
  await expect(page.locator(`#shape\\:card-${nonland.card.instanceId}`)).toBeAttached();
});
