# Make the URL in the browser point back to the game

Status: not implemented

We initialize a PersistStatePort using an InMemoryAdapter in src/server.ts.

When we load a deck, we start a new game, persist it, then redirect to https://mtg-deck-shuffler.com/game/12345 (where 12345 is the game ID).

When a game is Not Started, it displays as Deck Review in @notes/DESIGN-application-flow.md.

When Start Game is pushed, include the game ID in the request. The server starts the game, persists it, then redirects to the same URL. Now the game is Active, and displays as Play Game.

This way, if the player copies the URL to a different browser, it should load all the state for that game, and let them continue playing.
