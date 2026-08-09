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
