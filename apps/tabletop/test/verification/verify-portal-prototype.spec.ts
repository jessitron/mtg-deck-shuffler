import { test, expect, Page } from "@playwright/test";

/**
 * PROTOTYPE smoke (wayfinder cards-come-and-go ticket 04, throwaway with the
 * rest of the portal prototype): dragging a card over the library arms the
 * portal overlay, and dropping it swallows the card. Not a design assertion —
 * just proof the gesture works in a live browser before Jess judges the feel.
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

for (const variant of ["A", "B", "C"] as const) {
  test(`variant ${variant}: the library arms while a card drags over it, then swallows it on drop`, async ({
    page,
    baseURL,
  }) => {
    const tableSlug = `verify-portal-${variant.toLowerCase()}-${Date.now()}`;
    await page.goto(`/t/${tableSlug}?variant=${variant}`);
    await expect(page.locator(".tl-canvas")).toBeVisible({ timeout: 15000 });

    // The switcher bar must be visible on loopback even in a production
    // build — the fleet's ./run serves the built bundle, and an
    // import.meta.env.DEV gate once hid the bar exactly where Jess reviews.
    await expect(page.getByText(`PROTOTYPE ${variant}`)).toBeVisible();

    const instanceId = `portal-${variant}-${Date.now()}`;
    const response = await page.request.post(`${baseURL}/api/tables/${tableSlug}/cards`, {
      data: cardPlayed({
        cardName: "Llanowar Elves",
        card: { scryfallId: "aaaaaaaa-0000-0000-0000-000000000042", instanceId },
        zoneHint: "stack",
      }),
    });
    expect(response.status()).toBe(201);

    const card = page.locator(`#shape\\:card-${instanceId}`);
    await expect(card).toBeAttached();

    const library = page.locator(`[data-shape-id="shape:library-${tableSlug}-e2e-seat"]`);
    const graveyard = page.locator(`[data-shape-id="shape:region-graveyard-${tableSlug}-e2e-seat"]`);
    await expect(library).toBeAttached();
    await zoomToFit(page);

    const cardBox = await card.boundingBox();
    const libraryBox = await library.boundingBox();
    const graveyardBox = await graveyard.boundingBox();
    if (!cardBox || !libraryBox || !graveyardBox) throw new Error("missing bounding box");

    await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
    await page.mouse.down();

    // Over the graveyard the portal must stay quiet — it's library-only.
    await page.mouse.move(graveyardBox.x + graveyardBox.width / 2, graveyardBox.y + graveyardBox.height / 2, {
      steps: 10,
    });
    await expect(page.getByTestId("portal-arming")).not.toBeAttached();

    // Over the library it arms.
    await page.mouse.move(libraryBox.x + libraryBox.width / 2, libraryBox.y + libraryBox.height / 2, { steps: 10 });
    await expect(page.getByTestId("portal-arming")).toBeAttached({ timeout: 5000 });

    // Drop: the card is swallowed (instantly on A, after a short travel on B/C).
    await page.mouse.up();
    await expect(card).not.toBeAttached({ timeout: 5000 });
    await expect(page.getByTestId("portal-arming")).not.toBeAttached();
  });
}

test("multi-select drop on the library swallows the whole group — the pointer picks the one destination", async ({
  page,
  baseURL,
}) => {
  const tableSlug = `verify-portal-multi-${Date.now()}`;
  await page.goto(`/t/${tableSlug}?variant=A`);
  await expect(page.locator(".tl-canvas")).toBeVisible({ timeout: 15000 });

  const instanceIdA = `portal-multi-a-${Date.now()}`;
  const instanceIdB = `portal-multi-b-${Date.now()}`;
  for (const [instanceId, scryfallId] of [
    [instanceIdA, "aaaaaaaa-0000-0000-0000-000000000043"],
    [instanceIdB, "aaaaaaaa-0000-0000-0000-000000000044"],
  ]) {
    // "battlefield" so the two cards land at distinct grid positions — B's
    // center will NOT land in the library when the group settles, which is
    // exactly what this test is about: the pointer decides for everyone.
    const response = await page.request.post(`${baseURL}/api/tables/${tableSlug}/cards`, {
      data: cardPlayed({ cardName: "Llanowar Elves", card: { scryfallId, instanceId }, zoneHint: "battlefield" }),
    });
    expect(response.status()).toBe(201);
  }

  const cardA = page.locator(`#shape\\:card-${instanceIdA}`);
  const cardB = page.locator(`#shape\\:card-${instanceIdB}`);
  await expect(cardA).toBeAttached();
  await expect(cardB).toBeAttached();

  const library = page.locator(`[data-shape-id="shape:library-${tableSlug}-e2e-seat"]`);
  await expect(library).toBeAttached();
  await zoomToFit(page);

  // Select via rubber-band brush, NOT clicks: mtg-card defines onClick, so a
  // click is handled as a tap and selects nothing — click/shift-click would
  // leave the selection empty and the drag would force-select just one card.
  const cardBox = await cardA.boundingBox();
  const cardBoxB = await cardB.boundingBox();
  const libraryBox = await library.boundingBox();
  if (!cardBox || !cardBoxB || !libraryBox) throw new Error("missing bounding box");

  const brushLeft = Math.min(cardBox.x, cardBoxB.x) - 20;
  const brushTop = Math.min(cardBox.y, cardBoxB.y) - 20;
  const brushRight = Math.max(cardBox.x + cardBox.width, cardBoxB.x + cardBoxB.width) + 20;
  const brushBottom = Math.max(cardBox.y + cardBox.height, cardBoxB.y + cardBoxB.height) + 20;
  await page.mouse.move(brushLeft, brushTop);
  await page.mouse.down();
  await page.mouse.move(brushRight, brushBottom, { steps: 10 });
  await page.mouse.up();

  await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(libraryBox.x + libraryBox.width / 2, libraryBox.y + libraryBox.height / 2, { steps: 10 });
  await page.mouse.up();

  await expect(cardA).not.toBeAttached({ timeout: 5000 });
  await expect(cardB).not.toBeAttached({ timeout: 5000 });
});
