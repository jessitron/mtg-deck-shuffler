# Things to change

- migrate the deck selection and active game pages to use ejs templates
  - make the head.ejs take a list of extra .js, so we don't load game.js on the homepage for instance

## Spectator mode

It would be cool if Charlotte could see our hands without worrying about messing up our game state.

- spectator mode

which requires

- getting errors when the server state isn't what the UI had loaded, when I clicked something

which needs

- a session ID on the telemetry.  ... well it did this. It put it in a header, so it's _only_ on the telemetry, on the server's entry span. I wanted it on the state too, but maybe later.

## Add card sleeves

- on the deck preview page, choose inner and outer sleeve colors

- the outer color could be an art card image

- display the library as the back of the sleeves

- make the command zone colors match the sleeves inner and outer colors

- default colors based on commander image: https://lokeshdhakar.com/projects/color-thief/#api

## Bugs to fix

- I managed to get it to play the same card twice. This will be fixed by ignoring actions with the wrong previous event ID and making people reload the game.

- the Play animation doesn't work anymore on hand cards. It does on Revealed

- the error page needs work again

## More Things to change

- put the drawn card at the beginning of the hand, so you can always see it. Have all others move right

- replace the little ↗ link with a real 'see in new tab' image

- make a revealed card appear to hover

- add a play counter to the command zone

- make the library card modal have up/down! I want to look through it!

- feature: draw hand button, which draws 10 cards and then orders by: Land, Creature, Artifact, Enchantment, Sorcery, Instant ... actually do this as part of Shuffle Up!
- mulligan button which puts them all back and reshuffles

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

- the game.js should be separated into code for each different page.

- in cards on table, track how it got there. Give people 'discard' and 'exile' buttons, which move it to the table. Display how it got there in the list of cards on the table.

- when we draw a card, get an htmx event to scroll the hand to the right (in case you can't see the new card) ... or put it on the left and animate all cards right.

- If people load the game in multiple windows, interact with one, and then interact with another: it needs to throw an error in the second one and ask them to refresh the page.

- let people pick a playmat

- let people pick sleeves

- do we want redo?

[x] undo button will drive the implementation of state history tracking, with events.

[x] Change the Honeycomb environment to mtg-deck-shuffler for prod.

- I need tracing in Honeycomb of what is happening. THe trick is that I want to do this by creating generic instructions and using them.
  [x] initialize tracing, get autoinstrumentation
  [ ] identify crucial fields to add as attributes
  [ ] create a library of utility functions specific to this project

[x] I also want tracing of pageloads, a frontend dataset. I have this now but it's super basic; the library needs upgraded

- after draw, make sure the drawn card is visible: scroll hand section to the right

- game IDs should be fun word combos instead of numbers. That makes them not derivable, and still looks pretty

- local deck retrieved: the JSON of the local deck is not what I want to link to. Make a link separate from the name, and note the retrieved date next to it, but point it to the deck definition in Archidekt if that's where it came from. There's a deck source inside the local deck that it reads in... it's like a source of the source, oh dear

- it is physically possible for your commander to be in your library or hand. shit.
- give the commander a play button; make it translucent in the command zone when it's also on the table. Count the number of times it's been played, that's handy to track.

- keyboard shortcuts
