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
    origin: "shuffler.shuffleUp",
    significance: "administrative",
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

test("pressing the life counter's +/- button doesn't disturb an existing selection elsewhere", async ({
  browser,
  baseURL,
}) => {
  // Ticket 05 (tabletop-shape-mechanics-review flagged this as untested):
  // clearStaleSelectionOnPointerDown clears selection on any pointer_down
  // landing on an unselected shape — but the life counter's +/- buttons call
  // editor.markEventAsHandled(e), which useCanvasEvents.ts checks BEFORE
  // calling editor.dispatch at all, so editor.emit('event', ...) (what the
  // new listener subscribes to) never fires for a button press. This test is
  // the tripwire if that upstream gate ever changes.
  const tableSlug = `verify-life-counter-selection-${Date.now()}`;
  const { context, page } = await openTable(browser, tableSlug);

  const event = seatJoined(tableSlug, { seatId: `e2e-seat-life-sel-${Date.now()}`, playerName: "Jess" });
  const response = await page.request.post(`${baseURL}/api/tables/${tableSlug}/events`, { data: event });
  expect(response.status()).toBe(201);
  await expect(page.locator(`.tl-shape[data-shape-type="mtg-life-counter"]`)).toHaveCount(1, { timeout: 10000 });

  // A pasted image is a plain, selectable stock shape — select it by clicking.
  const dataTransfer = await page.evaluateHandle(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "green";
    ctx.fillRect(0, 0, 100, 100);
    const blob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
    const file = new File([blob], "square.png", { type: "image/png" });
    const dt = new DataTransfer();
    dt.items.add(file);
    return dt;
  });
  const canvas = page.locator(".tl-canvas");
  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) throw new Error("missing canvas box");
  const dropAt = { x: canvasBox.x + canvasBox.width / 2, y: canvasBox.y + canvasBox.height / 2 };
  await canvas.dispatchEvent("dragenter", { dataTransfer });
  await canvas.dispatchEvent("dragover", { dataTransfer, clientX: dropAt.x, clientY: dropAt.y });
  await canvas.dispatchEvent("drop", { dataTransfer, clientX: dropAt.x, clientY: dropAt.y });

  const image = page.locator('.tl-shape[data-shape-type="image"]');
  await expect(image).toHaveCount(1, { timeout: 10000 });
  await image.click();
  await expect(page.locator(".tl-selected")).toHaveCount(1);

  const plus = page.getByRole("button", { name: "increase life" });
  await plus.click();
  await expect(page.getByTestId("mtg-life-counter-input")).toHaveValue("41");

  // The image is still selected — the button press didn't clear it.
  await expect(page.locator(".tl-selected")).toHaveCount(1);

  await context.close();
});
