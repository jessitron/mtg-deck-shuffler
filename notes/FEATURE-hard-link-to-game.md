# Make the URL in the browser point back to the game

Status: not started

When we load a deck, we start a new game. We want the URL in the browser to reflect that. For instance, if the game ID is 12345, we want the URL to be https://mtg-deck-shuffler.com/game/12345

Likewise, when we end the game, we want the URL to revert to the default.

If the player copies the URL to a different browser, it should load all the state for that game, and let them continue playing.

I'd like the game ID to be an incrementing sequence, because that's fun. We need to check whether every planned game state storage adapter can implement that.
