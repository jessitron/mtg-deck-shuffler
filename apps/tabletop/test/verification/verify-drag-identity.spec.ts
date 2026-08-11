import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { openTable, placeCard, zoomToFit, dragBy } from "./helpers";

test("dragging the second card moves the second card, not the first", async ({ page, baseURL }) => {
  const tableSlug = `verify-drag-identity-${Date.now()}`;

  await openTable(page, tableSlug);

  const firstCard = await placeCard(page, baseURL, tableSlug, randomUUID(), {
    cardName: "Forest",
    zoneHint: "battlefield",
  });
  const secondCard = await placeCard(page, baseURL, tableSlug, randomUUID(), {
    cardName: "Island",
    zoneHint: "battlefield",
  });

  await zoomToFit(page);

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

  const firstAfterSecondDrag = await firstCard.boundingBox();
  expect(firstAfterSecondDrag).not.toBeNull();
  expect(Math.abs(firstAfterSecondDrag!.x - firstAfterFirstDrag.x)).toBeLessThan(5);
  expect(Math.abs(firstAfterSecondDrag!.y - firstAfterFirstDrag.y)).toBeLessThan(5);
});
