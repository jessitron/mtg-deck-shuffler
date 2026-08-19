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

async function zoomToFit(page: Page) {
  await page.keyboard.press("Shift+1");
  await page.waitForTimeout(300);
}

async function placeCard(page: Page, baseURL: string | undefined, tableSlug: string, instanceId: string, overrides: Record<string, unknown> = {}) {
  const response = await page.request.post(`${baseURL}/test/tables/${tableSlug}/cards`, {
    data: cardPlayed(tableSlug, {
      card: { scryfallId: randomUUID(), instanceId },
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

test("flipping and turning face down both sync to a second client", async ({ browser, baseURL }) => {
  const tableSlug = `verify-flip-2client-${Date.now()}`;
  const contexts: BrowserContext[] = [];
  try {
    const seatResponse = await fetch(`${baseURL}/api/tables/${tableSlug}/events`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(seatJoined(tableSlug, { cardBackImageUrl: "https://example.com/e2e-card-back-2client.jpg" })),
    });
    expect(seatResponse.status).toBe(201);

    const [ctxAlice, ctxBob] = await Promise.all([browser.newContext(), browser.newContext()]);
    contexts.push(ctxAlice, ctxBob);
    const [alice, bob] = await Promise.all([ctxAlice.newPage(), ctxBob.newPage()]);
    await Promise.all([alice.goto(`/t/${tableSlug}`), bob.goto(`/t/${tableSlug}`)]);
    await Promise.all([
      expect(alice.locator(".tl-canvas")).toBeVisible({ timeout: 15000 }),
      expect(bob.locator(".tl-canvas")).toBeVisible({ timeout: 15000 }),
    ]);

    const instanceId = randomUUID();
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

    await openCardMenu(alice, instanceId);
    await chooseMenuItem(alice, "Turn face down");

    await expect(async () => {
      expect(await cardSrc(alice, instanceId)).toBe("https://example.com/e2e-card-back-2client.jpg");
    }).toPass({ timeout: 5000 });
    await expect(async () => {
      expect(await cardSrc(bob, instanceId)).toBe("https://example.com/e2e-card-back-2client.jpg");
    }).toPass({ timeout: 5000 });
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});

test("a one-faced card has no Flip item, only Turn face down", async ({ page, baseURL }) => {
  const tableSlug = `verify-flip-gate-${Date.now()}`;
  const seatResponse = await page.request.post(`${baseURL}/api/tables/${tableSlug}/events`, {
    data: seatJoined(tableSlug, {}),
  });
  expect(seatResponse.status()).toBe(201);

  await page.goto(`/t/${tableSlug}`);
  await expect(page.locator(".tl-canvas")).toBeVisible({ timeout: 15000 });

  const instanceId = randomUUID();
  await placeCard(page, baseURL, tableSlug, instanceId, { backImageUrl: null });
  await zoomToFit(page);

  await openCardMenu(page, instanceId);
  await expect(page.getByRole("menuitem", { name: "Turn face down", exact: true })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Flip", exact: true })).toHaveCount(0);
});

test("turning a card face down shows the table's card back, unsleeved", async ({ page, baseURL }) => {
  const tableSlug = `verify-facedown-${Date.now()}`;
  const cardBackImageUrl = "https://example.com/e2e-card-back.jpg";

  const seatResponse = await page.request.post(`${baseURL}/api/tables/${tableSlug}/events`, {
    data: seatJoined(tableSlug, { cardBackImageUrl }),
  });
  expect(seatResponse.status()).toBe(201);

  await page.goto(`/t/${tableSlug}`);
  await expect(page.locator(".tl-canvas")).toBeVisible({ timeout: 15000 });

  const instanceId = randomUUID();
  const frontImageUrl = cardPlayed(tableSlug, {}).payload.frontImageUrl as string;
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

  const seatResponse = await page.request.post(`${baseURL}/api/tables/${tableSlug}/events`, {
    data: seatJoined(tableSlug, { cardBackImageUrl }),
  });
  expect(seatResponse.status()).toBe(201);

  await page.goto(`/t/${tableSlug}`);
  await expect(page.locator(".tl-canvas")).toBeVisible({ timeout: 15000 });

  const instanceId = randomUUID();
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

  const frontImageUrl = cardPlayed(tableSlug, {}).payload.frontImageUrl as string;
  await expect(async () => {
    expect(await cardSrc(page, instanceId)).toBe(frontImageUrl);
  }).toPass({ timeout: 5000 });
});

test("flipping card A does not leave a stale selection that hijacks a later drag of card B", async ({ page, baseURL }) => {
  const tableSlug = `verify-flip-selection-${Date.now()}`;
  const seatResponse = await page.request.post(`${baseURL}/api/tables/${tableSlug}/events`, {
    data: seatJoined(tableSlug, {}),
  });
  expect(seatResponse.status()).toBe(201);

  await page.goto(`/t/${tableSlug}`);
  await expect(page.locator(".tl-canvas")).toBeVisible({ timeout: 15000 });

  const idA = randomUUID();
  const idB = randomUUID();
  await placeCard(page, baseURL, tableSlug, idA, { backImageUrl: "https://example.com/back-a.jpg", zoneHint: "battlefield" });
  await placeCard(page, baseURL, tableSlug, idB, { zoneHint: "battlefield" });
  await zoomToFit(page);
  // Both cards cascade onto the Stack now that lands no longer auto-place on the
  // playmat, so they arrive overlapping — separate them before targeting either one.
  await spreadCardApart(page, idB, 150, 0);

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
