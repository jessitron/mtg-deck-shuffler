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

  const image = page.locator('[id^="shape\\:"]:not([id^="shape\\:card-"]) .tl-image-container');
  await expect(image).toHaveCount(1, { timeout: 10000 });

  await dragCenterTo(page, image, { x: cardCenter.x + 300, y: cardCenter.y + 220 });

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
