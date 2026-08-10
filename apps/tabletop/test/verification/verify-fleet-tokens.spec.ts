/**
 * End-to-End Verification: the fleet's shared design tokens reach the Tabletop
 *
 * Before this, `apps/tabletop` had no CSS source file and no font link at all —
 * the client's only stylesheet was tldraw's. So a `var(--…)` resolved to nothing
 * and Orbitron fell back to a system serif, BOTH SILENTLY. That's what these
 * tests exist to catch; nothing else here would notice.
 *
 * The tokens come from @fleet/design-tokens, the same package the Shuffler
 * serves at /fleet/tokens.css, so the two ships look like one app with two
 * faces. This ship gets them through Vite (imported in src/client/main.tsx), so
 * they're inlined into the client bundle rather than served on a route.
 *
 * NOTE: loading Orbitron does NOT put it on tldraw canvas text — tldraw's `geo`
 * shape takes a font enum with no Orbitron in it, and only a self-rendering
 * custom shape can use the typeface on canvas. These tests assert the font is
 * AVAILABLE, which is what the DOM chrome and the future mtg-zone shape need.
 *
 * These all navigate to a /t/:tableSlug page, not "/" — the Tabletop has no
 * landing page (deleted), and "/" now redirects to the Shuffler instead of
 * rendering anything Tabletop-side.
 *
 * RUN: ./verify.sh
 */

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:5183";

const SHARED_TOKENS = [
  "--deep-space", "--dark-pink", "--light-pink", "--cute-heading-color", "--narrow-border", "--mana-G",
  // Type by role, and the pressable radius. These two matter most to THIS ship:
  // a self-rendering tldraw shape passes a font string and a radius from
  // TypeScript, where no stylesheet convention can reach it.
  "--font-chrome", "--font-content", "--font-display", "--radius-soft",
];

test.describe("the fleet palette reaches the Tabletop", () => {
  test("every shared token resolves in the browser", async ({ page }) => {
    await page.goto(`${BASE_URL}/t/token-resolve-check`);

    const resolved = await page.evaluate((tokens) => {
      const style = getComputedStyle(document.documentElement);
      return Object.fromEntries(tokens.map((t) => [t, style.getPropertyValue(t).trim()]));
    }, SHARED_TOKENS);

    // Non-empty, not a specific hex: this protects the plumbing, not the palette.
    // Changing a colour is the design owner's call and must not break wiring.
    for (const token of SHARED_TOKENS) {
      expect(resolved[token], `${token} should resolve — an empty value means @fleet/design-tokens did not make it into the bundle`).not.toBe("");
    }
  });

  test("the palette matches the Shuffler's, because it is literally the same file", async ({ page }) => {
    await page.goto(`${BASE_URL}/t/token-palette-check`);
    const deepSpace = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--deep-space").trim());
    // The one value asserted concretely anywhere, and only to prove the two
    // ships share a dictionary rather than each having their own.
    expect(deepSpace.toLowerCase()).toBe("#221534");
  });

  test("Orbitron can actually be fetched and used", async ({ page }) => {
    await page.goto(`${BASE_URL}/t/token-orbitron-check`);

    // NOTE the explicit load(), which the Shuffler's equivalent test doesn't need.
    // Browsers fetch a webfont lazily — only when something on the page actually
    // uses the family — so a bare document.fonts.check() returns FALSE here even
    // though the <link> is correct. MtgZoneShapeUtil/MtgCounterShapeUtil set
    // `font-family: var(--font-chrome)` on live DOM inside the canvas, but only
    // once a shape of that kind is actually rendered — a bare page load doesn't
    // trigger that.
    //
    // So this asserts what actually matters and is actually true today — the
    // face is declared and its file can be fetched. Swap this for a plain
    // check() the day a page load alone renders something in Orbitron; that
    // would be the stronger assertion.
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
