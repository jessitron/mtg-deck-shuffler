# Deck Provenance

each Deck needs a DeckProvenance object. It describes where the list of cards came from.
Every DeckProvenance has a retrievedDate and a source URL.

Each DeckRetrieverAdapter knows how to create a DeckProvenance object for the decks it retrieves, and includes it.

The LocalDeckAdapter creates a DeckProvenance with a retrievedDate of now and a source URL of "local://<path>".

The ArchidektDeckToDeckAdapter creates a DeckProvenance with a retrievedDate of now and a source URL of "https://archidekt.com/decks/<deck_id>".
