# Things to change

- cards with two faces! we need a way to flip them

## Bugs to fix

- Nature's Lore from Dogs & Cats Deck had no multiverse ID. Gatherer link didn't work. ... nothing in that deck has a multiverseid

## More Things to change

- let people pick a playmat

- let people pick sleeves

- The game events would be easier to undo if they included their description.

- I want a log of what happened! Today I clicked some stuff in my hand too fast and wondered whether I put too many cards on the table. I need that list of actions.

- make a save/load game feature so I can move game states from prod to local for testing

- undo button will drive the implementation of state history tracking, with events.

- Change the Honeycomb environment to mtg-deck-shuffler for prod.

- Once events are implemented: If people load the game in multiple windows, interact with one, and then interact with another: it needs to throw an error in the second one and ask them to refresh the page.

- I need tracing in Honeycomb of what is happening. THe trick is that I want to do this by creating generic instructions and using them.
  [x] initialize tracing, get autoinstrumentation
  [ ] identify crucial fields to add as attributes
  [ ] create a library of utility functions specific to this project

- I also want tracing of pageloads, a frontend dataset. I have this now but it's super basic; the library needs upgraded

- handle empty library

- after draw, make sure the drawn card is visible: scroll hand section to the right

- bug: scroll the page until the hand is just visible, and the buttons on the bottom are not. Scroll the hand to the right. Click swap. The page scrolls down! that's ridiculous, we shouldn't change scroll on the page. Hmm, it doesn't happen in Chrome, only Firefox. Fuck it

- game IDs should be fun word combos instead of numbers. That makes them not derivable, and still looks pretty

- local deck retrieved: the JSON of the local deck is not what I want to link to. Make a link separate from the name, and note the retrieved date next to it, but point it to the deck definition in Archidekt if that's where it came from. There's a deck source inside the local deck that it reads in... it's like a source of the source, oh dear

- it is physically possible for your commander to be in your library or hand. shit.

- give the commander a play button; make it translucent in the command zone when it's also on the table. Count the number of times it's been played, that's handy to track.

## UI Changes

I want to change the UI, target documented in notes/DESIGN-interface.md

Before that, I need to rearrange the view methods, they're a mess. Target documented in notes/STRUCTURE-view-organization.md

Before that, I need snapshot tests. It made a plan in notes/STRUCTURE-snapshot-tests.md but I don't like it. I think I'll have it implement one snapshot test, and then see what else I want.
The first test can be for the / endpoint. That calls formatChooseDeckHtml, so we can test it at that level. It makes an htmx call ... but does it have to? It doesn't, if I generate the / endpoint dynamically. Which would be a UI refactor. Which wants snapshot tests!

Hmm, that might be a change it can make without screwing it up, though. The structure of the view functions won't affect that as much maybe?

It would be nicer with templates. Templates come after snapshot tests though.
