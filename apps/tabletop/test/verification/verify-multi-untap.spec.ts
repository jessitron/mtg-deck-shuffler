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
    visibility: "public",
    traceparent: fakeTraceparent(),
    schemaVersion: 1,
    payload: {
      face: "front",
      frontImageUrl: "https://cards.scryfall.io/normal/front/6/8/688b73bb-7952-4a1b-a878-49f13cf3ba25.jpg",
      backImageUrl: null,
      zoneHint: "battlefield",
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

async function isTapped(page: Page, instanceId: string): Promise<boolean> {
  const box = await page.locator(`#shape\\:card-${instanceId}`).boundingBox();
  if (!box) throw new Error(`no bounding box for card ${instanceId}`);
  return box.width > box.height;
}

async function expectTapped(page: Page, instanceId: string, tapped: boolean) {
  await expect(async () => {
    expect(await isTapped(page, instanceId)).toBe(tapped);
  }).toPass({ timeout: 5000 });
}

async function placeCard(page: Page, baseURL: string | undefined, tableSlug: string, instanceId: string, overrides: Record<string, unknown> = {}) {
  const response = await page.request.post(`${baseURL}/api/tables/${tableSlug}/cards`, {
    data: cardPlayed(tableSlug, {
      cardName: "Llanowar Elves",
      card: { scryfallId: randomUUID(), instanceId },
      ...overrides,
    }),
  });
  expect(response.status()).toBe(201);
  await expect(page.locator(`#shape\\:card-${instanceId}`)).toBeAttached();
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

async function marqueeSelect(page: Page, instanceIds: string[]) {
  const boxes = [];
  for (const id of instanceIds) {
    const box = await page.locator(`#shape\\:card-${id}`).boundingBox();
    if (!box) throw new Error(`no bounding box for card ${id}`);
    boxes.push(box);
  }
  const left = Math.min(...boxes.map((b) => b.x));
  const top = Math.min(...boxes.map((b) => b.y));
  const right = Math.max(...boxes.map((b) => b.x + b.width));
  const bottom = Math.max(...boxes.map((b) => b.y + b.height));
  await page.mouse.move(left - 15, top - 15);
  await page.mouse.down();
  await page.mouse.move(right + 15, bottom + 15, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(500);
}

const uniqueSuffix = () => `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

test("clicking one selected card taps the whole selection, and one Ctrl+Z reverts it together, leaving an earlier tap alone", async ({
  page,
  baseURL,
}) => {
  const tableSlug = `verify-multi-untap-${Date.now()}`;
  await page.goto(`/t/${tableSlug}`);
  await expect(page.locator(".tl-canvas")).toBeVisible({ timeout: 15000 });

  const idA = randomUUID();
  const idB = randomUUID();
  const idC = randomUUID();
  await placeCard(page, baseURL, tableSlug, idA, { zoneHint: "stack" });
  await placeCard(page, baseURL, tableSlug, idB);
  await placeCard(page, baseURL, tableSlug, idC);
  await zoomToFit(page);
  await spreadCardApart(page, idC, 150, 0);
  await spreadCardApart(page, idB, 150, 150);

  // The earlier, unrelated tap: A alone.
  await page.locator(`#shape\\:card-${idA}`).click();
  await expectTapped(page, idA, true);
  await page.waitForTimeout(500);

  // Marquee B+C, then click B: B's new state (tapped) propagates to C.
  await marqueeSelect(page, [idB, idC]);
  await page.locator(`#shape\\:card-${idB}`).click();
  await expectTapped(page, idB, true);
  await expectTapped(page, idC, true);

  // ONE undo reverts the whole gesture — both B and C — and A stays tapped.
  await page.keyboard.press("ControlOrMeta+z");
  await expectTapped(page, idB, false);
  await expectTapped(page, idC, false);
  await expectTapped(page, idA, true);
});

test("propagation pushes the clicked card's new state, not a per-card toggle", async ({ page, baseURL }) => {
  const tableSlug = `verify-multi-mixed-${Date.now()}`;
  await page.goto(`/t/${tableSlug}`);
  await expect(page.locator(".tl-canvas")).toBeVisible({ timeout: 15000 });

  const idB = randomUUID();
  const idC = randomUUID();
  await placeCard(page, baseURL, tableSlug, idB);
  await placeCard(page, baseURL, tableSlug, idC);
  await zoomToFit(page);
  await spreadCardApart(page, idC, 150, 0);

  // Tap C alone so the selection starts mixed: B untapped, C tapped.
  await page.locator(`#shape\\:card-${idC}`).click();
  await expectTapped(page, idC, true);
  await page.waitForTimeout(500);

  // Click B (untapped -> tapped): C must STAY tapped, not toggle to untapped.
  await marqueeSelect(page, [idB, idC]);
  await page.locator(`#shape\\:card-${idB}`).click();
  await expectTapped(page, idB, true);
  await expectTapped(page, idC, true);

  // And the other direction: click B again (tapped -> untapped) untaps both.
  await page.waitForTimeout(500);
  await page.locator(`#shape\\:card-${idB}`).click();
  await expectTapped(page, idB, false);
  await expectTapped(page, idC, false);
});

test("another player's undo stack stays independent of a multi-untap", async ({ browser, baseURL }) => {
  const tableSlug = `verify-multi-2client-${Date.now()}`;
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

    const idB = randomUUID();
    const idC = randomUUID();
    await placeCard(alice, baseURL, tableSlug, idB);
    await placeCard(alice, baseURL, tableSlug, idC);
    await expect(bob.locator(`#shape\\:card-${idB}`)).toBeAttached();
    await expect(bob.locator(`#shape\\:card-${idC}`)).toBeAttached();
    await Promise.all([zoomToFit(alice), zoomToFit(bob)]);
    await spreadCardApart(alice, idC, 150, 0);
    await bob.waitForTimeout(300); // let the move sync to Bob before Alice's multi-tap gesture

    // Alice multi-taps B+C; both clients see it.
    await marqueeSelect(alice, [idB, idC]);
    await alice.locator(`#shape\\:card-${idB}`).click();
    await expectTapped(alice, idB, true);
    await expectTapped(alice, idC, true);
    await expectTapped(bob, idB, true);
    await expectTapped(bob, idC, true);

    // Bob's undo is a no-op — Alice's change never entered his local history.
    await bob.keyboard.press("ControlOrMeta+z");
    await bob.waitForTimeout(500);
    await expectTapped(bob, idB, true);
    await expectTapped(bob, idC, true);
    await expectTapped(alice, idB, true);
    await expectTapped(alice, idC, true);

    // Alice's own undo still reverts her gesture, and it syncs to Bob.
    await alice.keyboard.press("ControlOrMeta+z");
    await expectTapped(alice, idB, false);
    await expectTapped(alice, idC, false);
    await expectTapped(bob, idB, false);
    await expectTapped(bob, idC, false);
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});
