import { test, expect, Page, BrowserContext } from "@playwright/test";

/**
 * Ticket 14 (zone appearance): a zone shows a glow ring while a card is
 * being dragged over it, computed purely reactively (never written to the
 * store) — so it must be visible only on the dragging player's own client,
 * never synced to anyone else watching the same table.
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
    ...overrides,
  };
}

async function zoomToFit(page: Page) {
  await page.keyboard.press("Shift+1");
  await page.waitForTimeout(300);
}

async function boxShadowOf(page: Page, selector: string): Promise<string> {
  return page.locator(`${selector} [data-testid="zone-box"]`).evaluate((el) => getComputedStyle(el).boxShadow);
}

test("dragging a card over a zone arms it (box-shadow ring), and disarms it once the drag settles", async ({
  page,
  baseURL,
}) => {
  const tableSlug = `verify-armed-${Date.now()}`;
  await page.goto(`/t/${tableSlug}`);
  await expect(page.locator(".tl-canvas")).toBeVisible({ timeout: 15000 });

  const instanceId = `armed-${Date.now()}`;
  const event = cardPlayed({
    cardName: "Llanowar Elves",
    card: { scryfallId: "aaaaaaaa-0000-0000-0000-000000000006", instanceId },
    zoneHint: "stack",
  });
  const response = await page.request.post(`${baseURL}/api/tables/${tableSlug}/cards`, { data: event });
  expect(response.status()).toBe(201);

  const card = page.locator(`#shape\\:card-${instanceId}`);
  await expect(card).toBeAttached();

  const graveyard = `[data-shape-id="shape:region-graveyard-${tableSlug}-e2e-seat"]`;
  await expect(page.locator(graveyard)).toBeAttached();
  await zoomToFit(page);

  const atRest = await boxShadowOf(page, graveyard);
  expect(atRest).toBe("none");

  const cardBox = await card.boundingBox();
  const graveyardBox = await page.locator(graveyard).boundingBox();
  if (!cardBox || !graveyardBox) throw new Error("missing bounding box");

  // Mid-drag, no mouse-up yet: hovering the card over the graveyard should arm it.
  await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(graveyardBox.x + graveyardBox.width / 2, graveyardBox.y + graveyardBox.height / 2, {
    steps: 10,
  });

  await expect(async () => {
    const armed = await boxShadowOf(page, graveyard);
    expect(armed).not.toBe("none");
    expect(armed).toContain("230, 163, 61"); // --armed-glow, #e6a33d
  }).toPass({ timeout: 5000 });

  await page.mouse.up();

  await expect(async () => {
    expect(await boxShadowOf(page, graveyard)).toBe("none");
  }).toPass({ timeout: 5000 });
});

test("dragging a multi-card selection arms only the one zone under the pointer, not one per card", async ({
  page,
  baseURL,
}) => {
  const tableSlug = `verify-armed-multi-${Date.now()}`;
  await page.goto(`/t/${tableSlug}`);
  await expect(page.locator(".tl-canvas")).toBeVisible({ timeout: 15000 });

  const instanceIdA = `armed-multi-a-${Date.now()}`;
  const instanceIdB = `armed-multi-b-${Date.now()}`;
  for (const [instanceId, scryfallId] of [
    [instanceIdA, "aaaaaaaa-0000-0000-0000-000000000009"],
    [instanceIdB, "aaaaaaaa-0000-0000-0000-00000000000a"],
  ]) {
    // "battlefield" (not "stack") so the two cards land at distinct grid
    // positions instead of stacked exactly on top of each other — otherwise
    // clicking one always hits whichever landed on top.
    const response = await page.request.post(`${baseURL}/api/tables/${tableSlug}/cards`, {
      data: cardPlayed({ cardName: "Llanowar Elves", card: { scryfallId, instanceId }, zoneHint: "battlefield" }),
    });
    expect(response.status()).toBe(201);
  }

  const cardA = page.locator(`#shape\\:card-${instanceIdA}`);
  const cardB = page.locator(`#shape\\:card-${instanceIdB}`);
  await expect(cardA).toBeAttached();
  await expect(cardB).toBeAttached();

  const graveyard = `[data-shape-id="shape:region-graveyard-${tableSlug}-e2e-seat"]`;
  const exile = `[data-shape-id="shape:region-exile-${tableSlug}-e2e-seat"]`;
  await expect(page.locator(graveyard)).toBeAttached();
  await expect(page.locator(exile)).toBeAttached();
  await zoomToFit(page);

  // Select both cards as a group (click A, shift-click B), then drag from A
  // — tldraw moves the whole selection together, to one destination.
  await cardA.click();
  await cardB.click({ modifiers: ["Shift"] });

  const cardBox = await cardA.boundingBox();
  const graveyardBox = await page.locator(graveyard).boundingBox();
  if (!cardBox || !graveyardBox) throw new Error("missing bounding box");

  await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(graveyardBox.x + graveyardBox.width / 2, graveyardBox.y + graveyardBox.height / 2, {
    steps: 10,
  });

  await expect(async () => {
    expect(await boxShadowOf(page, graveyard)).toContain("230, 163, 61");
  }).toPass({ timeout: 5000 });

  // The whole selection is moving as one rigid group toward the pointer —
  // only the zone the pointer is actually over arms, not a second zone one
  // of the other selected cards' own (unmoved-relative-to-the-group) bounds
  // might otherwise have overlapped.
  expect(await boxShadowOf(page, exile)).toBe("none");

  await page.mouse.up();
});

test("the armed glow is local to the dragging player, never synced to another client", async ({ browser, baseURL }) => {
  const tableSlug = `verify-armed-local-${Date.now()}`;
  const contexts: BrowserContext[] = [];
  try {
    const [ctxA, ctxB] = await Promise.all([browser.newContext(), browser.newContext()]);
    contexts.push(ctxA, ctxB);
    const [pageA, pageB] = await Promise.all([ctxA.newPage(), ctxB.newPage()]);

    await Promise.all([pageA.goto(`/t/${tableSlug}`), pageB.goto(`/t/${tableSlug}`)]);
    await Promise.all([
      expect(pageA.locator(".tl-canvas")).toBeVisible({ timeout: 15000 }),
      expect(pageB.locator(".tl-canvas")).toBeVisible({ timeout: 15000 }),
    ]);

    const instanceId = `armed-local-${Date.now()}`;
    const event = cardPlayed({
      cardName: "Llanowar Elves",
      card: { scryfallId: "aaaaaaaa-0000-0000-0000-000000000007", instanceId },
      zoneHint: "stack",
    });
    const response = await pageA.request.post(`${baseURL}/api/tables/${tableSlug}/cards`, { data: event });
    expect(response.status()).toBe(201);

    const cardA = pageA.locator(`#shape\\:card-${instanceId}`);
    await expect(cardA).toBeAttached();
    const graveyard = `[data-shape-id="shape:region-graveyard-${tableSlug}-e2e-seat"]`;
    await expect(pageA.locator(graveyard)).toBeAttached();
    await expect(pageB.locator(graveyard)).toBeAttached();
    await Promise.all([zoomToFit(pageA), zoomToFit(pageB)]);

    const cardBox = await cardA.boundingBox();
    const graveyardBoxA = await pageA.locator(graveyard).boundingBox();
    if (!cardBox || !graveyardBoxA) throw new Error("missing bounding box");

    await pageA.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
    await pageA.mouse.down();
    await pageA.mouse.move(graveyardBoxA.x + graveyardBoxA.width / 2, graveyardBoxA.y + graveyardBoxA.height / 2, {
      steps: 10,
    });

    await expect(async () => {
      expect(await boxShadowOf(pageA, graveyard)).toContain("230, 163, 61");
    }).toPass({ timeout: 5000 });

    // While A's drag is still in progress, B's copy of the same zone shape
    // must show no armed styling at all — this is derived, unsynced state.
    expect(await boxShadowOf(pageB, graveyard)).toBe("none");

    await pageA.mouse.up();
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});
