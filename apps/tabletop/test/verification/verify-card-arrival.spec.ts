import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";

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
    origin: "shuffler.playCardSubmit",
    significance: "domain",
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

test("a land and a nonland both arrive on the Stack", async ({ page, baseURL }) => {
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

  const cardShapes = page.locator(`.tl-shape[data-shape-type="mtg-card"]`);
  await expect(cardShapes).toHaveCount(2, { timeout: 10000 });
  const landShape = page.locator(`#shape\\:card-${land.payload.card.instanceId}`);
  const nonlandShape = page.locator(`#shape\\:card-${nonland.payload.card.instanceId}`);
  await expect(landShape).toBeAttached();
  await expect(nonlandShape).toBeAttached();

  const stack = page.locator(`[data-shape-id="shape:region-stack-${tableSlug}"]`);
  await expect(stack).toBeAttached();
  const stackBox = await stack.boundingBox();
  const landBox = await landShape.boundingBox();
  if (!stackBox || !landBox) throw new Error("missing bounding box");
  expect(landBox.x).toBeGreaterThanOrEqual(stackBox.x);
  expect(landBox.y).toBeGreaterThanOrEqual(stackBox.y);
  expect(landBox.x + landBox.width).toBeLessThanOrEqual(stackBox.x + stackBox.width);
  expect(landBox.y + landBox.height).toBeLessThanOrEqual(stackBox.y + stackBox.height);
});
