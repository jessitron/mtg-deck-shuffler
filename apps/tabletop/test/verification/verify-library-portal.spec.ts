import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { openTable, placeCard, joinSeat, zoomToFit, center, dragPointTo } from "./helpers";

// Ticket 12's own checklist also wants "see it land in the Shuffler's Reveal zone" — not
// checkable yet: that requires shuffler-spine-sse-subscriber issue 03 (the Shuffler's own
// Spine SSE subscriber), which is a separate, unbuilt ticket. What's verified here instead:
// the card actually leaves the Tabletop table, which only happens once the Tabletop
// server's `card.returned` POST gets a confirmed 2xx (send-then-commit) — the fake Spine
// in globalSetup.ts stands in for that confirmation.

const libraryLocator = (tableSlug: string, seatId: string) => `[data-shape-id="shape:library-${tableSlug}-${seatId}"]`;
const cardLocator = (instanceId: string) => `#shape\\:card-${instanceId}`;

test("dragging a card onto your own library arms it, then swallows it", async ({ page, baseURL }) => {
  const tableSlug = `verify-portal-${Date.now()}`;
  await openTable(page, tableSlug);

  const instanceId = randomUUID();
  const card = await placeCard(page, baseURL, tableSlug, instanceId, { gameCardIndex: 0 });
  await zoomToFit(page);

  const library = page.locator(libraryLocator(tableSlug, "e2e-seat"));
  await expect(library).toBeAttached();

  const cardStart = await center(card);
  const libraryCenter = await center(library);

  await page.mouse.move(cardStart.x, cardStart.y);
  await page.mouse.down();
  await page.mouse.move(libraryCenter.x, libraryCenter.y, { steps: 10 });

  await expect(page.getByTestId("portal-arming")).toBeAttached();

  await page.mouse.up();

  await expect(page.getByTestId("portal-arming")).not.toBeAttached();
  await expect(page.locator(cardLocator(instanceId))).not.toBeAttached({ timeout: 5000 });
});

test("dragging a multi-selection onto the library swallows the whole group", async ({ page, baseURL }) => {
  const tableSlug = `verify-portal-multi-${Date.now()}`;
  await openTable(page, tableSlug);

  const instanceIdA = randomUUID();
  const cardA = await placeCard(page, baseURL, tableSlug, instanceIdA, { gameCardIndex: 0 });
  const instanceIdB = randomUUID();
  const cardB = await placeCard(page, baseURL, tableSlug, instanceIdB, { gameCardIndex: 1 });
  await zoomToFit(page);

  const boxA = await cardA.boundingBox();
  const boxB = await cardB.boundingBox();
  if (!boxA || !boxB) throw new Error("missing bounding box");

  // Rubber-band select both cards from an empty point outside either — a plain click on a
  // card taps/rotates it instead of selecting (MtgCardShapeUtil's onClick override).
  const left = Math.min(boxA.x, boxB.x) - 40;
  const top = Math.min(boxA.y, boxB.y) - 40;
  const right = Math.max(boxA.x + boxA.width, boxB.x + boxB.width) + 40;
  const bottom = Math.max(boxA.y + boxA.height, boxB.y + boxB.height) + 40;
  await dragPointTo(page, { x: left, y: top }, { x: right, y: bottom });

  const library = page.locator(libraryLocator(tableSlug, "e2e-seat"));
  const libraryCenter = await center(library);
  const startFromCardA = await center(cardA);

  await page.mouse.move(startFromCardA.x, startFromCardA.y);
  await page.mouse.down();
  await page.mouse.move(libraryCenter.x, libraryCenter.y, { steps: 10 });
  await expect(page.getByTestId("portal-arming")).toBeAttached();
  await page.mouse.up();

  await expect(page.locator(cardLocator(instanceIdA))).not.toBeAttached({ timeout: 5000 });
  await expect(page.locator(cardLocator(instanceIdB))).not.toBeAttached({ timeout: 5000 });
});

test("dragging a card onto another seat's library does not arm or swallow it", async ({ page, baseURL }) => {
  const tableSlug = `verify-portal-foreign-${Date.now()}`;
  await openTable(page, tableSlug);

  const instanceId = randomUUID();
  const card = await placeCard(page, baseURL, tableSlug, instanceId, { gameCardIndex: 0 });
  await joinSeat(page, baseURL, tableSlug, "e2e-seat-2", "Opponent");

  const foreignLibrary = page.locator(libraryLocator(tableSlug, "e2e-seat-2"));
  await expect(foreignLibrary).toBeAttached();
  // zoomToFit must run after the new seat's shapes have synced to this client, or the
  // camera fits only what existed at the time and the new library lands off-screen.
  await zoomToFit(page);

  const cardStart = await center(card);
  const foreignLibraryCenter = await center(foreignLibrary);

  await page.mouse.move(cardStart.x, cardStart.y);
  await page.mouse.down();
  await page.mouse.move(foreignLibraryCenter.x, foreignLibraryCenter.y, { steps: 10 });

  await expect(page.getByTestId("portal-arming")).not.toBeAttached();

  await page.mouse.up();
  await page.waitForTimeout(600);
  await expect(page.locator(cardLocator(instanceId))).toBeAttached();
});
