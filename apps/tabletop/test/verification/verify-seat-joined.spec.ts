import { test, expect } from "@playwright/test";

/**
 * JES-140: seat.joined draws a full player area (playmat, library, graveyard,
 * exile, name label) before any card is played, and the shared Stack strip
 * widens as a second seat joins.
 */
function seatJoined(overrides: Record<string, unknown>) {
  return {
    id: `e2e-seat-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: "seat.joined",
    occurredAt: new Date().toISOString(),
    playmatImageUrl: "https://example.com/e2e-playmat.png",
    cardBackImageUrl: "https://example.com/e2e-card-back.jpg",
    ...overrides,
  };
}

async function widestGeoShapeWidth(page: import("@playwright/test").Page): Promise<number> {
  const geoShapes = page.locator(`.tl-shape[data-shape-type="geo"]`);
  const count = await geoShapes.count();
  let widest = 0;
  for (let i = 0; i < count; i++) {
    const box = await geoShapes.nth(i).boundingBox();
    if (box) widest = Math.max(widest, box.width);
  }
  return widest;
}

test("a player area appears before any card, and the Stack widens for a second seat", async ({ page, baseURL }) => {
  const tableSlug = `verify-seat-joined-${Date.now()}`;
  await page.goto(`/t/${tableSlug}`);
  await expect(page.locator(".tl-canvas")).toBeVisible({ timeout: 15000 });

  const first = seatJoined({ initiator: { seatId: `e2e-seat-a-${Date.now()}`, playerName: "Jess" } });
  const firstResponse = await page.request.post(`${baseURL}/api/tables/${tableSlug}/events`, { data: first });
  expect(firstResponse.status()).toBe(201);

  // Player area furniture (playmat outline + graveyard + exile) plus the
  // Stack strip render as geo shapes; the playmat/library images and the name
  // label render too — all before any card is posted.
  const geoShapes = page.locator(`.tl-shape[data-shape-type="geo"]`);
  await expect(geoShapes).toHaveCount(4, { timeout: 10000 }); // mat outline, graveyard, exile, stack
  const imageShapes = page.locator(`.tl-shape[data-shape-type="image"]`);
  await expect(imageShapes).toHaveCount(2); // playmat picture, library card back
  const textShapes = page.locator(`.tl-shape[data-shape-type="text"]`);
  await expect(textShapes).toHaveCount(1); // name label

  const widestBefore = await widestGeoShapeWidth(page);

  const second = seatJoined({ initiator: { seatId: `e2e-seat-b-${Date.now()}`, playerName: "Sam" } });
  const secondResponse = await page.request.post(`${baseURL}/api/tables/${tableSlug}/events`, { data: second });
  expect(secondResponse.status()).toBe(201);

  await expect(textShapes).toHaveCount(2, { timeout: 10000 });
  await expect(geoShapes).toHaveCount(7); // two player areas' furniture (3 each) + one shared stack
  await expect(imageShapes).toHaveCount(4);

  // The Stack strip is the widest geo shape (it spans every player area), and
  // it widened rather than staying the same size.
  const widestAfter = await widestGeoShapeWidth(page);
  expect(widestAfter).toBeGreaterThan(widestBefore);
});
