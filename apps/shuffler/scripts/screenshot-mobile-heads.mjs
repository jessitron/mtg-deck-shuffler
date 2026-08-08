/**
 * One-off review aid for arch ticket 06: the unified page shell added
 * <meta viewport> to the EJS pages, which changes phone rendering.
 * Screenshots / and /prepare at 375px so Jess can see the effect.
 *
 * Usage: node scripts/screenshot-mobile-heads.mjs <baseUrl> <outDir>
 * (start the server first, e.g. PORT=3399 PORT_PERSIST_STATE=in-memory node dist/server.js)
 */
import { chromium } from "@playwright/test";

const [baseUrl, outDir] = process.argv.slice(2);
if (!baseUrl || !outDir) {
  console.error("Usage: node scripts/screenshot-mobile-heads.mjs <baseUrl> <outDir>");
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 375, height: 812 } });

await page.goto(`${baseUrl}/`);
await page.waitForLoadState("networkidle");
await page.screenshot({ path: `${outDir}/home-375px.png`, fullPage: true });
console.log(`saved ${outDir}/home-375px.png`);

await page.goto(`${baseUrl}/choose-any-deck`);
await page.locator(".precon-tile").first().click();
await page.waitForURL("**/prepare/*");
await page.waitForLoadState("networkidle");
await page.screenshot({ path: `${outDir}/prepare-375px.png`, fullPage: true });
console.log(`saved ${outDir}/prepare-375px.png`);

await browser.close();
