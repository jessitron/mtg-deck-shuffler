# User Interface

Status: partially implemented

This document describes the user interface for the MTG Deck Shuffler app.

This web app will run on PC or tablet. It would not make sense on mobile.

## Wireframes

### First screen: Deck Selection

This has an encouraging title and ways to choose a deck.

This includes loading a deck from Archidekt by deck number.
The deck number defaults to my favorite deck.

```
        *Woohoo it's Magic time!*
  Enter Archidekt Deck Number: [__16038812_______] [Let's Play]
```

The 'Let's Play' button brings out the deck details.

At the moment, there's a dropdown for local decks, as referenced in FEATURE-local-decks.md. That file includes desired improvements.

### Second Screen: Deck Review

Here, we have a game in status Not Started.

The Search button is available even before the game is started. It makes visible a list of all cards in the library, ordered by position.

```
div: deck-summary
  div: command-zone       div: game-details
   ┌───────────────┐
   │               │        Deck Name
   │               │
   │  Command zone │        other details
   │               │
   │               │        Game ID
   │               │
   └───────────────┘

div: library-section       div: start-game-buttons
      ┌───────────┐
     ┌───────────┐│
    ┌───────────┐││
    │           │││
    │           │││         [Shuffle Up]
    │           │││
    │           │││         [Choose Another Deck]
    │Library (n)│││
    │           │││
    │           ││┘
    │           │┘
    └───────────┘
      [Search]

```

### Main screen: game in progress

Here is a rough layout for when a game is in progress.

Revealed Cards is not always visible. Hand starts empty.

The Search button under the Library makes visible a list of all cards in the library, ordered by position.

The Search button near table.png displays the same modal as the library's Search, but shows cards on the Table instead of in the Library.

Revealed Cards and Haxnd sections scroll horizontally if there are enough cards in them.

The library displays the back of a magic card: https://backs.scryfall.io/normal/2/2/222b7a3b-2321-4d4c-af19-19338b134971.jpg -> public/mtg-card-back.jpg

```
div: game-summary
  div: command-zone       div: game-details
   ┌───────────────┐
   │               │        MTG Deck Shuffler
   │               │
   │  Command zone │        Game {Game ID} in progress. Player: you. Deck: {Deck Name}
   │               │
   │               │        [History]
   └───────────────┘
div: game-container
  div: library-section          div: revealed-cards-section (width 2)          div: mid-game-buttons

      ┌───────────┐     ┌────────────────────────────────┐
     ┌───────────┐│     │        Revealed (n)            │                         Table (n)
    ┌───────────┐││     │                                │
    │Library (n)│││     │   ┌────────┐   ┌───────┐       │
    │           │││     │   │        │   │       │       │
    │           │││     │   │        │   │       │       │
    │           │││     │   │        │   │       │       │                         table.png
    │           │││     │   │        │   │       │       │
    │           │││     │   │        │   │       │       │
    │           ││┘     │   └────────┘   └───────┘       │                          [Search]
    │           │┘      │                                │
    └───────────┘       └────────────────────────────────┘
    [Search] [Shuffle]
     [Draw] [Reveal]

  div: hand-section (width 4)
      ┌────────────────────────────────────────────────────────────┐
      │                    Hand (n)                                │
      │     ┌─────────┐   ┌─────────┐   ┌──────────┐               │
      │     │         │   │         │   │          │               │
      │     │         │   │         │   │          │               │
      │     │         │   │         │   │          │               │
      │     │         │   │         │   │          │               │
      │     │         │   │         │   │          │               │
      │     │         │   │         │   │          │               │
      │     └─────────┘   └─────────┘   └──────────┘               │
      │        [Play]        [Play]         [Play]                 │
      └────────────────────────────────────────────────────────────┘

  div: end-game-actions
                   [Restart Game] [Choose Another Deck]
```

## Layout

## Search Library Modal

The Search button opens a modal dialog that displays the library contents in a user-friendly interface.

### Modal Structure

```
┌────────────────────────────────────────────────────────────────────────────┐
│                          Dark Overlay (60% opacity)                        │
│                                                                            │
│    ┌─────────────────────────────────────────────────────────────────┐     │
│    │                    Library Contents                         ×   │     │
│    ├─────────────────────────────────────────────────────────────────┤     │
│    │                                                                 │     │
│    │  99 cards in library, ordered by position                       │     │
│    │                                                                 │     │
│    │  1  Academy Manufactor                                          │     │
│    │  2  Adventurous Impulse                                         │     │
│    │  3  Aggressive Mammoth                                          │     │
│    │  4  Arcane Signet                                               │     │
│    │  ...                                                            │     │
│    │  (scrollable list continues)                                    │     │
│    │                                                                 │     │
│    └─────────────────────────────────────────────────────────────────┘     │
└────────────────────────────────────────────────────────────────────────────┘
```

Clicking a card name brings up the card modal, with action buttons Reveal and Put in Hand.
