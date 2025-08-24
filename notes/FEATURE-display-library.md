# Display the library

Status: implemented

Now it's time for the player to start a game.

[x] add a "Start Game" button.

When the game starts, we create a Library based on the Deck.

The library is a stack of cards, face-down. To start with, all included cards except the Commander are in the library.

The display of the library is the back of a Magic card (with an effect to make it look like a deep stack) and a count of the number of cards in the library.

For testing purposes, there is also an expandable list of cards in the library, in order. This list is collapsed by default so that you don't see it.

Later, there will be buttons for manipulating the library.

## Keep the whole list of cards, not only the count

In the Deck type, we need to retain a list of every card, not just the count.

[x] change the ArchidektDecktoDeck function to keep the list of cards.

In Archidekt, there's a quantity field. We could retain that in our Deck object, but in the Library, we definitely can't; each card will be individual because their order is key. It seems like an optimization to keep the quantity in the Deck, so let's list out each card instead.

### Analysis of current code (src/deck.ts:55-88):
- Current Deck interface has counts (totalCards, includedCards, excludedCards) but no card list
- convertArchidektToDeck function currently only tracks quantities, not actual cards
- Need to add `cards: Card[]` field to Deck interface
- Need to expand cards based on quantity in conversion function

## Start a game

When the game starts, we create a Game state. The Game state has a pointer to the Deck. It contains a Library object.

[x] create a retrieveDeck function to grab the deck. Right now it'll need to call the Archidekt API again to fetch it, based on the deck number in the input field.

[x] create a shuffleDeck method that takes a Deck and returns a Library. The order of the Library is random.

[x] create a game-state div. When Start Game is pushed, show the library there.
[x] include an End Game button that returns to the state where only deck information & Start Game are shown.

## Implementation Summary

### Added Types (src/deck.ts:49-57):
- `Library` interface with cards array and count
- `Game` interface containing deck and library

### Updated Deck Interface (src/deck.ts:46):
- Added `cards: Card[]` field to store individual cards

### Updated convertArchidektToDeck (src/deck.ts:75-86):
- Now expands cards based on quantity (e.g., 3x Lightning Bolt becomes 3 separate Card objects)
- Excludes commander from main deck cards array
- Creates individual Card objects for shuffling

### New Functions:
- `shuffleDeck(deck: Deck): Library` - Fisher-Yates shuffle algorithm (src/deck.ts:66-79)
- `retrieveDeck(deckNumber: string): Promise<Deck>` - Refactored API call (src/server.ts:7-15)
- `formatGameHtml(game: Game): string` - Game state display (src/server.ts:41-76)

### New Routes (src/server.ts):
- POST `/start-game` - Creates game state with shuffled library
- POST `/end-game` - Returns to deck selection interface

### UI Features:
- Start Game button appears after loading deck
- Library display shows card back with count
- Collapsible library contents for testing
- Commander remains displayed during game
- End Game button returns to initial state

### Testing:
- All existing tests pass
- Build completes without errors
- Ready for manual testing with `./run`

## Updates

### Fixed End Game Button (2025-08-16):
- End Game button now returns to loaded deck state instead of empty form
- Added deck-id hidden input to game state for proper state restoration
- Updated /end-game route to fetch and display deck information
