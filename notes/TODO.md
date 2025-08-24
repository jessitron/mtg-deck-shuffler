# Things to change

- the app state needs to store the deck after loading, even before the game starts. Or maybe, it should go straight into the start of a game. Yeah, skip the "deck details" page, go right into a shuffled library.
- give them buttons to restart game or choose another deck.

- the game state needs to store

  - the full deck. it is mutable in archidekt, so don't count on retrieving it again.
  - The cards as a single list, not separate lists. Each card has a place where it is. Each card can be in the library, in the hand, or revealed. In each case, the card is at a specific position.

- we need events, eventually. CRUD is technically the wrong model for this. We can use CRUD in the data layer while keeping the domain logic event-based.

- the formatting needs to happen in a view layer. Just functions, in a different file, that accept app state and return HTML.

- decide on a project name and make it consistent

- If people load the game in multiple windows, interact with one, and then interact with another: it needs to throw an error in the second one and ask them to refresh the page.

  - so we need tracking of game state... state ID or something, and it should not update a state with a different state ID.
  - I know how that can work in SQLite, with transactions
  - how does it work in dynamodb?
  - in memory, what can we use to guarantee integrity?

- I need tracing in Honeycomb of what is happening

- I also want tracing of pageloads, a frontend dataset.

- SQLite needs to use a real file

- implement dynamodb and test locally somehow

- the site needs to save and delete the game, it doesn't currently use the game state mechanism
