import { test, expect, Page } from "@playwright/test";

/**
 * Bug repro (found 2026-08-07): play two cards, drag one, then drag the
 * OTHER (still-unmoved) card — the card actually under the pointer must
 * move, not whichever card was dragged previously.
 *
 * Root cause: MtgCardImageShapeUtil defines `onClick` (for tap/untap), which
 * makes tldraw's SelectTool defer selecting the pointed-at shape until
 * pointer-up (see PointingShape.onEnter in
 * node_modules/tldraw/src/lib/tools/SelectTool/childStates/PointingShape.ts).
 * Its drag-start safety net (`startTranslating`) only force-reselects the
 * actually-hit shape when nothing is currently selected — but tldraw leaves
 * the just-dragged card selected after a drag ends, so the guard is skipped
 * and the SECOND drag silently re-translates the FIRST (still-selected)
 * card instead of the one under the pointer. Fixed by clearing selection in
 * onTranslateEnd.
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

async function dragBy(page: Page, card: ReturnType<Page["locator"]>, dx: number, dy: number) {
  const box = await card.boundingBox();
  if (!box) throw new Error("missing bounding box");
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + dx, startY + dy, { steps: 10 });
  await page.mouse.up();
}

test("dragging the second card moves the second card, not the first", async ({ page, baseURL }) => {
  const tableSlug = `verify-drag-identity-${Date.now()}`;

  // Two lands, far enough apart on the playmat that they never overlap —
  // isolating the selection-state bug from any z-order/overlap concern.
  const first = cardPlayed({
    cardName: "Forest",
    zoneHint: "battlefield",
    card: { scryfallId: "aaaaaaaa-0000-0000-0000-000000000006", instanceId: `first-${Date.now()}` },
  });
  const second = cardPlayed({
    cardName: "Island",
    zoneHint: "battlefield",
    card: { scryfallId: "aaaaaaaa-0000-0000-0000-000000000007", instanceId: `second-${Date.now()}` },
  });

  await page.goto(`/t/${tableSlug}`);
  await expect(page.locator(".tl-canvas")).toBeVisible({ timeout: 15000 });

  for (const event of [first, second]) {
    const response = await page.request.post(`${baseURL}/api/tables/${tableSlug}/cards`, { data: event });
    expect(response.status()).toBe(201);
  }

  const firstCard = page.locator(`#shape\\:card-${first.card.instanceId}`);
  const secondCard = page.locator(`#shape\\:card-${second.card.instanceId}`);
  await expect(firstCard).toBeAttached();
  await expect(secondCard).toBeAttached();

  await page.keyboard.press("Shift+1");
  await page.waitForTimeout(300);

  const secondBefore = await secondCard.boundingBox();
  if (!secondBefore) throw new Error("missing bounding box");

  // Step 2: move the first card somewhere else.
  await dragBy(page, firstCard, 200, 150);
  await expect(async () => {
    const firstAfterMove = await firstCard.boundingBox();
    expect(firstAfterMove).not.toBeNull();
  }).toPass({ timeout: 5000 });
  const firstAfterFirstDrag = await firstCard.boundingBox();
  if (!firstAfterFirstDrag) throw new Error("missing bounding box");

  // Step 3: drag the SECOND (still-unmoved) card.
  await dragBy(page, secondCard, -120, 90);

  await expect(async () => {
    const secondAfter = await secondCard.boundingBox();
    expect(secondAfter).not.toBeNull();
    // The second card must have moved from its original spot...
    expect(Math.abs(secondAfter!.x - secondBefore.x)).toBeGreaterThan(50);
  }).toPass({ timeout: 5000 });

  // ...and the first card must NOT have moved again — it should still be
  // right where the first drag left it.
  const firstAfterSecondDrag = await firstCard.boundingBox();
  expect(firstAfterSecondDrag).not.toBeNull();
  expect(Math.abs(firstAfterSecondDrag!.x - firstAfterFirstDrag.x)).toBeLessThan(5);
  expect(Math.abs(firstAfterSecondDrag!.y - firstAfterFirstDrag.y)).toBeLessThan(5);
});
