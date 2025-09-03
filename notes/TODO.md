# Things to change

- get Deck Source into provenance and Deck Retrieval Request

- undo button will drive the implementation of state history tracking

- persistence is of session state. Actually implement it.

- we need events, eventually. CRUD is technically the wrong model for this. We can use CRUD in the data layer while keeping the domain logic event-based.

- decide on a project name and make it consistent. It's still librarytron in hny env

- If people load the game in multiple windows, interact with one, and then interact with another: it needs to throw an error in the second one and ask them to refresh the page.

- I need tracing in Honeycomb of what is happening. THe trick is that I want to do this by creating generic instructions and using them.
  [x] initialize tracing, get autoinstrumentation
  [ ] identify crucial fields to add as attributes
  [ ] create a library of utility functions specific to this project

- I also want tracing of pageloads, a frontend dataset.

- implement SQLite again. Not have to recreate the game on restart

- the site needs to save and delete the game, it doesn't currently use the game state mechanism

- get the Deck to include a "source", which has a URL that links to where we got the deck. Local files will work for this if we serve them (it has a source now, but doesn't work for local files)

- handle empty library

- after draw, make sure the drawn card is visible: scroll hand section to the right

- bug: scroll the page until the hand is just visible, and the buttons on the bottom are not. Scroll the hand to the right. Click swap. The page scrolls down! that's ridiculous, we shouldn't change scroll on the page. Hmm, it doesn't happen in Chrome. Fuck it

- game IDs should be fun word combos instead of numbers. That makes them not derivable, and still looks pretty.
