# Things to change

## Bugs to fix

- I managed to get it to play the same card twice. This will be fixed by ignoring actions with the wrong previous event ID and making people reload the game.

## More Things to change

- hand cards should have all the buttons that revealed cards have.

- the Table modal needs to pop open the card modal on card name click

- make the library card modal have up/down! I want to look through it!

- feature: draw hand button, which draws 10 cards and then orders by: Land, Creature, Artifact, Enchantment, Sorcery, Instant ... actually do this as part of Shuffle Up!
- mulligan button which puts them all back and reshuffles

- handle empty library

- make cmd-Z undo

### animations

- animations. I have a good idea.

The htmx requests can include the current position of the card. It can also calculate the destination position, like where the table is! The server can then style the card with a transition that moves it from the current position to the destination position!

an example from claude desktop:
<img id="image" 
     data-current-x="100" 
     data-current-y="50"
     hx-post="/update-position"
     hx-vals="js:{currentX: document.getElementById('image').dataset.currentX, 
                  currentY: document.getElementById('image').dataset.currentY}">

### other

- when we draw a card, get an htmx event to scroll the hand to the right (in case you can't see the new card)

- When two-sided cards are played, the player is going to need access to both sides of the card. Copying 2 images is not well supported. So, let's copy the current face. To give people access to the other face, let's put the two-sided card at the top of the list of played cards. ... and then we need the card modal, with a copy button and a flip button.

- can I make Play make an animation of moving the card to the table?

[x] Flip Card should be an event

- If people load the game in multiple windows, interact with one, and then interact with another: it needs to throw an error in the second one and ask them to refresh the page.

[x] the shuffle event is ridiculously large. Have it store arrays of numbers, not a shitton of json.

- let people pick a playmat

- let people pick sleeves

- The game events would be easier to undo if they included their description.

- I want a log of what happened! Today I clicked some stuff in my hand too fast and wondered whether I put too many cards on the table. I need that list of actions.

[x] make a save/load game feature so I can move game states from prod to local for testing

- do we want redo?

[x] undo button will drive the implementation of state history tracking, with events.

[x] Change the Honeycomb environment to mtg-deck-shuffler for prod.

- I need tracing in Honeycomb of what is happening. THe trick is that I want to do this by creating generic instructions and using them.
  [x] initialize tracing, get autoinstrumentation
  [ ] identify crucial fields to add as attributes
  [ ] create a library of utility functions specific to this project

[x] I also want tracing of pageloads, a frontend dataset. I have this now but it's super basic; the library needs upgraded

- handle empty library

- after draw, make sure the drawn card is visible: scroll hand section to the right

- game IDs should be fun word combos instead of numbers. That makes them not derivable, and still looks pretty

- local deck retrieved: the JSON of the local deck is not what I want to link to. Make a link separate from the name, and note the retrieved date next to it, but point it to the deck definition in Archidekt if that's where it came from. There's a deck source inside the local deck that it reads in... it's like a source of the source, oh dear

- it is physically possible for your commander to be in your library or hand. shit.

- give the commander a play button; make it translucent in the command zone when it's also on the table. Count the number of times it's been played, that's handy to track.

## UI Changes

I want to change the UI, target documented in notes/DESIGN-interface.md
