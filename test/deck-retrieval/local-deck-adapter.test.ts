import { test, describe } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import { LocalDeckAdapter } from "../../src/deck-retrieval/LocalDeckAdapter.js";

describe("ArchidektDeckToDeckAdapter", () => {
  let adapter: LocalDeckAdapter = new LocalDeckAdapter();

  test("reads files from the local directory", async () => {
    const availableDecks = adapter.listAvailableDecks();
    // assert.strictEqual(availableDecks.description, "Locally available decks");
    // assert(availableDecks.options.length >= 3);
  });
});
