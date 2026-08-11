import { test, expect, Page, Locator } from "@playwright/test";
import { randomUUID } from "node:crypto";


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
    origin: "shuffler.playCardSubmit",
    significance: "domain",
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

async function topGrip(card: Locator): Promise<{ x: number; y: number }> {
  const box = await card.boundingBox();
  if (!box) throw new Error("missing bounding box");
  return { x: box.x + box.width / 2, y: box.y + box.height * 0.12 };
}

async function deselectAll(page: Page) {
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
}

async function createNote(page: Page, at: { x: number; y: number }) {
  await page.getByTestId("tools.note").click();
  await page.mouse.click(at.x, at.y);
  await deselectAll(page);
  // Outlive tldraw's double-click window, same reason as the counter tests.
  await page.waitForTimeout(500);
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

test("a note attaches to a card, rides along, and detaches when dragged off", async ({ page, baseURL }) => {
  const tableSlug = `verify-note-${Date.now()}`;
  await openTable(page, tableSlug);

  const instanceId = randomUUID();
  const card = await placeCard(page, baseURL, tableSlug, instanceId);

  await page.keyboard.press("Shift+1");
  await page.waitForTimeout(300);

  const cardCenter = await center(card);
  await createNote(page, { x: cardCenter.x + 300, y: cardCenter.y });
  const note = page.locator(".tl-note__container");
  await expect(note).toHaveCount(1);

  const cardBox = await card.boundingBox();
  if (!cardBox) throw new Error("missing card box");
  await dragCenterTo(page, note, { x: cardCenter.x, y: cardBox.y + cardBox.height * 0.7 });
  await deselectAll(page);

  // Attached = dragging the card carries the note along.
  const noteBefore = await center(note);
  const grip = await topGrip(card);
  await dragPointTo(page, grip, { x: grip.x + 150, y: grip.y + 80 });
  await expect(async () => {
    const noteAfter = await center(note);
    expect(noteAfter.x - noteBefore.x).toBeCloseTo(150, -1);
    expect(noteAfter.y - noteBefore.y).toBeCloseTo(80, -1);
  }).toPass({ timeout: 5000 });

  const noteOnCard = await center(note);
  await dragCenterTo(page, note, { x: noteOnCard.x + 400, y: noteOnCard.y });
  await deselectAll(page);
  const noteAfterDetach = await center(note);
  const gripNow = await topGrip(card);
  await dragPointTo(page, gripNow, { x: gripNow.x - 60, y: gripNow.y - 40 });
  await page.waitForTimeout(300);
  const noteFinal = await center(note);
  expect(Math.abs(noteFinal.x - noteAfterDetach.x)).toBeLessThan(10);
  expect(Math.abs(noteFinal.y - noteAfterDetach.y)).toBeLessThan(10);
});

test("an attached note detaches near the graveyard's edge when its host card dies", async ({ page, baseURL }) => {
  const tableSlug = `verify-note-gy-${Date.now()}`;
  await openTable(page, tableSlug);

  const instanceId = randomUUID();
  const card = await placeCard(page, baseURL, tableSlug, instanceId);

  const graveyard = page.locator(`[data-shape-id="shape:region-graveyard-${tableSlug}-e2e-seat"]`);
  await expect(graveyard).toBeAttached();

  await page.keyboard.press("Shift+1");
  await page.waitForTimeout(300);

  const cardCenter = await center(card);
  await createNote(page, { x: cardCenter.x + 300, y: cardCenter.y });
  const note = page.locator(".tl-note__container");
  await expect(note).toHaveCount(1);

  const cardBox = await card.boundingBox();
  if (!cardBox) throw new Error("missing card box");
  await dragCenterTo(page, note, { x: cardCenter.x, y: cardBox.y + cardBox.height * 0.7 });
  await deselectAll(page);

  // Rides the card on a small in-battlefield move (proves it attached).
  const notePosBefore = await center(note);
  const grip = await topGrip(card);
  await dragPointTo(page, grip, { x: grip.x + 80, y: grip.y });
  await expect(async () => {
    const moved = await center(note);
    expect(moved.x - notePosBefore.x).toBeCloseTo(80, -1);
  }).toPass({ timeout: 5000 });

  const graveyardCenter = await center(graveyard);
  const gripNow = await topGrip(card);
  const cardBoxNow = await card.boundingBox();
  if (!cardBoxNow) throw new Error("missing card box");
  await dragPointTo(page, gripNow, {
    x: graveyardCenter.x,
    y: graveyardCenter.y - cardBoxNow.height * 0.38,
  });

  await expect(async () => {
    const graveyardBox = await graveyard.boundingBox();
    if (!graveyardBox) throw new Error("missing graveyard box");
    const c = await center(note);
    const inside =
      c.x > graveyardBox.x && c.x < graveyardBox.x + graveyardBox.width && c.y > graveyardBox.y && c.y < graveyardBox.y + graveyardBox.height;
    expect(inside).toBe(false);
    const margin = 350;
    expect(c.x).toBeGreaterThan(graveyardBox.x - margin);
    expect(c.x).toBeLessThan(graveyardBox.x + graveyardBox.width + margin);
    expect(c.y).toBeGreaterThan(graveyardBox.y - margin);
    expect(c.y).toBeLessThan(graveyardBox.y + graveyardBox.height + margin);
  }).toPass({ timeout: 5000 });
});

test("after dragging a note, dragging a card moves the card (stale-selection regression)", async ({
  page,
  baseURL,
}) => {
  const tableSlug = `verify-note-sel-${Date.now()}`;
  await openTable(page, tableSlug);

  const instanceId = randomUUID();
  const card = await placeCard(page, baseURL, tableSlug, instanceId);
  await page.keyboard.press("Shift+1");
  await page.waitForTimeout(300);

  const cardCenter = await center(card);
  await createNote(page, { x: cardCenter.x + 300, y: cardCenter.y + 120 });
  const note = page.locator(".tl-note__container");
  await expect(note).toHaveCount(1);

  await dragCenterTo(page, note, { x: cardCenter.x + 300, y: cardCenter.y + 220 });

  const noteCenter = await center(note);
  const before = await center(card);
  const grip = await topGrip(card);
  await dragPointTo(page, grip, { x: grip.x + 120, y: grip.y });

  await expect(async () => {
    const after = await center(card);
    expect(after.x - before.x).toBeCloseTo(120, -1);
  }).toPass({ timeout: 5000 });
  const noteAfter = await center(note);
  expect(Math.abs(noteAfter.x - noteCenter.x)).toBeLessThan(5);
});

test("an unattached note is unaffected when a nearby card moves", async ({ page, baseURL }) => {
  const tableSlug = `verify-note-unattached-${Date.now()}`;
  await openTable(page, tableSlug);

  const instanceId = randomUUID();
  const card = await placeCard(page, baseURL, tableSlug, instanceId);

  await page.keyboard.press("Shift+1");
  await page.waitForTimeout(300);

  const cardCenter = await center(card);
  // Note sits near the card, but is never dragged onto it — free-floating.
  await createNote(page, { x: cardCenter.x + 250, y: cardCenter.y + 250 });
  const note = page.locator(".tl-note__container");
  await expect(note).toHaveCount(1);
  const noteBefore = await center(note);

  const grip = await topGrip(card);
  await dragPointTo(page, grip, { x: grip.x - 80, y: grip.y + 40 });
  await page.waitForTimeout(300);

  const noteAfter = await center(note);
  expect(Math.abs(noteAfter.x - noteBefore.x)).toBeLessThan(5);
  expect(Math.abs(noteAfter.y - noteBefore.y)).toBeLessThan(5);
});
