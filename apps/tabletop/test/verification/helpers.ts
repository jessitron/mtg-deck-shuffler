import { type Page, type Locator, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";


export function fakeTraceparent(): string {
  return `00-${randomUUID().replace(/-/g, "")}-${randomUUID().replace(/-/g, "").slice(0, 16)}-01`;
}

/** Build a `card.played` event envelope for POSTing to /api/tables/:tableSlug/cards. */
export function cardPlayed(tableId: string, payloadOverrides: Record<string, unknown> = {}) {
  return {
    id: randomUUID(),
    tableId,
    name: "card.played",
    occurredAt: new Date().toISOString(),
    initiator: { seatId: "e2e-seat", playerName: "Jess" },
    occurredIn: "shuffler",
    origin: "shuffler.playCardSubmit",
    significance: "domain",
    visibility: "public",
    traceparent: fakeTraceparent(),
    schemaVersion: 1,
    payload: {
      face: "front",
      frontImageUrl: "https://cards.scryfall.io/normal/front/6/8/688b73bb-7952-4a1b-a878-49f13cf3ba25.jpg",
      backImageUrl: null,
      zoneHint: "stack",
      owner: "e2e-seat",
      isCommander: false,
      ...payloadOverrides,
    },
  };
}

/** Navigate to a table and wait for the tldraw canvas to be visible. */
export async function openTable(page: Page, tableSlug: string): Promise<void> {
  await page.goto(`/t/${tableSlug}`);
  await expect(page.locator(".tl-canvas")).toBeVisible({ timeout: 15000 });
}

export async function zoomToFit(page: Page): Promise<void> {
  await page.keyboard.press("Shift+1");
  await page.waitForTimeout(300);
}

export async function placeCard(
  page: Page,
  baseURL: string | undefined,
  tableSlug: string,
  instanceId: string,
  payloadOverrides: Record<string, unknown> = {},
): Promise<Locator> {
  const event = cardPlayed(tableSlug, {
    cardName: "Llanowar Elves",
    card: { scryfallId: randomUUID(), instanceId },
    ...payloadOverrides,
  });
  const response = await page.request.post(`${baseURL}/api/tables/${tableSlug}/cards`, { data: event });
  expect(response.status()).toBe(201);
  const card = page.locator(`#shape\\:card-${instanceId}`);
  await expect(card).toBeAttached();
  return card;
}

export async function center(locator: Locator): Promise<{ x: number; y: number }> {
  const box = await locator.boundingBox();
  if (!box) throw new Error("missing bounding box");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

export async function dragPointTo(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 10 });
  await page.mouse.up();
}

export async function dragCenterTo(page: Page, from: Locator, to: { x: number; y: number }) {
  await dragPointTo(page, await center(from), to);
}

/** Drag a shape by a relative offset, starting from its current center. */
export async function dragBy(page: Page, locator: Locator, dx: number, dy: number) {
  const start = await center(locator);
  await dragPointTo(page, start, { x: start.x + dx, y: start.y + dy });
}

/** Drag a card (by its current center) onto another locator's center. */
export async function dragCardTo(page: Page, card: Locator, targetSelector: string) {
  const target = page.locator(targetSelector);
  await dragCenterTo(page, card, await center(target));
}
