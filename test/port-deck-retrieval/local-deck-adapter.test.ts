import { LocalDeckAdapter } from "../../src/port-deck-retrieval/localAdapter/LocalDeckAdapter.js";

describe("LocalDeckAdapter", () => {
  let adapter: LocalDeckAdapter = new LocalDeckAdapter();

  it("reads files from the local directory", async () => {
    const availableDecks = adapter.listAvailableDecks();

    expect(availableDecks.length >= 3).toBe(true);
  });
});
