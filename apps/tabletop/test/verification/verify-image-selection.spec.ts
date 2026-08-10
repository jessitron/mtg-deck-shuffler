import { test, expect, Page, Locator } from "@playwright/test";
import { randomUUID } from "node:crypto";

/**
 * TODO.md bug (2026-08-10): "paste an image in, pick it, move it around,
 * click a card, try to move it — the image moves instead."
 *
 * tabletop-shape-mechanics owner: mtg-card defines `onClick`, so tldraw
 * defers selecting a clicked card until pointer-up; if some OTHER shape is
 * still selected from its own prior drag when the card-drag threshold is
 * crossed, tldraw keeps translating that stale selection instead of the
 * card. A pasted/dropped image is tldraw's STOCK `image` shape, which (like
 * stock `note` before Ticket 19) has no hook of its own to clear selection
 * on drag-settle — SelectionClearingImageShapeUtil supplies one.
 */

function fakeTraceparent(): string {
  return `00-${randomUUID().replace(/-/g, "")}-${randomUUID().replace(/-/g, "").slice(0, 16)}-01`;
}

function cardPlayed(tableId: string, payloadOverrides: Record<string, unknown>) {
  return {
    id: randomUUID(),
    tableId,
    name: "card.played",
    occurredAt: new Date().toISOString(),
    initiator: { seatId: "e2e-seat", playerName: "Jess" },
    occurredIn: "shuffler",
    visibility: "public",
    traceparent: fakeTraceparent(),
    schemaVersion: 1,
    payload: {
      face: "front",
      frontImageUrl: "https://cards.scryfall.io/normal/front/6/8/688b73bb-7952-4a1b-a878-49f13cf3ba25.jpg",
      backImageUrl: null,
      owner: "e2e-seat",
      isCommander: false,
      ...payloadOverrides,
    },
  };
}

async function dragPointTo(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 10 });
  await page.mouse.up();
}

async function dragCenterTo(page: Page, from: Locator, to: { x: number; y: number }) {
  await dragPointTo(page, await center(from), to);
}

async function center(locator: Locator): Promise<{ x: number; y: number }> {
  const box = await locator.boundingBox();
  if (!box) throw new Error("missing bounding box");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** A grip near the card's top edge, matching verify-note.spec.ts's convention
 * of grabbing well clear of anything else riding lower on the card. */
async function topGrip(card: Locator): Promise<{ x: number; y: number }> {
  const box = await card.boundingBox();
  if (!box) throw new Error("missing card box");
  return { x: box.x + box.width / 2, y: box.y + box.height * 0.12 };
}

async function placeCard(page: Page, baseURL: string | undefined, tableSlug: string, instanceId: string) {
  const event = cardPlayed(tableSlug, {
    cardName: "Llanowar Elves",
    card: { scryfallId: "aaaaaaaa-1111-4111-8111-000000000019", instanceId },
    zoneHint: "stack",
  });
  const response = await page.request.post(`${baseURL}/api/tables/${tableSlug}/cards`, { data: event });
  expect(response.status()).toBe(201);
  const card = page.locator(`#shape\\:card-${instanceId}`);
  await expect(card).toBeAttached();
  return card;
}

async function openTable(page: Page, tableSlug: string) {
  await page.goto(`/t/${tableSlug}`);
  await expect(page.locator(".tl-canvas")).toBeVisible({ timeout: 15000 });
}

/** Drop a freshly-rendered 100x100 PNG onto the canvas at the given screen
 * point — this is how tldraw creates a stock `image` shape from a file
 * (paste follows the same internal path); scripting a `drop` DOM event is
 * far more reliable in Playwright than driving the OS clipboard for a real
 * paste. 100x100 matters: a 1x1 image's four resize handles are all
 * coincident at its single point, so a "drag from center" lands on a
 * handle and resizes instead of translating — a real image is never that
 * small, so this avoids a test-fixture artifact having nothing to do with
 * the bug under test. */
async function dropImageOnCanvas(page: Page, at: { x: number; y: number }) {
  const dataTransfer = await page.evaluateHandle(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "red";
    ctx.fillRect(0, 0, 100, 100);
    const blob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
    const file = new File([blob], "square.png", { type: "image/png" });
    const dt = new DataTransfer();
    dt.items.add(file);
    return dt;
  });

  const canvas = page.locator(".tl-canvas");
  await canvas.dispatchEvent("dragenter", { dataTransfer });
  await canvas.dispatchEvent("dragover", { dataTransfer, clientX: at.x, clientY: at.y });
  await canvas.dispatchEvent("drop", { dataTransfer, clientX: at.x, clientY: at.y });
}

test("after dragging a pasted image, dragging a card moves the card (stale-selection regression)", async ({
  page,
  baseURL,
}) => {
  const tableSlug = `verify-image-sel-${Date.now()}`;
  await openTable(page, tableSlug);

  const instanceId = randomUUID();
  const card = await placeCard(page, baseURL, tableSlug, instanceId);
  await page.keyboard.press("Shift+1");
  await page.waitForTimeout(300);

  const cardCenter = await center(card);
  await dropImageOnCanvas(page, { x: cardCenter.x + 300, y: cardCenter.y + 120 });

  // MtgCardShapeUtil renders the card's own face as a `.tl-image-container`
  // too, so scope to the dropped image's shape wrapper specifically (its id
  // is NOT prefixed "shape:card-"; tldraw's shape wrapper divs carry
  // `id="shape:<id>"` directly, no shared "tl-shape" class to key off).
  const image = page.locator('[id^="shape\\:"]:not([id^="shape\\:card-"]) .tl-image-container');
  await expect(image).toHaveCount(1, { timeout: 10000 });

  // Drag the image somewhere neutral (NOT onto the card) — tldraw leaves it
  // selected after the drag settles unless the image cleans up after itself.
  // Deliberately no deselect afterward: proving the PRODUCT clears
  // selection, not the test.
  await dragCenterTo(page, image, { x: cardCenter.x + 300, y: cardCenter.y + 220 });

  // Now drag the card. With a stale image selection, tldraw's PointingShape
  // guard would translate the image instead of the card.
  const imageCenter = await center(image);
  const before = await center(card);
  const grip = await topGrip(card);
  await dragPointTo(page, grip, { x: grip.x + 120, y: grip.y });

  await expect(async () => {
    const after = await center(card);
    expect(after.x - before.x).toBeCloseTo(120, -1);
  }).toPass({ timeout: 5000 });
  const imageAfter = await center(image);
  expect(Math.abs(imageAfter.x - imageCenter.x)).toBeLessThan(5);
});
