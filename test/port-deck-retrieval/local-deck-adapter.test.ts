import { test, describe } from "node:test";
import assert from "node:assert";
import { LocalDeckAdapter } from "../../src/port-deck-retrieval/localAdapter/LocalDeckAdapter.js";

describe("LocalDeckAdapter", () => {
  let adapter: LocalDeckAdapter = new LocalDeckAdapter();

  test("reads files from the local directory", async () => {
    const availableDecks = adapter.listAvailableDecks();

    assert(availableDecks.length >= 3, "I expect to find at least three decks in ./decks/ ... found " + availableDecks.length);
  });
});
