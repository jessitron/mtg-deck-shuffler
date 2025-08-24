# Architecture of dataflow

status: let's work on this

# External interfaces are behind adapters.

Right now, server.ts makes a direct call to Archidekt, an external API. Yikes!

I need a port, adapter, and gateway for retrieving a deck from Archidekt. The adapter will accept { archidektDeckId: string } and return a Deck in our domain. The adapter calls the gateway. The gateway calls Archidekt and returns the same shape of data that Archidekt returns, but stripped down to only what we use.

Let's make a directory for deck retrieval.

The port is an interface, RetrieveDeckPort. It has one method, retrieveDeck(DeckRetrievalRequest): Promise<Deck>. DeckRetrievalRequest is ArchidektDeckRetrievalRequest | LocalDeckRetrievalRequest. ArchidektDeckRetrievalRequest is { archidektDeckId: string } . Deck is our domain type, defined in deck.ts. The ArchidektDeck type definition moves into the deck retrieval directory.

LocalDeckRetrievalRequest is { localFile: string }. This is for testing and development. We will have a set of local decks that we can use to test without hitting the Archidekt API. The local decks are stored in our own deck format. There's a LocalDeckGateway that reads the local file and returns a Deck.

The ArchidektGateway calls Archidekt and returns an ArchidektDeck. There's an ArchidektDeckToDeckAdapter that converts an ArchidektDeck to a Deck.

The RetrieveDeckPort is implemented by a RetrieveDeckAdapter. It takes a DeckRetrievalRequest and returns a Deck. Depending on which kind of DeckRetrievalRequest it is, it uses the appropriate gateway and adapter. It uses the ArchidektGateway and ArchidektDeckToDeckAdapter to do its work.

The unit tests in deck.test.ts become tests of the ArchidektDeckToDeckAdapter.
