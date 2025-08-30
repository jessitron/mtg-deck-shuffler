# Game State

status: time to iterate

GameState is a class. Its data will have a structure that prevents many invalid conditions.

At all times during a game, each card is in exactly one place. Therefore, we will store each card once, along with a location.

Operations on game state accept a game state, and return a game state. (It might alter the input game state and return it, don't count on that either way.)

The game state includes:

- a Game ID, which is an incrementing integer. This is supplied at construction.
- a Game Status, which is one of:
  - NotStarted
  - Active
  - Ended
- a DeckProvenance, which is immutable
- 0-2 commander cards, which are in the Command Zone at all times.
- a list of cards, each with a card definition and a location, ordered by Display Name.
- a card location is one of:
  - Library(position: non-negative integer)
  - Hand(position: non-negative integer)
  - Revealed(position: non-negative integer)
  - Table

Any number of cards may be in Table, and their position is not tracked.

Invariants:

- there are zero, one, or two commander cards
- there are no duplicate positions except Table
- the card definitions never change, only the locations.
- the order of cards in the game state never changes. To make this easier to verify, it is ordered by Display Name.

Operations possible on game state:

- initialize from a Deck (in the constructor). Place all included cards except the commander(s) in the Library, with position incrementing. Excluded card definitions are dropped.

## Future Operations - STOP HERE

- shuffle: randomize the position of cards in Library. After shuffling, the top card is the one with position 0. Check: The same number of cards are in the library as before, and all cards not in library remain where they were.
- draw: move the top card from Library to Hand. Check: one fewer card in Library, one more card in Hand.
- reveal: move the top card from Library to Revealed. Check: one fewer card in Library, one more card in Revealed.
- return to bottom (for any revealed card): move this card from Revealed to the last position in Library. Check: one fewer card in Revealed, one more card in Library. The card now has the highest-numbered position in Library.
- return to top (for any revealed card): move this card from Revealed to the top position in Library. Check: one fewer card in Revealed, one more card in Library. The card now has position Library(0).
- move to hand (for any revealed card): move this card from Revealed to the last position in Hand
- move to table (for any revealed card or any card in hand): move the card to Table
- return from table (for any card in Table): move the card to Revealed
- move left in hand (for any card in Hand, except the first): move this card one position to the left in Hand. Check: same number of cards in Hand. One more card with larger position than this one.
- move right in hand (for any card in Hand, except the last): move this card one position to the right in Hand. Check: same number of cards in Hand. One more card to with smaller position than this one.

Views on game state include:

- list commanders
- list library (list of cards in Library, ordered by position)
- list hand (list of cards in Hand, ordered by position)
- list revealed (list of cards in Revealed, ordered by position)
- list table (list of cards in Table, ordered by Display Name)
