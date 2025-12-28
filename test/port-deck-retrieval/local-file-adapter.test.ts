import { LocalFileAdapter } from "../../src/port-deck-retrieval/localFileAdapter/LocalFileAdapter.js";
import { LOCAL_DECK_RELATIVE_PATH } from "../../src/port-deck-retrieval/types.js";

describe("LocalFileAdapter", () => {
  let adapter: LocalFileAdapter = new LocalFileAdapter(LOCAL_DECK_RELATIVE_PATH);

  it("reads files from the local directory", async () => {
    const availableDecks = adapter.listAvailableDecks();

    expect(availableDecks.length >= 3).toBe(true);
  });
});
