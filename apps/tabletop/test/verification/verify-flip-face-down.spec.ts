import { test, expect, Page, BrowserContext } from "@playwright/test";

/**
 * Ticket 17 (flip and turn face-down): two independent context-menu items on
 * `mtg-card` — "Flip" (swaps `props.face`, gated on `backImageUrl !== null`)
 * and "Turn face down"/"Turn face up" (toggles `props.faceDown`) — plus a
 * reset of both axes on entering the library.
 */
function cardPlayed(overrides: Record<string, unknown>) {
  return {
    id: `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: "card.played",
    occurredAt: new Date().toISOString(),
    initiator: { seatId: "e2e-seat", playerName: "Jess" },
    face: "front",
    frontImageUrl: "https://cards.scryfall.io/normal/front/6/8/688b73bb-7952-4a1b-a878-49f13cf3ba25.jpg",
    backImageUrl: null,
    zoneHint: "stack",
    cardName: "Llanowar Elves",
    ...overrides,
  };
}

const uniqueSuffix = () => `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

async function zoomToFit(page: Page) {
  await page.keyboard.press("Shift+1");
  await page.waitForTimeout(300);
}

async function placeCard(page: Page, baseURL: string | undefined, tableSlug: string, instanceId: string, overrides: Record<string, unknown> = {}) {
  const response = await page.request.post(`${baseURL}/api/tables/${tableSlug}/cards`, {
    data: cardPlayed({
      card: { scryfallId: `bbbbbbbb-0000-0000-0000-${instanceId.slice(-12).padStart(12, "0")}`, instanceId },
      ...overrides,
    }),
  });
  expect(response.status()).toBe(201);
  await expect(page.locator(`#shape\\:card-${instanceId}`)).toBeAttached();
}

async function openCardMenu(page: Page, instanceId: string) {
  await page.locator(`#shape\\:card-${instanceId}`).click({ button: "right" });
}

async function chooseMenuItem(page: Page, label: string) {
  await page.getByRole("menuitem", { name: label, exact: true }).click();
}

async function cardSrc(page: Page, instanceId: string): Promise<string | null> {
  return page.locator(`#shape\\:card-${instanceId} img`).getAttribute("src");
}

test("flipping a two-faced card swaps its face on both clients", async ({ browser, baseURL }) => {
  const tableSlug = `verify-flip-2client-${Date.now()}`;
  const contexts: BrowserContext[] = [];
  try {
    const [ctxAlice, ctxBob] = await Promise.all([browser.newContext(), browser.newContext()]);
    contexts.push(ctxAlice, ctxBob);
    const [alice, bob] = await Promise.all([ctxAlice.newPage(), ctxBob.newPage()]);
    await Promise.all([alice.goto(`/t/${tableSlug}`), bob.goto(`/t/${tableSlug}`)]);
    await Promise.all([
      expect(alice.locator(".tl-canvas")).toBeVisible({ timeout: 15000 }),
      expect(bob.locator(".tl-canvas")).toBeVisible({ timeout: 15000 }),
    ]);

    const instanceId = `flip-${uniqueSuffix()}`;
    const backImageUrl = "https://cards.scryfall.io/normal/back/6/8/688b73bb-7952-4a1b-a878-49f13cf3ba25.jpg";
    await placeCard(alice, baseURL, tableSlug, instanceId, { backImageUrl });
    await expect(bob.locator(`#shape\\:card-${instanceId}`)).toBeAttached();
    await Promise.all([zoomToFit(alice), zoomToFit(bob)]);

    await openCardMenu(alice, instanceId);
    await chooseMenuItem(alice, "Flip");

    await expect(async () => {
      expect(await cardSrc(alice, instanceId)).toBe(backImageUrl);
    }).toPass({ timeout: 5000 });
    await expect(async () => {
      expect(await cardSrc(bob, instanceId)).toBe(backImageUrl);
    }).toPass({ timeout: 5000 });
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});

test("a one-faced card has no Flip item, only Turn face down", async ({ page, baseURL }) => {
  const tableSlug = `verify-flip-gate-${Date.now()}`;
  await page.goto(`/t/${tableSlug}`);
  await expect(page.locator(".tl-canvas")).toBeVisible({ timeout: 15000 });

  const instanceId = `oneface-${uniqueSuffix()}`;
  await placeCard(page, baseURL, tableSlug, instanceId, { backImageUrl: null });
  await zoomToFit(page);

  await openCardMenu(page, instanceId);
  await expect(page.getByRole("menuitem", { name: "Turn face down", exact: true })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Flip", exact: true })).toHaveCount(0);
});

test("turning a card face down shows the table's card back, unsleeved", async ({ page, baseURL }) => {
  const tableSlug = `verify-facedown-${Date.now()}`;
  const cardBackImageUrl = "https://example.com/e2e-card-back.jpg";

  await page.request.post(`${baseURL}/api/tables/${tableSlug}/events`, {
    data: {
      id: `seat-${uniqueSuffix()}`,
      name: "seat.joined",
      occurredAt: new Date().toISOString(),
      initiator: { seatId: "e2e-seat", playerName: "Jess" },
      deckName: "Blame Game",
      cardBackImageUrl,
    },
  });

  await page.goto(`/t/${tableSlug}`);
  await expect(page.locator(".tl-canvas")).toBeVisible({ timeout: 15000 });

  const instanceId = `facedown-${uniqueSuffix()}`;
  const frontImageUrl = cardPlayed({}).frontImageUrl as string;
  await placeCard(page, baseURL, tableSlug, instanceId);
  await zoomToFit(page);

  await openCardMenu(page, instanceId);
  await chooseMenuItem(page, "Turn face down");
  await expect(async () => {
    expect(await cardSrc(page, instanceId)).toBe(cardBackImageUrl);
  }).toPass({ timeout: 5000 });

  await openCardMenu(page, instanceId);
  await chooseMenuItem(page, "Turn face up");
  await expect(async () => {
    expect(await cardSrc(page, instanceId)).toBe(frontImageUrl);
  }).toPass({ timeout: 5000 });
});

test("a card entering the library resets face and face-down", async ({ page, baseURL }) => {
  const tableSlug = `verify-libreset-${Date.now()}`;
  const cardBackImageUrl = "https://example.com/e2e-card-back-libreset.jpg";

  await page.request.post(`${baseURL}/api/tables/${tableSlug}/events`, {
    data: {
      id: `seat-${uniqueSuffix()}`,
      name: "seat.joined",
      occurredAt: new Date().toISOString(),
      initiator: { seatId: "e2e-seat", playerName: "Jess" },
      deckName: "Blame Game",
      cardBackImageUrl,
    },
  });

  await page.goto(`/t/${tableSlug}`);
  await expect(page.locator(".tl-canvas")).toBeVisible({ timeout: 15000 });

  const instanceId = `libreset-${uniqueSuffix()}`;
  const backImageUrl = "https://cards.scryfall.io/normal/back/6/8/688b73bb-7952-4a1b-a878-49f13cf3ba25.jpg";
  await placeCard(page, baseURL, tableSlug, instanceId, { backImageUrl });
  await zoomToFit(page);

  await openCardMenu(page, instanceId);
  await chooseMenuItem(page, "Turn face down");
  await expect(async () => {
    expect(await cardSrc(page, instanceId)).toBe(cardBackImageUrl);
  }).toPass({ timeout: 5000 });

  const library = `[data-shape-id="shape:library-${tableSlug}-e2e-seat"]`;
  await expect(page.locator(library)).toBeAttached();

  const card = page.locator(`#shape\\:card-${instanceId}`);
  const cardBox = await card.boundingBox();
  const libBox = await page.locator(library).boundingBox();
  if (!cardBox || !libBox) throw new Error("missing bounding box");
  await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(libBox.x + libBox.width / 2, libBox.y + libBox.height / 2, { steps: 10 });
  await page.mouse.up();

  const frontImageUrl = cardPlayed({}).frontImageUrl as string;
  await expect(async () => {
    expect(await cardSrc(page, instanceId)).toBe(frontImageUrl);
  }).toPass({ timeout: 5000 });
});

test("flipping card A does not leave a stale selection that hijacks a later drag of card B", async ({ page, baseURL }) => {
  const tableSlug = `verify-flip-selection-${Date.now()}`;
  await page.goto(`/t/${tableSlug}`);
  await expect(page.locator(".tl-canvas")).toBeVisible({ timeout: 15000 });

  const idA = `sel-a-${uniqueSuffix()}`;
  const idB = `sel-b-${uniqueSuffix()}`;
  await placeCard(page, baseURL, tableSlug, idA, { backImageUrl: "https://example.com/back-a.jpg", zoneHint: "battlefield" });
  await placeCard(page, baseURL, tableSlug, idB, { zoneHint: "battlefield" });
  await zoomToFit(page);

  await openCardMenu(page, idA);
  await chooseMenuItem(page, "Flip");
  await expect(async () => {
    expect(await cardSrc(page, idA)).toBe("https://example.com/back-a.jpg");
  }).toPass({ timeout: 5000 });

  const cardA = page.locator(`#shape\\:card-${idA}`);
  const cardB = page.locator(`#shape\\:card-${idB}`);
  const beforeA = await cardA.boundingBox();
  const beforeB = await cardB.boundingBox();
  if (!beforeA || !beforeB) throw new Error("missing bounding box");

  // Drag B far away; A must stay put. +150/-150 (not +300/+300): the whole
  // table is zoomed to fit, so cards render tiny, and a large enough offset
  // in the wrong direction can carry the target past the default 720px-tall
  // viewport — Playwright can't complete a drag whose endpoint is offscreen.
  await page.mouse.move(beforeB.x + beforeB.width / 2, beforeB.y + beforeB.height / 2);
  await page.mouse.down();
  await page.mouse.move(beforeB.x + 150, beforeB.y - 150, { steps: 10 });
  await page.mouse.up();

  await expect(async () => {
    const afterB = await cardB.boundingBox();
    expect(afterB).not.toBeNull();
    expect(Math.abs(afterB!.x - beforeB.x)).toBeGreaterThan(100);
  }).toPass({ timeout: 5000 });

  const afterA = await cardA.boundingBox();
  expect(afterA).not.toBeNull();
  expect(Math.abs(afterA!.x - beforeA.x)).toBeLessThan(5);
  expect(Math.abs(afterA!.y - beforeA.y)).toBeLessThan(5);
});
