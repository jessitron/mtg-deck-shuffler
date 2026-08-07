/**
 * End-to-End Verification: the fleet's shared design tokens reach the browser
 *
 * The palette and the mana colours live in @fleet/design-tokens
 * (packages/design-tokens/tokens.css) and are loaded by BOTH ships, so the
 * Shuffler and the Tabletop look like one app with two faces. They are
 * deliberately NOT mirrored in this ship's own :root — a fallback copy is a
 * second dictionary, and it would hide exactly the failure these tests catch.
 *
 * WHY THESE TESTS EXIST: both halves of the plumbing fail SILENTLY. CSS drops a
 * var() it can't resolve, and a missing font falls back to a system serif, so a
 * broken load looks like a slightly-wrong page rather than an error. Nothing
 * else in the suite would notice.
 *
 * The container is the case to worry about. npm links the workspace as a
 * relative symlink, and the Shuffler's runtime image flattens the workspace, so
 * if the Dockerfile stops copying packages/ the link dangles and /fleet/tokens.css
 * 404s — in prod only, never in dev. verify-container-boot.sh is the gate for
 * that; these tests are the gate for everything else.
 *
 * RUN: npm run test:verify
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3001';

// One token from each group that moved out of this ship and into the package.
// --deep-space is identity; --mana-G is the (closed) colour pie.
const SHARED_TOKENS = [
  '--deep-space', '--dark-pink', '--light-pink', '--cute-heading-color', '--narrow-border', '--mana-G',
  // Type by role, and the pressable radius. The typeface literals used to be
  // written out ~39 times across these stylesheets, and had already drifted
  // (Ovo's fallback stack differed in one place, quoting in several).
  '--font-chrome', '--font-content', '--font-display', '--radius-soft',
];

// This ship has two heads, and they're separate code: views/partials/head.ejs
// (site and pre-game pages) and src/view/common/html-layout.ts (the play pages).
// Wiring one and forgetting the other is the likely miss. The pages below cover
// head.ejs in a real browser; the other head is covered cheaply by the unit test
// in test/html-layout-fleet-tokens.test.ts, since reaching a play page from here
// would mean setting up a whole game.
const PAGES = [
  { name: 'a site page (head.ejs)', path: '/' },
  { name: 'the docs page (head.ejs)', path: '/docs' },
];

test.describe('the fleet palette reaches the Shuffler', () => {
  test('the shared stylesheet is served', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/fleet/tokens.css`);
    expect(response.status(), '/fleet/tokens.css should be served').toBe(200);
    expect(await response.text()).toContain('--deep-space');
  });

  for (const page_ of PAGES) {
    test(`every shared token resolves on ${page_.name}`, async ({ page }) => {
      await page.goto(`${BASE_URL}${page_.path}`);

      const resolved = await page.evaluate((tokens) => {
        const style = getComputedStyle(document.documentElement);
        return Object.fromEntries(tokens.map((t) => [t, style.getPropertyValue(t).trim()]));
      }, SHARED_TOKENS);

      // Asserting non-empty rather than on the hex: this test protects the
      // plumbing, not the palette. Changing a colour is the design owner's call
      // and shouldn't break a wiring test.
      for (const token of SHARED_TOKENS) {
        expect(resolved[token], `${token} should resolve on ${page_.path} — an empty value means the shared sheet did not load`).not.toBe('');
      }
    });
  }

  test('Orbitron actually loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    await page.evaluate(() => document.fonts.ready);
    const hasOrbitron = await page.evaluate(() => document.fonts.check('16px Orbitron'));
    expect(hasOrbitron, 'Orbitron should be loaded — a miss falls back to a system serif, silently').toBe(true);
  });

  test('the tokens are not re-declared in this ship, only loaded', async ({ request }) => {
    // A mirrored copy in styles.css would make every test above pass even with
    // the shared sheet completely broken. That's the failure mode worth guarding.
    const styles = await (await request.get(`${BASE_URL}/styles.css`)).text();
    for (const token of SHARED_TOKENS) {
      expect(styles, `${token} should live only in @fleet/design-tokens, not be mirrored in styles.css`).not.toContain(`${token}:`);
    }
  });
});
