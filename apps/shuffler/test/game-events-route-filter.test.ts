import { describe, test, expect } from "@jest/globals";
import { isGameEventsStreamPath } from "../src/game-events-route-filter.js";

describe("isGameEventsStreamPath", () => {
  test("matches the browser SSE route", () => {
    expect(isGameEventsStreamPath("/game-events/12345")).toBe(true);
  });

  test("matches with a query string", () => {
    expect(isGameEventsStreamPath("/game-events/12345?foo=bar")).toBe(true);
  });

  test.each(["/game-section/12345", "/game/12345", "/game-events", "/game-events/", undefined])("does not match %s", url => {
    expect(isGameEventsStreamPath(url)).toBe(false);
  });
});
