# Architecture of dataflow

status: let's work on this

# External interfaces are behind adapters.

Right now, server.ts makes a direct call to Archidekt, an external API. Yikes!

I need a port, adapter, and gateway for retrieving a deck from Archidekt.

See notes/PATTERN-port-adapter-gateway.md

Let's make a directory for deck retrieval.

The port is an interface, RetrieveDeckPort. It has two methods, canHandle(DeckRetrievalRequest): boolean, and retrieveDeck(DeckRetrievalRequest): Promise<Deck>. DeckRetrievalRequest is ArchidektDeckRetrievalRequest | LocalDeckRetrievalRequest. ArchidektDeckRetrievalRequest is { archidektDeckId: string } . Deck is our domain type, defined in deck.ts. The ArchidektDeck type definition moves into the deck retrieval directory.

LocalDeckRetrievalRequest is { localFile: string }. This is for testing and development. We will have a set of local decks that we can use to test without hitting the Archidekt API. The local decks are stored in our own deck format. There's a LocalDeckAdapter that reads the local file and returns a Deck. Since there's no translation happening, it's too simple to need a separate gateway.

The ArchidektGateway calls Archidekt and returns an ArchidektDeck. There's an ArchidektDeckToDeckAdapter that converts an ArchidektDeck to a Deck.

The RetrieveDeckPort is implemented by the ArchidektDeckRetrievalAdapter and the LocalDeckAdapter. In addition, there's a CascadingDeckRetrievalAdapter, which takes a list of RetrieveDeckPort implementations. It uses the first one that can handle the request.

The unit tests in deck.test.ts become tests of the ArchidektDeckToDeckAdapter.
