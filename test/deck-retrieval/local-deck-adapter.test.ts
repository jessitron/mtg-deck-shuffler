import { test, describe } from "node:test";
import assert from "node:assert";
import { LocalDeckAdapter } from "../../src/deck-retrieval/LocalDeckAdapter.js";

describe("ArchidektDeckToDeckAdapter", () => {
  let adapter: LocalDeckAdapter = new LocalDeckAdapter();

  test("reads files from the local directory", async () => {
    const availableDecks = adapter.listAvailableDecks()[0];

    assert.strictEqual(availableDecks.description, "Locally stored decks");
    assert(availableDecks.options.length >= 3, "I expect to find at least three decks in ./decks/ ... found " + availableDecks.options.length);
  });
});
