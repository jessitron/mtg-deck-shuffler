import { test, expect } from "@playwright/test";
import { openTable } from "./helpers";

test("pressing ctrl+c on a selected shape shows a hint instead of copying", async ({ page }) => {
  const tableSlug = `verify-copy-hint-${Date.now()}`;
  await openTable(page, tableSlug);

  await page.getByTestId("tools.mtg-counter").click();
  await page.mouse.click(400, 300);
  const counter = page.getByTestId("mtg-counter");
  await expect(counter).toHaveCount(1);

  // Marquee-select rather than clicking the counter directly: a single click
  // on a counter enters its text-edit mode, which disables tldraw's own
  // keyboard shortcuts (there's no selection to copy while editing text).
  await page.mouse.move(150, 150);
  await page.mouse.down();
  await page.mouse.move(600, 500, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByRole("button", { name: /^Duplicate/ })).toBeEnabled();
  await page.keyboard.press("ControlOrMeta+c");

  await expect(page.getByText("Copy doesn't work here")).toBeVisible();
  await expect(page.getByText("Use duplicate (ctrl-d) instead.")).toBeVisible();
});
