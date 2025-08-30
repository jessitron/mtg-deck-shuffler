# Make the URL in the browser point back to the game

Status: not implemented

We initialize a PersistStatePort using an InMemoryAdapter in src/server.ts.

When we load a deck, we start a new game, persist it, then redirect to https://mtg-deck-shuffler.com/game/12345 (where 12345 is the game ID). 

The Deck Review screen loads that deck and displays it.

Likewise, when we end the game, we want the URL to revert to the default.

If the player copies the URL to a different browser, it should load all the state for that game, and let them continue playing.

I'd like the game ID to be an incrementing sequence, because that's fun. We need to check whether every planned game state storage adapter can implement that.
