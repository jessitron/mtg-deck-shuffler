# Store and manipulate game state.

We need to implement @notes/DESIGN-state.md, @notes/FEATURE-store-session-state.md, and @notes/FEATURE-hard-link-to-game.md, and these are intertwined.

Plan:
[] implement just enough of DESIGN-state to have a game state that can initialize.
[] get the old Game implementation out of the way, it confuses the port work
[] implement the port and adapter (at least in-memory) for FEATURE-store-session-state
[] implement start game in DESIGN-state
[] implement FEATURE-hard-link-to-game
[] make sure we never re-load the deck from archidekt anymore.
