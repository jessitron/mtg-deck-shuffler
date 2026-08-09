import { test, expect, Page, BrowserContext } from "@playwright/test";

/**
 * Ticket 16 (multi-untap): with several cards marquee-selected, clicking one
 * propagates that card's NEW tapped state to the whole selection — and the
 * whole gesture is ONE undo entry.
 *
 * This is the required regression test for a deliberate dependency on
 * undocumented tldraw internals: PointingShape.onPointerUp calls
 * markHistoryStoppingPoint() and updateShapes() AFTER onClick returns, so the
 * propagated writes are deferred via queueMicrotask to land in the same (new)
 * undo entry as the clicked card's own change. If a tldraw upgrade reorders
 * that, the one-Ctrl+Z assertions here are the tripwire.
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
    zoneHint: "battlefield",
    ...overrides,
  };
}

async function zoomToFit(page: Page) {
  await page.keyboard.press("Shift+1");
  await page.waitForTimeout(300);
}

// Cards are portrait (170x238) and arrive unrotated, so on-screen orientation
// is a scale-proof read of tapped state: tapped = landscape.
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
    data: cardPlayed({
      cardName: "Llanowar Elves",
      card: { scryfallId: `aaaaaaaa-0000-0000-0000-${instanceId.slice(-12).padStart(12, "0")}`, instanceId },
      ...overrides,
    }),
  });
  expect(response.status()).toBe(201);
  await expect(page.locator(`#shape\\:card-${instanceId}`)).toBeAttached();
}

// Marquee-select by brushing a rect that covers the given cards. Starting
// over locked furniture (the playmat) is fine — tldraw treats pointer-down
// on a locked shape as canvas, which starts a brush.
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
  // Double-click cooldown: a click too soon after this mouse-up could be
  // classified by tldraw as part of a double-click gesture.
  await page.waitForTimeout(500);
}

const ts = () => `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

test("clicking one selected card taps the whole selection, and one Ctrl+Z reverts it together, leaving an earlier tap alone", async ({
  page,
  baseURL,
}) => {
  const tableSlug = `verify-multi-untap-${Date.now()}`;
  await page.goto(`/t/${tableSlug}`);
  await expect(page.locator(".tl-canvas")).toBeVisible({ timeout: 15000 });

  // A goes on the Stack — far from the battlefield, so the marquee over B+C
  // can't catch it. B and C land at distinct battlefield grid positions.
  const idA = `multi-a-${ts()}`;
  const idB = `multi-b-${ts()}`;
  const idC = `multi-c-${ts()}`;
  await placeCard(page, baseURL, tableSlug, idA, { zoneHint: "stack" });
  await placeCard(page, baseURL, tableSlug, idB);
  await placeCard(page, baseURL, tableSlug, idC);
  await zoomToFit(page);

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

  const idB = `mixed-b-${ts()}`;
  const idC = `mixed-c-${ts()}`;
  await placeCard(page, baseURL, tableSlug, idB);
  await placeCard(page, baseURL, tableSlug, idC);
  await zoomToFit(page);

  // Tap C alone so the selection starts mixed: B untapped, C tapped.
  await page.locator(`#shape\\:card-${idC}`).click();
  await expectTapped(page, idC, true);
  await page.waitForTimeout(500);

  // Click B (untapped -> tapped): C must STAY tapped, not toggle to untapped.
  await marqueeSelect(page, [idB, idC]);
  await page.locator(`#shape\\:card-${idB}`).click();
  await expectTapped(page, idB, true);
  await expectTapped(page, idC, true);

  // And the other direction: click B again (tapped -> untapped) unteps both.
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

    const idB = `2client-b-${ts()}`;
    const idC = `2client-c-${ts()}`;
    await placeCard(alice, baseURL, tableSlug, idB);
    await placeCard(alice, baseURL, tableSlug, idC);
    await expect(bob.locator(`#shape\\:card-${idB}`)).toBeAttached();
    await expect(bob.locator(`#shape\\:card-${idC}`)).toBeAttached();
    await Promise.all([zoomToFit(alice), zoomToFit(bob)]);

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
