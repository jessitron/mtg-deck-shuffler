# Things to change

## Team

I'm making feature owners. The feature owners retain history and context, and they look for feature interactions.

I made a library search feature owner, because we were working on that feature.

I'm making a two-faced card feature owner, because the feature interactions with that are extensive, and I tend to forget.

CLAUDE.md is where agents get told to consult feature owners.

## Structural

- migrate the active game page to use ejs templates 
  - make the head.ejs take a list of extra .js, so we don't load game.js on the homepage for instance

## Features

## Add card sleeves 

- on the deck preview page, choose inner and outer sleeve colors
- inner: 

### Spectator mode 

It would be cool if Charlotte could see our hands without worrying about messing up our game state.

## Bugs to fix

- the Flip functionality on the Prepare screen (for the commander) is broken.

- the flip button looks sad right now. Make it look like a circle of two arrows, centered under the card.

## More Things to change

- add a play counter to the command zone 

- ~~mulligan button which puts them all back and reshuffles ~~ DONE - claude (button above the hand during the hand-acceptance stage; increments "Mulligan #2"…)

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

- other-language editions. Offer English translations. Example: adventurous impulse in squirrel girl deck 23735063

- in cards on table, track how it got there. Give people 'discard' and 'exile' buttons, which move it to the table. Display how it got there in the list of cards on the table. 

- let people pick a playmat 

- let people pick sleeves 

- do we want redo? 

[x] undo button will drive the implementation of state history tracking, with events.

[x] Change the Honeycomb environment to mtg-deck-shuffler for prod.

- I need tracing in Honeycomb of what is happening. THe trick is that I want to do this by creating generic instructions and using them.
  [x] initialize tracing, get autoinstrumentation
  [ ] identify crucial fields to add as attributes
  [ ] create a library of utility functions specific to this project

- game IDs should be fun word combos instead of numbers. That makes them not derivable, and still looks pretty 

- it is physically possible for your commander to be in your library or hand. shit.

- on undo with ctrl-Z, I'd like it to notify somehow about what was undone. A toast, maybe.

- when a game starts, automatically draw a hand of 7 cards. ✅ DONE - claude (auto-draws 7 on start/restart). STILL TODO: sort the hand by card type and then by mana value. Lands first, then creatures, then everything else.
  - real fun: generate a mulligan recommendation. Are there 2-4 lands? With the lands in the hand, what can be played? do any of those get you more land or mana? with only these cards, can you play a creature (could be your commander)? If not, do any of them get you more cards?
    - 🚧 STARTED — the **Mulligan Advisor** (`recommendMulligan`) + dev-mode **Trainer** chat. Phases 1 & 2 done; the land-count heuristic is the first of these ideas. The rest (what can be played, ramp, creature/commander, card draw) are heuristics the Trainer will grow. See `notes/DESIGN-mulligan-advisor.md`.
    - ⬜ NEXT (paused on user request, 2026-06-23): build the Trainer agent on AgentCore in a separate repo (`notes/agentcore-advisor-agent-prompt.md`), then point `askMulliganAdvisorAgent()` at it.
    - ⬜ deferred: download a card database (MTGJSON/Scryfall) so heuristics can read mana cost / CMC / type line without bloating `CardDefinition` (inject via a port).

- remove the deck title section from the game page entirely

- move the library to the right, that's where I put it in a real game
