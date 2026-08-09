// Screenshots of the ticket-16 picker prototype variants (A, B open, C).
import { chromium } from "playwright";

const base = process.env.BASE_URL || "http://localhost:3399";
const prepPath = process.env.PREP_PATH || "/prepare/1";
const outDir = process.env.OUT_DIR || "/Users/jessitron/.claude/jobs/55b732d4/tmp";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });

for (const v of ["A", "B", "C"]) {
  await page.goto(`${base}${prepPath}?variant=${v}`, { waitUntil: "networkidle" });
  if (v === "B") {
    await page.click(".proto16-drawer-summary");
    await page.waitForTimeout(200);
  }
  await page.screenshot({ path: `${outDir}/proto16-variant-${v}.png`, fullPage: true });
  console.log(`variant ${v} captured`);
}

// Bonus: variant A with a different mat + a sleeve picked, to see live preview
await page.goto(`${base}${prepPath}?variant=A`, { waitUntil: "networkidle" });
await page.click('.proto16-mat-swatch[data-mat-name="Terrasymbiosis"]');
await page.click('.proto16-sleeve-swatch[data-sleeve="#3c99e5"]');
await page.waitForTimeout(200);
await page.screenshot({ path: `${outDir}/proto16-variant-A-picked.png`, fullPage: true });
console.log("variant A with picks captured");

await browser.close();
