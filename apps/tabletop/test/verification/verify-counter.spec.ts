import { test, expect, Page, Locator } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { cardPlayed, openTable, placeCard, zoomToFit, center, dragPointTo, dragCenterTo } from "./helpers";


async function topGrip(card: Locator): Promise<{ x: number; y: number }> {
  const box = await card.boundingBox();
  if (!box) throw new Error("missing bounding box");
  return { x: box.x + box.width / 2, y: box.y + box.height * 0.12 };
}

/** Create a blank counter via the toolbar tool, clicking at the given screen point. */
async function createCounter(page: Page, at: { x: number; y: number }) {
  await page.getByTestId("tools.mtg-counter").click();
  await page.mouse.click(at.x, at.y);
  await page.waitForTimeout(500);
}

test("a counter attaches to a card, rides along, and detaches when dragged off", async ({ page, baseURL }) => {
  const tableSlug = `verify-counter-${Date.now()}`;
  await openTable(page, tableSlug);

  const instanceId = randomUUID();
  const card = await placeCard(page, baseURL, tableSlug, instanceId);

  // Zoom to fit so the card (and future drop targets) are actually rendered.
  await zoomToFit(page);

  // 1. The toolbar tool creates a blank counter on the table.
  const cardCenter = await center(card);
  await createCounter(page, { x: cardCenter.x + 300, y: cardCenter.y });
  const counter = page.getByTestId("mtg-counter");
  await expect(counter).toHaveCount(1);
  await expect(counter).toHaveText("");

  const cardBox = await card.boundingBox();
  if (!cardBox) throw new Error("missing card box");
  await dragCenterTo(page, counter, { x: cardCenter.x, y: cardBox.y + cardBox.height * 0.7 });

  // Attached = dragging the card carries the counter along.
  const counterBefore = await center(counter);
  const grip = await topGrip(card);
  await dragPointTo(page, grip, { x: grip.x + 150, y: grip.y + 80 });
  await expect(async () => {
    const counterAfter = await center(counter);
    expect(counterAfter.x - counterBefore.x).toBeCloseTo(150, -1);
    expect(counterAfter.y - counterBefore.y).toBeCloseTo(80, -1);
  }).toPass({ timeout: 5000 });

  // 3. Drag the counter off the card: it detaches and stays where dropped.
  const counterOnCard = await center(counter);
  const detachSpot = { x: counterOnCard.x + 400, y: counterOnCard.y };
  await dragCenterTo(page, counter, detachSpot);
  const gripNow = await topGrip(card);
  await dragPointTo(page, gripNow, { x: gripNow.x - 60, y: gripNow.y - 40 });
  await page.waitForTimeout(300);
  const counterFinal = await center(counter);
  expect(Math.abs(counterFinal.x - detachSpot.x)).toBeLessThan(10);
  expect(Math.abs(counterFinal.y - detachSpot.y)).toBeLessThan(10);
});

test("after dragging a counter, dragging a card moves the card (stale-selection regression)", async ({
  page,
  baseURL,
}) => {
  const tableSlug = `verify-counter-sel-${Date.now()}`;
  await openTable(page, tableSlug);

  const instanceId = randomUUID();
  const card = await placeCard(page, baseURL, tableSlug, instanceId);
  await zoomToFit(page);

  const cardCenter = await center(card);
  await createCounter(page, { x: cardCenter.x + 300, y: cardCenter.y + 120 });
  const counter = page.getByTestId("mtg-counter");
  await expect(counter).toHaveCount(1);

  await dragCenterTo(page, counter, { x: cardCenter.x + 300, y: cardCenter.y + 220 });

  const counterCenter = await center(counter);
  const before = await center(card);
  const grip = await topGrip(card);
  await dragPointTo(page, grip, { x: grip.x + 120, y: grip.y });

  await expect(async () => {
    const after = await center(card);
    expect(after.x - before.x).toBeCloseTo(120, -1);
  }).toPass({ timeout: 5000 });
  const counterAfter = await center(counter);
  expect(Math.abs(counterAfter.x - counterCenter.x)).toBeLessThan(5);
});

test("two counters can share a card and overlap; both detach near the graveyard's edge when the card dies", async ({
  page,
  baseURL,
}) => {
  const tableSlug = `verify-counter-gy-${Date.now()}`;
  await openTable(page, tableSlug);

  const instanceId = randomUUID();
  const card = await placeCard(page, baseURL, tableSlug, instanceId);

  const graveyard = page.locator(`[data-shape-id="shape:region-graveyard-${tableSlug}-e2e-seat"]`);
  await expect(graveyard).toBeAttached();

  await zoomToFit(page);

  const cardCenter = await center(card);
  const counters = page.getByTestId("mtg-counter");

  const cardBox = await card.boundingBox();
  if (!cardBox) throw new Error("missing card box");
  const dropSpot = { x: cardCenter.x, y: cardBox.y + cardBox.height * 0.7 };
  const spawn = { x: cardCenter.x + 300, y: cardCenter.y };
  await createCounter(page, spawn);
  await expect(counters).toHaveCount(1);
  await dragPointTo(page, spawn, dropSpot);
  await createCounter(page, spawn);
  await expect(counters).toHaveCount(2);
  await dragPointTo(page, spawn, { x: dropSpot.x + 6, y: dropSpot.y - 6 });

  const sortedPositions = async () => {
    const boxes = [await center(counters.nth(0)), await center(counters.nth(1))];
    return boxes.sort((a, b) => a.x - b.x || a.y - b.y);
  };
  const positionsBefore = await sortedPositions();
  const grip = await topGrip(card);
  await dragPointTo(page, grip, { x: grip.x + 80, y: grip.y });
  await expect(async () => {
    const moved = await sortedPositions();
    expect(moved[0].x - positionsBefore[0].x).toBeCloseTo(80, -1);
    expect(moved[1].x - positionsBefore[1].x).toBeCloseTo(80, -1);
  }).toPass({ timeout: 5000 });

  const graveyardCenter = await center(graveyard);
  const gripNow = await topGrip(card);
  const cardBoxNow = await card.boundingBox();
  if (!cardBoxNow) throw new Error("missing card box");
  await dragPointTo(page, gripNow, {
    x: graveyardCenter.x,
    y: graveyardCenter.y - cardBoxNow.height * 0.38,
  });

  await expect(async () => {
    const graveyardBox = await graveyard.boundingBox();
    if (!graveyardBox) throw new Error("missing graveyard box");
    for (const i of [0, 1]) {
      const c = await center(counters.nth(i));
      const inside =
        c.x > graveyardBox.x &&
        c.x < graveyardBox.x + graveyardBox.width &&
        c.y > graveyardBox.y &&
        c.y < graveyardBox.y + graveyardBox.height;
      expect(inside).toBe(false);
      // Near the zone's edge: within a few counter-widths of its bounds.
      const margin = 200;
      expect(c.x).toBeGreaterThan(graveyardBox.x - margin);
      expect(c.x).toBeLessThan(graveyardBox.x + graveyardBox.width + margin);
      expect(c.y).toBeGreaterThan(graveyardBox.y - margin);
      expect(c.y).toBeLessThan(graveyardBox.y + graveyardBox.height + margin);
    }
  }).toPass({ timeout: 5000 });

  // The card itself moves in the graveyard afterward without dragging counters back.
  const countersSettled = [await center(counters.nth(0)), await center(counters.nth(1))];
  const cardNow = await center(card);
  await dragCenterTo(page, card, { x: cardNow.x + 15, y: cardNow.y + 15 });
  await page.waitForTimeout(300);
  for (const i of [0, 1]) {
    const c = await center(counters.nth(i));
    expect(Math.abs(c.x - countersSettled[i].x)).toBeLessThan(5);
    expect(Math.abs(c.y - countersSettled[i].y)).toBeLessThan(5);
  }
});

test("a counter's text is editable in place", async ({ page }) => {
  const tableSlug = `verify-counter-text-${Date.now()}`;
  await openTable(page, tableSlug);

  await page.mouse.move(400, 300);
  await createCounter(page, { x: 400, y: 300 });
  const counter = page.getByTestId("mtg-counter");
  await expect(counter).toHaveCount(1);

  await counter.dblclick();
  await page.keyboard.type("+1/+1");
  await page.keyboard.press("Escape");

  await expect(counter).toHaveText("+1/+1");
});

test("text near the wrap boundary (e.g. '+1/+1') stays vertically centered while editing", async ({ page }) => {
  const tableSlug = `verify-counter-center-${Date.now()}`;
  await openTable(page, tableSlug);

  await createCounter(page, { x: 400, y: 300 });
  const counter = page.getByTestId("mtg-counter");
  await expect(counter).toHaveCount(1);

  await counter.dblclick();
  const input = page.getByTestId("mtg-counter-input");
  await expect(input).toBeFocused();
  await page.keyboard.type("+1/+1");

  const centering = await input.evaluate((el: HTMLTextAreaElement) => {
    const style = getComputedStyle(el);
    const borderTop = parseFloat(style.borderTopWidth);
    const borderBottom = parseFloat(style.borderBottomWidth);
    const usableHeight = el.offsetHeight - borderTop - borderBottom;
    const appliedPaddingTop = parseFloat(style.paddingTop);
    const previousPadding = el.style.paddingTop;
    el.style.paddingTop = "0px";
    const contentHeight = el.scrollHeight;
    el.style.paddingTop = previousPadding;
    const expectedPaddingTop = Math.max(0, (usableHeight - contentHeight) / 2);
    return { appliedPaddingTop, expectedPaddingTop };
  });
  expect(Math.abs(centering.appliedPaddingTop - centering.expectedPaddingTop)).toBeLessThanOrEqual(1);

  await page.keyboard.press("Escape");
  await expect(counter).toHaveText("+1/+1");
});

test("a long label like 'lifelink' shrinks to fit inside the disc", async ({ page }) => {
  const tableSlug = `verify-counter-fit-${Date.now()}`;
  await openTable(page, tableSlug);

  await createCounter(page, { x: 400, y: 300 });
  const counter = page.getByTestId("mtg-counter");
  await expect(counter).toHaveCount(1);

  await counter.dblclick();
  await expect(page.getByTestId("mtg-counter-input")).toBeFocused();
  await page.keyboard.type("lifelink");
  await page.keyboard.press("Escape");

  await expect(counter).toHaveText("lifelink");
  const fits = await counter.evaluate((el) => ({
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth,
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight,
  }));
  expect(fits.scrollWidth).toBeLessThanOrEqual(fits.clientWidth);
  expect(fits.scrollHeight).toBeLessThanOrEqual(fits.clientHeight);
  // And it genuinely shrank: a short label renders larger than "lifelink".
  const longSize = await counter.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  await page.waitForTimeout(600);
  await counter.dblclick();
  await expect(page.getByTestId("mtg-counter-input")).toBeFocused();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type("3");
  await page.keyboard.press("Escape");
  await expect(counter).toHaveText("3");
  const shortSize = await counter.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(shortSize).toBeGreaterThan(longSize);
});
