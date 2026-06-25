import { CascadingDeckRetrievalAdapter } from "../../src/port-deck-retrieval/compositeAdapters/CascadingDeckRetrievalAdapter.js";
import { RetrieveDeckPort, AvailableDecks, AvailableDeck, DeckRetrievalRequest } from "../../src/port-deck-retrieval/types.js";
import { Deck } from "../../src/types.js";

function fakeAdapter(decks: AvailableDecks): RetrieveDeckPort {
  return {
    listAvailableDecks: () => decks,
    canHandle: (_request: DeckRetrievalRequest) => false,
    retrieveDeck: async (_request: DeckRetrievalRequest): Promise<Deck> => {
      throw new Error("not implemented");
    },
  };
}

function precon(description: string, createdAt: string): AvailableDeck {
  return {
    deckSource: "precon",
    description,
    localFile: `${description}.json`,
    metadata: {
      commanders: [],
      createdAt,
      releaseDate: createdAt,
    },
  };
}

describe("CascadingDeckRetrievalAdapter sorting", () => {
  it("sorts decks by full release date descending, even within the same year", () => {
    const adapter = new CascadingDeckRetrievalAdapter(
      fakeAdapter([
        precon("March 2024", "2024-03-01T00:00:00.000Z"),
        precon("December 2024", "2024-12-04T00:00:00.000Z"),
        precon("July 2024", "2024-07-15T00:00:00.000Z"),
        precon("January 2023", "2023-01-01T00:00:00.000Z"),
      ])
    );

    const sorted = adapter.listAvailableDecks().map((d) => d.description);

    expect(sorted).toEqual(["December 2024", "July 2024", "March 2024", "January 2023"]);
  });
});
