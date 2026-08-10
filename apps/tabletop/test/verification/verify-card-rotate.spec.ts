import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { openTable, placeCard } from "./helpers";

/**
 * Clicking a card on the table taps/untaps it — a toggle between 0° and 90°,
 * not a 4-way rotation cycle. The tap's rotation ANIMATION is covered
 * separately in verify-tap-animation.spec.ts (tabletop-physics ticket 15).
 */
test("clicking a card rotates it 90 degrees", async ({ page, baseURL }) => {
  const tableSlug = `verify-rotate-${Date.now()}`;
  await openTable(page, tableSlug);

  const instanceId = randomUUID();
  const card = await placeCard(page, baseURL, tableSlug, instanceId);

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
