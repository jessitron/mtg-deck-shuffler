# Things to change

20 Feb:
The goal is to add card type sorting to the library search modal.
See `notes/FEATURE-card-type-grouping.md` for implementation instructions.

## Structural

- migrate the active game page to use ejs templates mtg-deck-shuffler-057
  - make the head.ejs take a list of extra .js, so we don't load game.js on the homepage for instance

## Features

## Add card sleeves mtg-deck-shuffler-19r

- on the deck preview page, choose inner and outer sleeve colors
- inner: mtg-deck-shuffler-10u

### Spectator mode mtg-deck-shuffler-qe1

It would be cool if Charlotte could see our hands without worrying about messing up our game state.

## Bugs to fix

- the Flip functionality on the Prepare screen (for the commander) is broken.

## More Things to change

- add a play counter to the command zone mtg-deck-shuffler-mwz

- mulligan button which puts them all back and reshuffles mtg-deck-shuffler-9bh

- make cmd-Z undo mtg-deck-shuffler-236

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

mtg-deck-shuffler-z1y

### other

- in cards on table, track how it got there. Give people 'discard' and 'exile' buttons, which move it to the table. Display how it got there in the list of cards on the table. mtg-deck-shuffler-199

- let people pick a playmat mtg-deck-shuffler-eds

- let people pick sleeves mtg-deck-shuffler-19r

- do we want redo? mtg-deck-shuffler-014

[x] undo button will drive the implementation of state history tracking, with events.

[x] Change the Honeycomb environment to mtg-deck-shuffler for prod.

- I need tracing in Honeycomb of what is happening. THe trick is that I want to do this by creating generic instructions and using them.
  [x] initialize tracing, get autoinstrumentation
  [ ] identify crucial fields to add as attributes
  [ ] create a library of utility functions specific to this project

- game IDs should be fun word combos instead of numbers. That makes them not derivable, and still looks pretty mtg-deck-shuffler-chq

- it is physically possible for your commander to be in your library or hand. shit.

- keyboard shortcuts

- when a game starts, automatically draw a hand of 7 cards. Sort the hand by card type and then by mana value. Lands first, then creatures, then everything else.
  - real fun: generate a mulligan recommendation. Are there 2-4 lands? With the lands in the hand, what can be played? do any of those get you more land or mana? with only these cards, can you play a creature (could be your commander)? If not, do any of them get you more cards?
