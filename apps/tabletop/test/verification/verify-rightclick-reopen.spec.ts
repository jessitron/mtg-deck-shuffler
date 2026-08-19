import { test, expect } from "@playwright/test";
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
      zoneHint: "stack",
      cardName: "Llanowar Elves",
      owner: "e2e-seat",
      isCommander: false,
      ...payloadOverrides,
    },
  };
}

function seatJoined(tableId: string, payloadOverrides: Record<string, unknown>) {
  return {
    id: randomUUID(),
    tableId,
    name: "seat.joined",
    occurredAt: new Date().toISOString(),
    initiator: { seatId: "e2e-seat", playerName: "Jess" },
    occurredIn: "shuffler",
    origin: "shuffler.shuffleUp",
    significance: "administrative",
    traceparent: fakeTraceparent(),
    schemaVersion: 1,
    payload: {
      deckName: "Blame Game",
      ...payloadOverrides,
    },
  };
}

async function setUpTableWithCard(page: import("@playwright/test").Page, baseURL: string | undefined, tableSlug: string) {
  const seatResponse = await page.request.post(`${baseURL}/api/tables/${tableSlug}/events`, {
    data: seatJoined(tableSlug, {}),
  });
  expect(seatResponse.status()).toBe(201);

  await page.goto(`/t/${tableSlug}`);
  await expect(page.locator(".tl-canvas")).toBeVisible({ timeout: 15000 });

  const instanceId = randomUUID();
  const response = await page.request.post(`${baseURL}/test/tables/${tableSlug}/cards`, {
    data: cardPlayed(tableSlug, { card: { scryfallId: randomUUID(), instanceId } }),
  });
  expect(response.status()).toBe(201);
  const card = page.locator(`#shape\\:card-${instanceId}`);
  await expect(card).toBeAttached();

  await page.keyboard.press("Shift+1");
  await page.waitForTimeout(300);

  return card;
}

test("dismiss via Escape then right-click again reopens the menu, repeatedly", async ({ page, baseURL }) => {
  const tableSlug = `verify-rightclick-escape-${Date.now()}`;
  const card = await setUpTableWithCard(page, baseURL, tableSlug);

  for (let attempt = 0; attempt < 5; attempt++) {
    await card.click({ button: "right" });
    await expect(page.getByRole("menuitem", { name: "Turn face down", exact: true })).toBeVisible({ timeout: 3000 });
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menuitem", { name: "Turn face down", exact: true })).toHaveCount(0);
  }
});

test("dismiss via left-click elsewhere then right-click again reopens the menu, repeatedly", async ({ page, baseURL }) => {
  const tableSlug = `verify-rightclick-outsideclick-${Date.now()}`;
  const card = await setUpTableWithCard(page, baseURL, tableSlug);
  const canvasBox = await page.locator(".tl-canvas").boundingBox();
  if (!canvasBox) throw new Error("no canvas bounding box");

  for (let attempt = 0; attempt < 5; attempt++) {
    await card.click({ button: "right" });
    await expect(page.getByRole("menuitem", { name: "Turn face down", exact: true })).toBeVisible({ timeout: 3000 });
    await page.mouse.click(canvasBox.x + 20, canvasBox.y + 20);
    await expect(page.getByRole("menuitem", { name: "Turn face down", exact: true })).toHaveCount(0);
  }
});
