# Things to change

- the game state needs to store

  - the full deck. it is mutable in archidekt
  - the hand ... although we don't have one yet so that can come later
  - the cards on the table ... although we don't have one yet so that can come later

- we need events, eventually. CRUD is technically the wrong model for this

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
