import { LocalDeckAdapter } from "../../src/port-deck-retrieval/localAdapter/LocalDeckAdapter.js";
import { LOCAL_DECK_RELATIVE_PATH } from "../../src/port-deck-retrieval/types.js";

describe("LocalDeckAdapter", () => {
  let adapter: LocalDeckAdapter = new LocalDeckAdapter(LOCAL_DECK_RELATIVE_PATH);

  it("reads files from the local directory", async () => {
    const availableDecks = adapter.listAvailableDecks();

    expect(availableDecks.length >= 3).toBe(true);
  });
});
