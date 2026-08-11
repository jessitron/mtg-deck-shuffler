
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3001';

const SHARED_TOKENS = [
  '--deep-space', '--dark-pink', '--light-pink', '--cute-heading-color', '--narrow-border', '--mana-G',
  '--font-chrome', '--font-content', '--font-display', '--radius-soft',
];

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
    const styles = await (await request.get(`${BASE_URL}/styles.css`)).text();
    for (const token of SHARED_TOKENS) {
      expect(styles, `${token} should live only in @fleet/design-tokens, not be mirrored in styles.css`).not.toContain(`${token}:`);
    }
  });
});
