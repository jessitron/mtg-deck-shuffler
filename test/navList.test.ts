import { describe, test, expect } from "@jest/globals";
import { resolveNavListNavigation } from "../src/navList.js";

describe("resolveNavListNavigation", () => {
  test("returns null when navList is undefined", () => {
    expect(resolveNavListNavigation(undefined, 5)).toBeNull();
  });

  test("returns null when navList is empty string", () => {
    expect(resolveNavListNavigation("", 5)).toBeNull();
  });

  test("returns null when card is not in navList", () => {
    expect(resolveNavListNavigation("1,2,3", 5)).toBeNull();
  });

  test("first card has no prev, has next", () => {
    const result = resolveNavListNavigation("10,20,30", 10);
    expect(result).toEqual({
      prevCardIndex: null,
      nextCardIndex: 20,
      currentPosition: 1,
      totalCardsInZone: 3,
    });
  });

  test("middle card has both prev and next", () => {
    const result = resolveNavListNavigation("10,20,30", 20);
    expect(result).toEqual({
      prevCardIndex: 10,
      nextCardIndex: 30,
      currentPosition: 2,
      totalCardsInZone: 3,
    });
  });

  test("last card has prev, no next", () => {
    const result = resolveNavListNavigation("10,20,30", 30);
    expect(result).toEqual({
      prevCardIndex: 20,
      nextCardIndex: null,
      currentPosition: 3,
      totalCardsInZone: 3,
    });
  });

  test("single card in list has no prev or next", () => {
    const result = resolveNavListNavigation("42", 42);
    expect(result).toEqual({
      prevCardIndex: null,
      nextCardIndex: null,
      currentPosition: 1,
      totalCardsInZone: 1,
    });
  });
});
