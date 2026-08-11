
import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:5183";

const SHARED_TOKENS = [
  "--deep-space", "--dark-pink", "--light-pink", "--cute-heading-color", "--narrow-border", "--mana-G",
  "--font-chrome", "--font-content", "--font-display", "--radius-soft",
];

test.describe("the fleet palette reaches the Tabletop", () => {
  test("every shared token resolves in the browser", async ({ page }) => {
    await page.goto(`${BASE_URL}/t/token-resolve-check`);

    const resolved = await page.evaluate((tokens) => {
      const style = getComputedStyle(document.documentElement);
      return Object.fromEntries(tokens.map((t) => [t, style.getPropertyValue(t).trim()]));
    }, SHARED_TOKENS);

    for (const token of SHARED_TOKENS) {
      expect(resolved[token], `${token} should resolve — an empty value means @fleet/design-tokens did not make it into the bundle`).not.toBe("");
    }
  });

  test("the palette matches the Shuffler's, because it is literally the same file", async ({ page }) => {
    await page.goto(`${BASE_URL}/t/token-palette-check`);
    const deepSpace = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--deep-space").trim());
    expect(deepSpace.toLowerCase()).toBe("#221534");
  });

  test("Orbitron can actually be fetched and used", async ({ page }) => {
    await page.goto(`${BASE_URL}/t/token-orbitron-check`);

    const hasOrbitron = await page.evaluate(async () => {
      await document.fonts.load("16px Orbitron");
      return document.fonts.check("16px Orbitron");
    });

    expect(hasOrbitron, "Orbitron should be fetchable — a miss falls back to a system serif, silently").toBe(true);
  });

  test("the tokens reach a table page", async ({ page }) => {
    await page.goto(`${BASE_URL}/t/token-check`);
    const deepSpace = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--deep-space").trim());
    expect(deepSpace, "the table page should carry the tokens — this is the page mtg-zone will render on").not.toBe("");
  });
});
