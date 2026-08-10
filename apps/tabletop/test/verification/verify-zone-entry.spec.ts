import { test, expect, Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

/**
 * Ticket 01-zone-entry-events: dragging a card into a zone (graveyard,
 * exile, library, playmat) should be detectable as a distinct "entered
 * zone" occurrence — once per real zone change, not once per drag frame,
 * and not re-fired for staying in (or returning to) the same zone.
 *
 * Descoped 2026-08-06 (Jess): no callback/emitter yet — the whole
 * notification surface for now is a `console.log` from the card shape's
 * `onTranslateEnd`. This test drives real mouse drags in the browser and
 * asserts on captured console output, so it needs no human watching the
 * canvas or reading logs by eye.
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
      zoneHint: "stack",
      owner: "e2e-seat",
      isCommander: false,
      ...payloadOverrides,
    },
  };
}

function zoneEntryLogs(messages: string[]): Array<{ instanceId: string; zone: string }> {
  return messages
    .map((m) => /^zone-entry (\S+) (\S+)$/.exec(m))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => ({ instanceId: m[1], zone: m[2] }));
}

async function dragCardTo(page: Page, card: ReturnType<Page["locator"]>, targetSelector: string) {
  const target = page.locator(targetSelector);
  const cardBox = await card.boundingBox();
  const targetBox = await target.boundingBox();
  if (!cardBox || !targetBox) throw new Error("missing bounding box");

  await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 10 });
  await page.mouse.up();
}

test("dragging a card into a zone logs zone entry exactly once", async ({ page, baseURL }) => {
  const tableSlug = `verify-zone-${Date.now()}`;
  const consoleMessages: string[] = [];
  page.on("console", (msg) => consoleMessages.push(msg.text()));

  await page.goto(`/t/${tableSlug}`);
  await expect(page.locator(".tl-canvas")).toBeVisible({ timeout: 15000 });

  const instanceId = randomUUID();
  const event = cardPlayed(tableSlug, {
    cardName: "Llanowar Elves",
    card: { scryfallId: randomUUID(), instanceId },
    zoneHint: "stack",
  });
  const response = await page.request.post(`${baseURL}/api/tables/${tableSlug}/cards`, { data: event });
  expect(response.status()).toBe(201);

  const card = page.locator(`#shape\\:card-${instanceId}`);
  await expect(card).toBeAttached();

  // The seat's player area (including the graveyard and exile zones) is
  // drawn as a defensive fallback on card arrival — locate it by its
  // deterministic shape id. Unlike the (unlocked, interactive) card shape,
  // these locked furniture shapes don't get a plain `id` attribute, only
  // `data-shape-id`.
  const graveyard = `[data-shape-id="shape:region-graveyard-${tableSlug}-e2e-seat"]`;
  const exile = `[data-shape-id="shape:region-exile-${tableSlug}-e2e-seat"]`;
  await expect(page.locator(graveyard)).toBeAttached();
  await expect(page.locator(exile)).toBeAttached();

  // The card arrives on the Stack, far from the graveyard/exile in the
  // right-hand column — tldraw culls (display:none) shapes outside the
  // initial camera viewport. Zoom to fit everything before computing any
  // bounding boxes, so drag targets are actually rendered.
  await page.keyboard.press("Shift+1");
  await page.waitForTimeout(300);

  consoleMessages.length = 0;
  await dragCardTo(page, card, graveyard);

  await expect(async () => {
    const entries = zoneEntryLogs(consoleMessages);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({ instanceId, zone: "graveyard" });
  }).toPass({ timeout: 5000 });

  // Dragging within the same zone (a small nudge, still inside the
  // graveyard's bounds) must not re-fire.
  consoleMessages.length = 0;
  const graveyardBox = await page.locator(graveyard).boundingBox();
  const cardBox = await card.boundingBox();
  if (!graveyardBox || !cardBox) throw new Error("missing bounding box");
  await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(cardBox.x + cardBox.width / 2 + 15, cardBox.y + cardBox.height / 2 + 15, { steps: 5 });
  await page.mouse.up();

  await page.waitForTimeout(300);
  expect(zoneEntryLogs(consoleMessages)).toHaveLength(0);

  // Dragging straight from the graveyard to the exile in one motion logs
  // exactly once, naming the destination zone.
  consoleMessages.length = 0;
  await dragCardTo(page, card, exile);

  await expect(async () => {
    const entries = zoneEntryLogs(consoleMessages);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({ instanceId, zone: "exile" });
  }).toPass({ timeout: 5000 });
});

test("tapping a card still rotates it after zone-entry hooks are added", async ({ page, baseURL }) => {
  const tableSlug = `verify-zone-tap-${Date.now()}`;
  await page.goto(`/t/${tableSlug}`);
  await expect(page.locator(".tl-canvas")).toBeVisible({ timeout: 15000 });

  const instanceId = randomUUID();
  const event = cardPlayed(tableSlug, {
    cardName: "Llanowar Elves",
    card: { scryfallId: randomUUID(), instanceId },
  });
  const response = await page.request.post(`${baseURL}/api/tables/${tableSlug}/cards`, { data: event });
  expect(response.status()).toBe(201);

  const card = page.locator(`#shape\\:card-${instanceId}`);
  await expect(card).toBeAttached();
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
