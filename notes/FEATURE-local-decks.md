# Load decks from the local filesystem (Let's Play feature)

This feature makes it possible to run this app on an airplane.

## Future enhancements

The LocalDeckAdapter should return more detailed options, instead of a Dropdown. Each one includes

- a thumbnail image (the commander if there is one, otherwise a default image; use the small image available from Scryfall),
- a name (the deck name),
- an id (the local filename).
