import { test, expect, Page } from "@playwright/test";

const FRONT_IMAGE = "https://example.com/front.jpg";
const BACK_IMAGE = "https://example.com/printed-back.jpg";
const CARD_BACK_IMAGE = "https://example.com/card-back.jpg";

function seatJoined() {
  return {
    id: `seat-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: "seat.joined",
    occurredAt: new Date().toISOString(),
    initiator: { seatId: "e2e-seat", playerName: "Jess" },
    deckName: "Blame Game",
    cardBackImageUrl: CARD_BACK_IMAGE,
  };
}

function cardPlayed(instanceId: string, overrides: Record<string, unknown> = {}) {
  return {
    id: `card-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: "card.played",
    occurredAt: new Date().toISOString(),
    initiator: { seatId: "e2e-seat", playerName: "Jess" },
    card: { scryfallId: "aaaaaaaa-0000-0000-0000-000000000017", instanceId },
    cardName: "Delver of Secrets",
    face: "front",
    frontImageUrl: FRONT_IMAGE,
    backImageUrl: BACK_IMAGE,
    zoneHint: "stack",
    ...overrides,
  };
}

async function postSeatAndCard(page: Page, baseURL: string | undefined, tableSlug: string, instanceId: string, overrides: Record<string, unknown> = {}) {
  const seat = await page.request.post(`${baseURL}/api/tables/${tableSlug}/events`, { data: seatJoined() });
  expect(seat.status()).toBe(202);

  const card = await page.request.post(`${baseURL}/api/tables/${tableSlug}/cards`, { data: cardPlayed(instanceId, overrides) });
  expect(card.status()).toBe(201);
}

async function openCardMenu(page: Page, instanceId: string) {
  const card = page.locator(`#shape\\:card-${instanceId}`);
  await expect(card).toBeAttached();
  await card.click({ button: "right" });
  await expect(page.getByTestId("context-menu")).toBeVisible();
}

function cardImage(page: Page, instanceId: string) {
  return page.locator(`#shape\\:card-${instanceId} img`);
}

test("context menu flips a two-faced card and syncs the printed face to another client", async ({ page, browser, baseURL }) => {
  const tableSlug = `verify-flip-${Date.now()}`;
  const instanceId = `flip-${Date.now()}`;

  await page.goto(`/t/${tableSlug}`);
  await expect(page.locator(".tl-canvas")).toBeVisible({ timeout: 15000 });
  await postSeatAndCard(page, baseURL, tableSlug, instanceId);

  const peer = await browser.newPage();
  await peer.goto(`/t/${tableSlug}`);
  await expect(peer.locator(".tl-canvas")).toBeVisible({ timeout: 15000 });

  await expect(cardImage(page, instanceId)).toHaveAttribute("src", FRONT_IMAGE);
  await expect(cardImage(peer, instanceId)).toHaveAttribute("src", FRONT_IMAGE);

  await openCardMenu(page, instanceId);
  await page.getByTestId("context-menu.mtg-card-flip").click();

  await expect(cardImage(page, instanceId)).toHaveAttribute("src", BACK_IMAGE);
  await expect(cardImage(peer, instanceId)).toHaveAttribute("src", BACK_IMAGE);

  await peer.close();
});

test("context menu turns an unsleeved card face down to the table card back, then face up again", async ({ page, baseURL }) => {
  const tableSlug = `verify-facedown-${Date.now()}`;
  const instanceId = `facedown-${Date.now()}`;

  await page.goto(`/t/${tableSlug}`);
  await expect(page.locator(".tl-canvas")).toBeVisible({ timeout: 15000 });
  await postSeatAndCard(page, baseURL, tableSlug, instanceId);

  await openCardMenu(page, instanceId);
  await page.getByTestId("context-menu.mtg-card-turn-face-down").click();
  await expect(cardImage(page, instanceId)).toHaveAttribute("src", CARD_BACK_IMAGE);

  await openCardMenu(page, instanceId);
  await expect(page.getByTestId("context-menu.mtg-card-turn-face-down")).toBeHidden();
  await page.getByTestId("context-menu.mtg-card-turn-face-up").click();
  await expect(cardImage(page, instanceId)).toHaveAttribute("src", FRONT_IMAGE);
});

test("one-faced cards do not offer Flip", async ({ page, baseURL }) => {
  const tableSlug = `verify-no-flip-${Date.now()}`;
  const instanceId = `noflip-${Date.now()}`;

  await page.goto(`/t/${tableSlug}`);
  await expect(page.locator(".tl-canvas")).toBeVisible({ timeout: 15000 });
  await postSeatAndCard(page, baseURL, tableSlug, instanceId, { backImageUrl: null, cardName: "Lightning Bolt" });

  await openCardMenu(page, instanceId);
  await expect(page.getByTestId("context-menu.mtg-card-flip")).toBeHidden();
  await expect(page.getByTestId("context-menu.mtg-card-turn-face-down")).toBeVisible();
});
