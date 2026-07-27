/**
 * Post-deploy check: is the canvas STILL THERE after the tldraw license gate?
 *
 * Why this exists, and why it is not a Playwright spec under verify.sh:
 * tldraw >= 4 decides "production" from the URL alone — any HTTPS non-loopback
 * hostname — and 5 seconds after load it replaces an unlicensed production
 * editor with a hidden <div data-testid="tl-license-expired">. A blank page.
 * localhost is always "development", so verify.sh (port 5183, http, loopback)
 * is STRUCTURALLY BLIND to this whole failure mode. The only place it can be
 * observed is the deployed host, so this check takes a URL and is run by
 * deploy.sh after the rollout.
 *
 * Usage:
 *   node test/verification/check-deployed-canvas.mjs [baseUrl] [tableName]
 * Defaults to https://table.jessitron.honeydemo.io and a throwaway table name.
 *
 * Exits 0 if the canvas survives, 1 with a diagnosis if it does not.
 */
import { chromium } from "@playwright/test";

const LICENSE_TIMEOUT_MS = 5000; // @tldraw/editor LICENSE_TIMEOUT
const GRACE_MS = 4000; // comfortably past it

const baseUrl = (process.argv[2] ?? "https://table.jessitron.honeydemo.io").replace(/\/$/, "");
const table = process.argv[3] ?? "canvas-check";
const url = `${baseUrl}/t/${encodeURIComponent(table)}`;

const browser = await chromium.launch();
const page = await browser.newPage();

const licenseComplaints = [];
page.on("console", (msg) => {
  // tldraw logs these as "%cMessage" plus a CSS styling arg; drop the styling.
  const text = msg.text().replace(/%c/g, "").replace(/\s*color:\s*white;.*$/, "").trim();
  if (/license/i.test(text)) licenseComplaints.push(text);
});

let failure = null;
try {
  console.log(`Checking ${url}`);
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".tl-canvas", { timeout: 30000 });
  console.log("✓ canvas rendered");

  // The gate fires on a timer, so waiting it out is the point of this check.
  await page.waitForTimeout(LICENSE_TIMEOUT_MS + GRACE_MS);

  const gated = await page.locator('[data-testid="tl-license-expired"]').count();
  const canvas = await page.locator(".tl-canvas").count();

  if (gated > 0 || canvas === 0) {
    failure =
      "tldraw hid the editor — the table is BLANK.\n" +
      "  This is the license gate, not a sync or rendering problem.\n" +
      `  Complaints from tldraw: ${licenseComplaints.join(" / ") || "(none captured)"}\n` +
      "  Fix: set TLDRAW_LICENSE_KEY in the repo-root .be and redeploy.\n" +
      "  A key valid for a DIFFERENT domain fails the same way — it must cover\n" +
      `  ${new URL(baseUrl).hostname}. Free hobby license: https://tldraw.dev/get-a-license/hobby`;
  } else {
    console.log(`✓ canvas still present ${(LICENSE_TIMEOUT_MS + GRACE_MS) / 1000}s after load — license gate did not fire`);
  }
} catch (e) {
  failure = `could not check the canvas: ${e.message}`;
} finally {
  await browser.close();
}

if (failure) {
  console.error(`\n❌ ${failure}`);
  process.exit(1);
}
console.log("\n✅ deployed canvas is live");
