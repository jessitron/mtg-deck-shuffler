# Make the URL in the browser point back to the game

Status: not implemented

We initialize a PersistStatePort using an InMemoryAdapter in src/server.ts.

When we load a deck, we load a whole new page (not just a fragment). First a POST to /deck, and that initializes a new game; then a redirect to /game/{new game ID}.

/game/{game ID} retrieves the game state by ID. Then it renders the page based on the game state. This way, if the player copies the URL to a different browser, it should load all the state for that game, and let them continue playing.

When a game is Not Started, it displays as Deck Review in @notes/DESIGN-application-flow.md.

When "Shuffle Up" is pushed, it'll be a POST to /start-game using htmx. The server starts the game, persists that, then returns just the fragment of HTML.

The "Restart Game" button will be a POST to /restart-game, at the top level. That will start end the current game, create a new game with the same deck, then redirect to /game/{new game ID}.
