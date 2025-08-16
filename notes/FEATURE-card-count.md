# Card Count

status: implemented

Processing of the Archidekt deck definition takes place in src/deck.ts

Tests for this function are in test/deck.test.ts

The output formatting of the deck information is in src/server.ts

Current:

- we count the cards in the deck and display that

Definitions:

- A card's primary category is the first one in the list of categories.
- Sideboard is a special categories, indicating cards that are not in the deck. They are saved with the deck because they might be swapped in later. Cards with a primary category of Sideboard are excluded from the deck.
- There are other categories that are excluded from the deck. In the categories list at the deck level, these categories have 'includedInDeck': false.
- Included cards are every card not excluded.

Needed:

- we display the number of cards included in the deck
- and separately, the number of cards excluded from the deck, but still in the list.
