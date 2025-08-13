# Card Count

Processing of the Archidekt deck definition takes place in src/deck.ts

Tests for this function are in test/deck.test.ts

The output formatting of the deck information is in src/server.ts

Current:

- we count the cards in the deck and display that

Definitions:

- A card's primary category is the first one in the list of categories.
- Sideboard and Maybeboard are special categories, indicating cards that are not in the deck. They are saved with the deck because they might be swapped in later. The way you can tell it's a special category that isn't included in the deck is: in the categories list at the deck level, the category has 'includedInDeck': false.

Needed:

- we display the number of cards included in the deck
- and separately, the number of cards not included in the deck, but still in the list.
