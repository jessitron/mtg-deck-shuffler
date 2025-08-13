# Card Count

Processing of the Archidekt deck definition takes place in src/deck.ts

Tests for this function are in test/deck.test.ts

The output formatting of the deck information is in src/server.ts

Current:

- we count the cards in the deck and display that

Definitions:

- A card's primary category is the first one in the list of categories.
- Sideboard is a special category, indicating cards that are not in the deck. They are saved with the deck because they might be swapped in later.

Needed:

- we display the number of cards not in "Sideboard" as their primary category. This is the count of cards in the deck.
- and separately, the number of cards in "Sideboard" category. These are extra cards that might get swapped in.
