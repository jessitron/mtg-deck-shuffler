import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { openTable, placeCard, zoomToFit, dragBy } from "./helpers";

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
test("dragging the second card moves the second card, not the first", async ({ page, baseURL }) => {
  const tableSlug = `verify-drag-identity-${Date.now()}`;

  await openTable(page, tableSlug);

  // Two lands, far enough apart on the playmat that they never overlap —
  // isolating the selection-state bug from any z-order/overlap concern.
  // zoneHint "battlefield" matters here: "stack" would stack both cards at
  // the same position, making click-selecting the second card ambiguous.
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

  // ...and the first card must NOT have moved again — it should still be
  // right where the first drag left it.
  const firstAfterSecondDrag = await firstCard.boundingBox();
  expect(firstAfterSecondDrag).not.toBeNull();
  expect(Math.abs(firstAfterSecondDrag!.x - firstAfterFirstDrag.x)).toBeLessThan(5);
  expect(Math.abs(firstAfterSecondDrag!.y - firstAfterFirstDrag.y)).toBeLessThan(5);
});
