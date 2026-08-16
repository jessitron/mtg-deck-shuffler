import { test, expect, Page, BrowserContext } from "@playwright/test";
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
      owner: "e2e-seat",
      isCommander: false,
      ...payloadOverrides,
    },
  };
}

async function zoomToFit(page: Page) {
  await page.keyboard.press("Shift+1");
  await page.waitForTimeout(300);
}

async function boxShadowOf(page: Page, selector: string): Promise<string> {
  return page.locator(`${selector} [data-testid="zone-box"]`).evaluate((el) => getComputedStyle(el).boxShadow);
}

/**
 * Drag a card away by its own instanceId. Same-seat cards all cascade onto the Stack
 * now that lands no longer auto-place on the playmat, so they arrive overlapping —
 * call this on the most-recently-created (topmost) card first so the drag target is
 * unambiguous while the others still overlap it.
 */
async function spreadCardApart(page: Page, instanceId: string, dx: number, dy: number) {
  const box = await page.locator(`#shape\\:card-${instanceId}`).boundingBox();
  if (!box) throw new Error(`no bounding box for card ${instanceId}`);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + dx, box.y + box.height / 2 + dy, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(200);
}

test("dragging a card over a zone arms it (box-shadow ring), and disarms it once the drag settles", async ({
  page,
  baseURL,
}) => {
  const tableSlug = `verify-armed-${Date.now()}`;
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

test("dragging your own commander over your command zone arms it", async ({ page, baseURL }) => {
  const tableSlug = `verify-armed-cmdr-${Date.now()}`;
  await page.goto(`/t/${tableSlug}`);
  await expect(page.locator(".tl-canvas")).toBeVisible({ timeout: 15000 });

  const instanceId = randomUUID();
  const event = cardPlayed(tableSlug, {
    cardName: "Atraxa, Praetors' Voice",
    card: { scryfallId: randomUUID(), instanceId },
    zoneHint: "stack",
    isCommander: true,
  });
  const response = await page.request.post(`${baseURL}/api/tables/${tableSlug}/cards`, { data: event });
  expect(response.status()).toBe(201);

  const card = page.locator(`#shape\\:card-${instanceId}`);
  await expect(card).toBeAttached();

  const commandZone = `[data-shape-id="shape:region-command-${tableSlug}-e2e-seat"]`;
  await expect(page.locator(commandZone)).toBeAttached();
  await zoomToFit(page);

  const cardBox = await card.boundingBox();
  const commandZoneBox = await page.locator(commandZone).boundingBox();
  if (!cardBox || !commandZoneBox) throw new Error("missing bounding box");

  await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(commandZoneBox.x + commandZoneBox.width / 2, commandZoneBox.y + commandZoneBox.height / 2, {
    steps: 10,
  });

  await expect(async () => {
    expect(await boxShadowOf(page, commandZone)).toContain("230, 163, 61"); // --armed-glow, #e6a33d
  }).toPass({ timeout: 5000 });

  await page.mouse.up();
});

test("dragging a non-commander card over your command zone does not arm it", async ({ page, baseURL }) => {
  const tableSlug = `verify-armed-noncmdr-${Date.now()}`;
  await page.goto(`/t/${tableSlug}`);
  await expect(page.locator(".tl-canvas")).toBeVisible({ timeout: 15000 });

  const instanceId = randomUUID();
  const event = cardPlayed(tableSlug, {
    cardName: "Llanowar Elves",
    card: { scryfallId: randomUUID(), instanceId },
    zoneHint: "stack",
    isCommander: false,
  });
  const response = await page.request.post(`${baseURL}/api/tables/${tableSlug}/cards`, { data: event });
  expect(response.status()).toBe(201);

  const card = page.locator(`#shape\\:card-${instanceId}`);
  await expect(card).toBeAttached();

  const commandZone = `[data-shape-id="shape:region-command-${tableSlug}-e2e-seat"]`;
  await expect(page.locator(commandZone)).toBeAttached();
  await zoomToFit(page);

  const cardBox = await card.boundingBox();
  const commandZoneBox = await page.locator(commandZone).boundingBox();
  if (!cardBox || !commandZoneBox) throw new Error("missing bounding box");

  await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(commandZoneBox.x + commandZoneBox.width / 2, commandZoneBox.y + commandZoneBox.height / 2, {
    steps: 10,
  });

  // Give the drag a moment to settle mid-flight, then confirm the zone never armed.
  await page.mouse.move(
    commandZoneBox.x + commandZoneBox.width / 2 + 5,
    commandZoneBox.y + commandZoneBox.height / 2,
    { steps: 5 }
  );
  expect(await boxShadowOf(page, commandZone)).toBe("none");

  await page.mouse.up();
});

test("dragging another player's commander over your command zone does not arm it", async ({ page, baseURL }) => {
  const tableSlug = `verify-armed-othercmdr-${Date.now()}`;
  const otherSeatId = `other-seat-${Date.now()}`;
  await page.goto(`/t/${tableSlug}`);
  await expect(page.locator(".tl-canvas")).toBeVisible({ timeout: 15000 });

  const instanceId = randomUUID();
  const event = cardPlayed(tableSlug, {
    cardName: "Atraxa, Praetors' Voice",
    card: { scryfallId: randomUUID(), instanceId },
    zoneHint: "stack",
    isCommander: true,
    owner: otherSeatId,
  });
  event.initiator = { seatId: otherSeatId, playerName: "Other" };
  const response = await page.request.post(`${baseURL}/api/tables/${tableSlug}/cards`, { data: event });
  expect(response.status()).toBe(201);

  const card = page.locator(`#shape\\:card-${instanceId}`);
  await expect(card).toBeAttached();

  const ownEvent = cardPlayed(tableSlug, {
    cardName: "Llanowar Elves",
    card: { scryfallId: randomUUID(), instanceId: randomUUID() },
    zoneHint: "stack",
  });
  const ownResponse = await page.request.post(`${baseURL}/api/tables/${tableSlug}/cards`, { data: ownEvent });
  expect(ownResponse.status()).toBe(201);

  const commandZone = `[data-shape-id="shape:region-command-${tableSlug}-e2e-seat"]`;
  await expect(page.locator(commandZone)).toBeAttached();
  await zoomToFit(page);

  const cardBox = await card.boundingBox();
  const commandZoneBox = await page.locator(commandZone).boundingBox();
  if (!cardBox || !commandZoneBox) throw new Error("missing bounding box");

  await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(commandZoneBox.x + commandZoneBox.width / 2, commandZoneBox.y + commandZoneBox.height / 2, {
    steps: 10,
  });

  await page.mouse.move(
    commandZoneBox.x + commandZoneBox.width / 2 + 5,
    commandZoneBox.y + commandZoneBox.height / 2,
    { steps: 5 }
  );
  expect(await boxShadowOf(page, commandZone)).toBe("none");

  await page.mouse.up();
});

test("dragging a multi-card selection arms only the one zone under the pointer, not one per card", async ({
  page,
  baseURL,
}) => {
  const tableSlug = `verify-armed-multi-${Date.now()}`;
  await page.goto(`/t/${tableSlug}`);
  await expect(page.locator(".tl-canvas")).toBeVisible({ timeout: 15000 });

  const instanceIdA = randomUUID();
  const instanceIdB = randomUUID();
  for (const [instanceId, scryfallId] of [
    [instanceIdA, randomUUID()],
    [instanceIdB, randomUUID()],
  ]) {
    const response = await page.request.post(`${baseURL}/api/tables/${tableSlug}/cards`, {
      data: cardPlayed(tableSlug, { cardName: "Llanowar Elves", card: { scryfallId, instanceId }, zoneHint: "battlefield" }),
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
  await spreadCardApart(page, instanceIdB, 150, 0);

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

    const instanceId = randomUUID();
    const event = cardPlayed(tableSlug, {
      cardName: "Llanowar Elves",
      card: { scryfallId: randomUUID(), instanceId },
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

    expect(await boxShadowOf(pageB, graveyard)).toBe("none");

    await pageA.mouse.up();
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});
