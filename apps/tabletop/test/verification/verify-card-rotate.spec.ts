import { test, expect } from "@playwright/test";

/**
 * JES-144: clicking a card on the table taps/untaps it — a toggle between
 * 0° and 90°, not a 4-way rotation cycle. Essential slice — rotate only, no
 * menu cleanup or flip yet.
 */
function cardPlayed(overrides: Record<string, unknown>) {
  return {
    id: `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: "card.played",
    occurredAt: new Date().toISOString(),
    initiator: { seatId: "e2e-seat", playerName: "Jess" },
    face: "front",
    imageUrl: "https://cards.scryfall.io/normal/front/6/8/688b73bb-7952-4a1b-a878-49f13cf3ba25.jpg",
    zoneHint: "stack",
    ...overrides,
  };
}

test("clicking a card rotates it 90 degrees", async ({ page, baseURL }) => {
  const tableSlug = `verify-rotate-${Date.now()}`;
  await page.goto(`/t/${tableSlug}`);
  await expect(page.locator(".tl-canvas")).toBeVisible({ timeout: 15000 });

  const instanceId = `rotate-${Date.now()}`;
  const event = cardPlayed({
    cardName: "Llanowar Elves",
    card: { scryfallId: "aaaaaaaa-0000-0000-0000-000000000003", instanceId },
  });
  const response = await page.request.post(`${baseURL}/api/tables/${tableSlug}/cards`, { data: event });
  expect(response.status()).toBe(201);

  const card = page.locator(`#shape\\:card-${instanceId}`);
  await expect(card).toBeAttached();

  const before = await card.boundingBox();
  expect(before).not.toBeNull();

  await card.click();

  // Rotation is a matrix transform on the shape, not a layout change tldraw
  // reflows synchronously — give it a beat before re-measuring.
  await expect(async () => {
    const after = await card.boundingBox();
    expect(after).not.toBeNull();
    // A 90 degree rotation swaps the on-screen bounding box's width and height.
    expect(after!.width).toBeGreaterThan(before!.height * 0.9);
    expect(after!.width).toBeLessThan(before!.height * 1.1);
    expect(after!.height).toBeGreaterThan(before!.width * 0.9);
    expect(after!.height).toBeLessThan(before!.width * 1.1);
    // It rotates around its own center, not a corner — the center point
    // shouldn't move.
    const beforeCenter = { x: before!.x + before!.width / 2, y: before!.y + before!.height / 2 };
    const afterCenter = { x: after!.x + after!.width / 2, y: after!.y + after!.height / 2 };
    expect(afterCenter.x).toBeGreaterThan(beforeCenter.x - 5);
    expect(afterCenter.x).toBeLessThan(beforeCenter.x + 5);
    expect(afterCenter.y).toBeGreaterThan(beforeCenter.y - 5);
    expect(afterCenter.y).toBeLessThan(beforeCenter.y + 5);
  }).toPass({ timeout: 5000 });

  // A second click untaps it — back to the original bounding box — rather
  // than continuing on to 180°. Two clicks inside tldraw's own
  // doubleClickDurationMs (450ms) are treated as a double-click gesture
  // (which just selects the shape) rather than two independent onClick
  // calls, so wait that out first.
  await page.waitForTimeout(500);
  await card.click();
  await expect(async () => {
    const backToStart = await card.boundingBox();
    expect(backToStart).not.toBeNull();
    expect(backToStart!.width).toBeGreaterThan(before!.width * 0.9);
    expect(backToStart!.width).toBeLessThan(before!.width * 1.1);
    expect(backToStart!.height).toBeGreaterThan(before!.height * 0.9);
    expect(backToStart!.height).toBeLessThan(before!.height * 1.1);
  }).toPass({ timeout: 5000 });
});
