import { test, expect } from "@playwright/test";

/**
 * Reproduces a reported bug: after dragging card A, dragging a DIFFERENT card
 * B instead moves card A again. Two non-overlapping lands (battlefield
 * zoneHint) land side-by-side (see cardLayout.landPosition), so there's no
 * ambiguity about which card is under the pointer.
 */
function cardPlayed(overrides: Record<string, unknown>) {
  return {
    id: `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: "card.played",
    occurredAt: new Date().toISOString(),
    initiator: { seatId: "e2e-seat", playerName: "Jess" },
    face: "front",
    frontImageUrl: "https://cards.scryfall.io/normal/front/6/8/688b73bb-7952-4a1b-a878-49f13cf3ba25.jpg",
    backImageUrl: null,
    zoneHint: "battlefield",
    ...overrides,
  };
}

async function dragBy(page: import("@playwright/test").Page, from: { x: number; y: number }, dx: number, dy: number) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  // Multiple intermediate moves so tldraw's drag-threshold detection treats
  // this as a drag (translate), not a click.
  await page.mouse.move(from.x + dx / 2, from.y + dy / 2, { steps: 5 });
  await page.mouse.move(from.x + dx, from.y + dy, { steps: 5 });
  await page.mouse.up();
}

test("dragging card B does not move card A again", async ({ page, baseURL }) => {
  const tableSlug = `verify-drag-id-${Date.now()}`;
  await page.goto(`/t/${tableSlug}`);
  await expect(page.locator(".tl-canvas")).toBeVisible({ timeout: 15000 });

  const cardA = cardPlayed({
    cardName: "Forest",
    card: { scryfallId: "aaaaaaaa-0000-0000-0000-000000000001", instanceId: `card-a-${Date.now()}` },
  });
  const cardB = cardPlayed({
    cardName: "Island",
    card: { scryfallId: "aaaaaaaa-0000-0000-0000-000000000002", instanceId: `card-b-${Date.now()}` },
  });

  for (const event of [cardA, cardB]) {
    const response = await page.request.post(`${baseURL}/api/tables/${tableSlug}/cards`, { data: event });
    expect(response.status()).toBe(201);
  }

  // Cards land far from the canvas origin (see cardLayout.ts); zoom-to-fit so
  // both are actually laid out/visible (tldraw culls offscreen shapes, which
  // otherwise makes boundingBox() null).
  await page.getByRole("button", { name: /^\d+%$/ }).click();
  await page.getByRole("menuitem", { name: /zoom to fit/i }).click();
  await page.waitForTimeout(500);

  const shapeA = page.locator(`#shape\\:card-${cardA.card.instanceId}`);
  const shapeB = page.locator(`#shape\\:card-${cardB.card.instanceId}`);
  await expect(shapeA).toBeAttached();
  await expect(shapeB).toBeAttached();

  console.log("shapeA outerHTML", await shapeA.evaluate((el) => el.outerHTML).catch((e) => String(e)));
  console.log(
    "shapeA ancestors",
    await shapeA.evaluate((el) => {
      const out: string[] = [];
      let node: HTMLElement | null = el as HTMLElement;
      for (let i = 0; i < 6 && node; i++) {
        out.push(`${node.tagName}.${node.className} style="${node.getAttribute("style")}"`);
        node = node.parentElement;
      }
      return out.join(" | ");
    }).catch((e) => String(e))
  );
  const aBefore = await shapeA.boundingBox();
  const bBefore = await shapeB.boundingBox();
  expect(aBefore).not.toBeNull();
  expect(bBefore).not.toBeNull();

  // Step 1: drag card A somewhere else.
  const aCenter = { x: aBefore!.x + aBefore!.width / 2, y: aBefore!.y + aBefore!.height / 2 };
  await dragBy(page, aCenter, 250, 150);

  const aAfterFirstDrag = await shapeA.boundingBox();
  expect(aAfterFirstDrag).not.toBeNull();
  // Sanity: A actually moved.
  expect(Math.abs(aAfterFirstDrag!.x - aBefore!.x)).toBeGreaterThan(50);

  // Step 2: drag card B (never touched yet) somewhere else.
  const bCenter = { x: bBefore!.x + bBefore!.width / 2, y: bBefore!.y + bBefore!.height / 2 };
  await dragBy(page, bCenter, -80, 200);

  const aAfterSecondDrag = await shapeA.boundingBox();
  const bAfterSecondDrag = await shapeB.boundingBox();
  expect(aAfterSecondDrag).not.toBeNull();
  expect(bAfterSecondDrag).not.toBeNull();

  // Card A should NOT have moved again from dragging card B.
  expect(Math.abs(aAfterSecondDrag!.x - aAfterFirstDrag!.x)).toBeLessThan(5);
  expect(Math.abs(aAfterSecondDrag!.y - aAfterFirstDrag!.y)).toBeLessThan(5);

  // Card B should have moved.
  expect(Math.abs(bAfterSecondDrag!.x - bBefore!.x)).toBeGreaterThan(50);
});
