import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { openTable, placeCard } from "./helpers";

test("clicking a card rotates it 90 degrees", async ({ page, baseURL }) => {
  const tableSlug = `verify-rotate-${Date.now()}`;
  await openTable(page, tableSlug);

  const instanceId = randomUUID();
  const card = await placeCard(page, baseURL, tableSlug, instanceId);

  const before = await card.boundingBox();
  expect(before).not.toBeNull();

  await card.click();

  await expect(async () => {
    const after = await card.boundingBox();
    expect(after).not.toBeNull();
    // A 90 degree rotation swaps the on-screen bounding box's width and height.
    expect(after!.width).toBeGreaterThan(before!.height * 0.9);
    expect(after!.width).toBeLessThan(before!.height * 1.1);
    expect(after!.height).toBeGreaterThan(before!.width * 0.9);
    expect(after!.height).toBeLessThan(before!.width * 1.1);
    const beforeCenter = { x: before!.x + before!.width / 2, y: before!.y + before!.height / 2 };
    const afterCenter = { x: after!.x + after!.width / 2, y: after!.y + after!.height / 2 };
    expect(afterCenter.x).toBeGreaterThan(beforeCenter.x - 5);
    expect(afterCenter.x).toBeLessThan(beforeCenter.x + 5);
    expect(afterCenter.y).toBeGreaterThan(beforeCenter.y - 5);
    expect(afterCenter.y).toBeLessThan(beforeCenter.y + 5);
  }).toPass({ timeout: 5000 });

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
