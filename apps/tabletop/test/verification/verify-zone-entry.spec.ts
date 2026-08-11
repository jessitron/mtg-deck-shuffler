import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { openTable, placeCard, zoomToFit, dragCardTo } from "./helpers";

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

  const graveyard = `[data-shape-id="shape:region-graveyard-${tableSlug}-e2e-seat"]`;
  const exile = `[data-shape-id="shape:region-exile-${tableSlug}-e2e-seat"]`;
  await expect(page.locator(graveyard)).toBeAttached();
  await expect(page.locator(exile)).toBeAttached();

  await zoomToFit(page);

  const cardShape = `#shape\\:card-${instanceId}`;

  await dragCardTo(page, card, graveyard);
  await expect(async () => {
    expect(await isCenteredIn(page, cardShape, graveyard)).toBe(true);
  }).toPass({ timeout: 5000 });

  const cardBox = await card.boundingBox();
  if (!cardBox) throw new Error("missing bounding box");
  await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(cardBox.x + cardBox.width / 2 + 15, cardBox.y + cardBox.height / 2 + 15, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  expect(await isCenteredIn(page, cardShape, graveyard)).toBe(true);

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
