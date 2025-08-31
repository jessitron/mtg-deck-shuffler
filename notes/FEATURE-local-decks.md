# Load decks from the local filesystem (Let's Play feature)

This feature will make it possible to run this app on an airplane.

We will flesh out the LocalDeckAdapter and integrate it into the interface.

- the LocalDeckAdapter should load decks from a local directory, `./decks/`. Pass this value to it in the constructor.
- the DeckRetrievalAdapter port needs a new method, `listAvailableDecks`. It returns an array of DeckSelectionPossibilities.
- the ArchidektDeckToDeckAdapter implements listAvailableDecks to return an empty array.
- the LocalDeckAdapter implements listAvailableDecks by reading the files in its directory. Then it returns one possibility for each.
- when index.html loads, it immediately makes an hx-get to /choose-deck, which populates the deck input.
- the deck input includes the usual Archidekt Deck ID input, and a way to select the local deck.
- the input to /deck includes 'deck-source' as either 'archidekt' or 'local'. If 'local', then it includes the local filename.

## Future enhancements

The LocalDeckAdapter should return more detailed options, instead of a Dropdown. Each one includes a thumbnail image (the commander if there is one, otherwise a default image), a name (the deck name), and an id (the local filename).
