import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { openTable, placeCard, zoomToFit, center, dragPointTo } from "./helpers";

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

function overlapFraction(a: Box, b: Box): number {
  const overlapW = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const overlapH = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return (overlapW * overlapH) / (a.width * a.height);
}

test("dragging a card square onto another card already on the Stack nudges it right so both show", async ({
  page,
  baseURL,
}) => {
  const tableSlug = `verify-stack-nudge-${Date.now()}`;
  await openTable(page, tableSlug);

  const resident = await placeCard(page, baseURL, tableSlug, randomUUID(), { cardName: "Llanowar Elves" });
  const incoming = await placeCard(page, baseURL, tableSlug, randomUUID(), { cardName: "Elvish Mystic" });

  await zoomToFit(page);

  const residentBox = await resident.boundingBox();
  if (!residentBox) throw new Error("missing bounding box");

  // Drag the incoming card's center square onto the resident's center — a direct hit.
  await dragPointTo(page, await center(incoming), await center(resident));
  await page.waitForTimeout(300);

  const incomingBoxAfter = await incoming.boundingBox();
  if (!incomingBoxAfter) throw new Error("missing bounding box after drop");

  // The two cards no longer fully hide one another...
  expect(overlapFraction(incomingBoxAfter, residentBox)).toBeLessThan(0.6);
  // ...because the incoming card was nudged right off the drop point.
  expect(incomingBoxAfter.x).toBeGreaterThan(residentBox.x + 5);
});
