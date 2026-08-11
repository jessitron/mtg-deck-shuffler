import { test, expect, Browser } from "@playwright/test";
import { randomUUID } from "node:crypto";

/**
 * Ticket 20 (table-layout): the life counter on the name row. Locked
 * furniture with +/- buttons and a directly-typeable field; any player can
 * change any counter, and changes sync live to every browser (last-writer-
 * wins, tldraw sync).
 */
function fakeTraceparent(): string {
  return `00-${randomUUID().replace(/-/g, "")}-${randomUUID().replace(/-/g, "").slice(0, 16)}-01`;
}

function seatJoined(tableId: string, initiator: { seatId: string; playerName: string }) {
  return {
    id: randomUUID(),
    tableId,
    name: "seat.joined",
    occurredAt: new Date().toISOString(),
    initiator,
    occurredIn: "shuffler",
    visibility: "public",
    traceparent: fakeTraceparent(),
    schemaVersion: 1,
    payload: {
      deckName: "E2E Deck",
      playmatImageUrl: "https://example.com/e2e-playmat.png",
      cardBackImageUrl: "https://example.com/e2e-card-back.jpg",
    },
  };
}

async function openTable(browser: Browser, tableSlug: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`/t/${tableSlug}`);
  await expect(page.locator(".tl-canvas")).toBeVisible({ timeout: 15000 });
  return { context, page };
}

test("life counter starts at 40, is locked furniture, and +/- and typing sync live to a second browser", async ({
  browser,
  baseURL,
}) => {
  const tableSlug = `verify-life-counter-${Date.now()}`;
  const alice = await openTable(browser, tableSlug);

  const event = seatJoined(tableSlug, { seatId: `e2e-seat-life-${Date.now()}`, playerName: "Jess" });
  const response = await alice.page.request.post(`${baseURL}/api/tables/${tableSlug}/events`, { data: event });
  expect(response.status()).toBe(201);

  const counterShape = alice.page.locator(`.tl-shape[data-shape-type="mtg-life-counter"]`);
  await expect(counterShape).toHaveCount(1, { timeout: 10000 });
  const input = alice.page.getByTestId("mtg-life-counter-input");
  await expect(input).toHaveValue("40");

  const bob = await openTable(browser, tableSlug);
  const bobInput = bob.page.getByTestId("mtg-life-counter-input");
  await expect(bobInput).toHaveValue("40", { timeout: 10000 });

  // A locked shape never enters tldraw's selection state on click.
  await counterShape.click();
  await expect(alice.page.locator(".tl-selected")).toHaveCount(0);

  // Alice presses + three times; Bob sees it without touching anything.
  const plus = alice.page.getByRole("button", { name: "increase life" });
  await plus.click();
  await plus.click();
  await plus.click();
  await expect(input).toHaveValue("43");
  await expect(bobInput).toHaveValue("43", { timeout: 10000 });

  // Bob types a direct correction; Alice sees it, and tldraw's own tool
  // hotkeys did not fire while typing (still on the select tool, not e.g.
  // the eraser bound to a stray keystroke).
  await bobInput.click();
  await expect(bobInput).toBeFocused();
  await bob.page.keyboard.press("ControlOrMeta+a");
  await bob.page.keyboard.type("7");
  await bob.page.keyboard.press("Enter");
  await expect(bobInput).toHaveValue("7");
  await expect(input).toHaveValue("7", { timeout: 10000 });

  await alice.context.close();
  await bob.context.close();
});
