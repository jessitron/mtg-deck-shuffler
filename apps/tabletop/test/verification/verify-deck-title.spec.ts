import { test, expect, Browser } from "@playwright/test";
import { randomUUID } from "node:crypto";

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
    origin: "shuffler.shuffleUp",
    significance: "administrative",
    visibility: "public",
    traceparent: fakeTraceparent(),
    schemaVersion: 1,
    payload: {
      deckName: "E2E Deck",
      playmatImageUrl: "https://example.com/e2e-playmat.png",
      cardBackImageUrl: "https://example.com/e2e-card-back.jpg",
      // A near-black primary and a light gold secondary: the title text must take the
      // darker of the two (#1a0a2e), rendered in Orbitron.
      primaryColor: "#1a0a2e",
      secondaryColor: "#f0e68c",
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

test("the deck title is editable, locked furniture, and edits sync live and survive reload", async ({ browser, baseURL }) => {
  const tableSlug = `verify-deck-title-${Date.now()}`;
  const alice = await openTable(browser, tableSlug);

  const event = seatJoined(tableSlug, { seatId: `e2e-seat-title-${Date.now()}`, playerName: "Jess" });
  const response = await alice.page.request.post(`${baseURL}/api/tables/${tableSlug}/events`, { data: event });
  expect(response.status()).toBe(201);

  const titleShape = alice.page.locator(`.tl-shape[data-shape-type="mtg-title"]`);
  await expect(titleShape).toHaveCount(1, { timeout: 10000 });
  const input = alice.page.getByTestId("mtg-title-input");
  await expect(input).toHaveValue("Jess 〜 E2E Deck");

  // On-brand: Orbitron, colored with the deck's darker identity color (#1a0a2e).
  const font = await input.evaluate((el) => getComputedStyle(el).fontFamily);
  expect(font.toLowerCase()).toContain("orbitron");
  const color = await input.evaluate((el) => getComputedStyle(el).color);
  expect(color).toBe("rgb(26, 10, 46)");

  // A second browser sees the starting title.
  const bob = await openTable(browser, tableSlug);
  const bobInput = bob.page.getByTestId("mtg-title-input");
  await expect(bobInput).toHaveValue("Jess 〜 E2E Deck", { timeout: 10000 });

  // Alice retitles. The letters must reach the field (keystroke shielding), not
  // trigger tldraw's tool hotkeys, and the commit must survive the shape lock.
  await input.click();
  await expect(input).toBeFocused();
  await alice.page.keyboard.press("ControlOrMeta+a");
  await alice.page.keyboard.type("Reanimator deck");
  await alice.page.keyboard.press("Enter");
  await expect(input).toHaveValue("Reanimator deck");
  await expect(bobInput).toHaveValue("Reanimator deck", { timeout: 10000 });

  // The edit survives a reload (it lives in the synced room store).
  await alice.page.reload();
  await expect(alice.page.locator(".tl-canvas")).toBeVisible({ timeout: 15000 });
  await expect(alice.page.getByTestId("mtg-title-input")).toHaveValue("Reanimator deck", { timeout: 10000 });

  await alice.context.close();
  await bob.context.close();
});
