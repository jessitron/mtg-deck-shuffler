import { test, expect } from "@playwright/test";
import { joinSeat, openTable } from "./helpers";

test("typing a message into the diagnostic button and sending it posts that message", async ({ page, baseURL }) => {
  const tableSlug = `verify-diag-msg-${Date.now()}`;
  await joinSeat(page, baseURL, tableSlug, "e2e-seat", "Jess");
  await openTable(page, tableSlug);

  const postPromise = page.waitForRequest(
    (req) => req.url().includes(`/api/tables/${tableSlug}/diagnostic`) && req.method() === "POST"
  );

  await page.getByTestId("diagnostic-button").click();
  const input = page.getByTestId("diagnostic-message-input");
  await expect(input).toBeVisible();
  await input.fill("the graveyard is showing the wrong cards");
  await page.getByTestId("diagnostic-send-button").click();

  const request = await postPromise;
  expect(request.postDataJSON()).toEqual({ message: "the graveyard is showing the wrong cards" });
  await expect(input).toBeHidden();
});
