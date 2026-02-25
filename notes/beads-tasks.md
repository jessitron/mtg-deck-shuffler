# Beads Tasks

Extracted from `.beads/issues.jsonl` on 2026-02-24.

## Open Tasks

### Priority 1 (Highest)

- **mtg-19r** — Choose Card Sleeve
  When we play MTG in real life, we put our cards in sleeves. This protects them, but more fun, it changes the appearance of the card backs. This app needs to let them choose the appearance of the card back.

  On the /prepare page, the player can click a "customize" button that appears over the library card back. That triggers a modal, where they can choose a color or an art card for the card back appearance. When they choose one, the appearance of the card back changes. This configuration is saved on the Prep record. Then when the Game is created, it's copied there. The appearance of the card back changes on the /game page.

  Phases: solid colors → arbitrary color picker → art card selection → paste scryfall link.

- **mtg-fig** — Make the card modal stable to next/previous *(done)*
  Currently clicking next/previous in the card modal causes the card to move around due to varying title widths. Fix the card position to stay constant. Detailed acceptance criteria with screen size requirements.
  - *Depends on:* mtg-cy2 (closed)

### Priority 2

- **mtg-04d** — On the /game page, make the game-name use the Orbitron font
- **mtg-057** — Make head.ejs take a list of extra .js, so we don't load game.js on the homepage
- **mtg-236** — Make cmd-Z undo (same as the Undo button); ctrl-Z on Windows
- **mtg-chq** — Make game IDs not guessable
  Generate a sequence of random words for the Game ID instead of sequential numbers.
- **mtg-cmf** — Error page appearance
  List the different error pages and improve each one.
- **mtg-dg8** — Drawn cards go at the beginning
  When a card is drawn, put it at the beginning of the hand instead of the end. Other cards should animate moving right.
- **mtg-eds** — Choose Playmat *(epic)*
  Let people choose their playmat background from art card images, then scryfall links, then any URL.
- **mtg-lud** — Sort the drawn cards
  Sort initial hand: lands first (basic lands by type), then creatures by mana value, then everything else by mana value.
  - *Depends on:* mtg-o2f
- **mtg-o2f** — Draw cards to begin the game
  When a game starts, draw 7 cards before returning the game page.
- **mtg-oca** — Secondary command zone color matches sleeve inner
  - *Depends on:* mtg-10u, mtg-b6t
- **mtg-qe1** — Spectator Mode
  A way for a person to access a game with the ability to look at all cards but no ability to change anything.
- **mtg-ssr** — Animate played cards to the table
  When a card is played, it should fly from where it is to the table.
- **mtg-xqy** — Configure number of cards to draw
  On the prepare page, let the player change the number of cards drawn. Saved on the Prep.
  - *Depends on:* mtg-o2f

### Priority 3

- **mtg-014** — Redo
  Make cmd-R (or ctrl-R on Windows) redo an action if one was just undone.
  - *Depends on:* mtg-236
- **mtg-5lm** — Put on Bottom in Random Order
  When there are multiple Revealed cards, add a button to randomize and put them all on bottom.
- **mtg-9bh** — Mulligan Button
  Before any card is played, offer a mulligan button to re-draw.
  - *Depends on:* mtg-xqy
- **mtg-b6t** — Base command zone color on sleeve
  If they choose a solid color for the sleeve, make the command zone that color.
  - *Depends on:* mtg-19r
- **mtg-mwz** — Add a play counter to the command zone
  Count number of times commander has been played.
- **mtg-z1y** — Animations that reveal movement
  Show where a card is going every time it changes state with fly animations.

### Priority 4

- **mtg-10u** — Choose inner sleeve color
  In the Choose Sleeves modal, let them choose a solid color for the sleeve inner (default black). That color becomes the card face background.
  - *Depends on:* mtg-29i
- **mtg-199** — Cards on table know how they got there
  Record how each card arrived on the table (Play, Discard, Exile) and show it in the Table modal.
- **mtg-29i** — Let sleeves be rectangular
  Add option for rectangular sleeves (208x286, 8px larger). Requires CSS variable refactor.
  - *Depends on:* mtg-19r
- **mtg-5x2** — Copy card including sleeve
  Put an image in the copy/paste buffer that includes the sleeve inner color outline around the card.
  - *Depends on:* mtg-10u
- **mtg-68a** — Customize command zone to sleeves
  If they choose an art card for the sleeve, analyze it for primary/secondary colors for the command zone.
  - *Depends on:* mtg-10u

## Dependency Chain

```
mtg-19r (Choose Card Sleeve)
  └─ mtg-29i (Rectangular sleeves)
      └─ mtg-10u (Inner sleeve color)
          ├─ mtg-5x2 (Copy card with sleeve)
          ├─ mtg-68a (Command zone matches sleeve art)
          └─ mtg-oca (Secondary CZ matches sleeve inner)
  └─ mtg-b6t (CZ color from sleeve)
      └─ mtg-oca (Secondary CZ matches sleeve inner)

mtg-o2f (Draw cards to begin game)
  ├─ mtg-lud (Sort drawn cards)
  └─ mtg-xqy (Configure draw count)
      └─ mtg-9bh (Mulligan button)

mtg-236 (Cmd-Z undo)
  └─ mtg-014 (Redo)
```

## Closed Tasks (14 total)

All closed tasks were related to query parameter support for modal states (epic mtg-cy2) and game history admin screen (mtg-3sn).
