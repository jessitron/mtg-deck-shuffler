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
  Enter Archidekt Deck Number: [__14669648_______] [Let's Play]
```

The 'Let's Play' button brings out the deck details.

At the moment, there's a dropdown for local decks, as referenced in FEATURE-local-decks.md. That file includes desired improvements.

### Second Screen: Deck Review

Here, we have a game in status Not Started.

```
div: game-container
  div: command-zone       div: game-details
   ┌───────────────┐
   │               │        Deck Name
   │               │
   │  Command zone │        other details
   │               │
   │               │        Game ID
   │               │
   └───────────────┘

div: library-section       div: game-actions
      ┌───────────┐
     ┌───────────┐│
    ┌───────────┐││
    │           │││
    │           │││         [Shuffle Up]
    │           │││
    │           │││         [Choose Another Deck]
    │  Library  │││
    │           │││
    │           ││┘
    │           │┘
    └───────────┘
      [Search]
       [Draw]

```

### Main screen: game in progress

Here is a rough layout for when a game is in progress.

Revealed Cards is not always visible. Hand starts empty.

The Search button is available even before the game is started. It makes visible a list of all cards in the library, ordered by position.

After the game is started, the Draw button is available. It moves the top card from Library to Hand.

the [Play] button moves a card from Hand or Revealed to the Table.

The [X Cards on table] button (where X is a number of cards on table) displays the same modal as Search, but shows cards on the Table instead of in the Library.

Revealed Cards and Hand sections scroll horizontally if there are enough cards in them.

The library displays the back of a magic card: https://backs.scryfall.io/normal/2/2/222b7a3b-2321-4d4c-af19-19338b134971.jpg

```
div: game-container
  div: command-zone       div: game-details           div: table-section
   ┌───────────────┐
   │               │        Deck Name
   │               │
   │  Command zone │        other details             [X Cards on table]
   │               │
   │               │        Game ID
   │               │
   └───────────────┘

div: library-section          div: revealed-cards-section (width 3)
      ┌───────────┐     ┌────────────────────────────────┐
     ┌───────────┐│     │        Revealed Cards          │
    ┌───────────┐││     │                                │
    │           │││     │   ┌────────┐   ┌───────┐       │
    │           │││     │   │        │   │       │       │
    │           │││     │   │        │   │       │       │
    │           │││     │   │        │   │       │       │
    │  Library  │││     │   │        │   │       │       │
    │           │││     │   │        │   │       │       │
    │           ││┘     │   └────────┘   └───────┘       │
    │           │┘      │                                │
    └───────────┘       └────────────────────────────────┘
      [Search]
       [Draw]

div: hand-section (width 4)
      ┌────────────────────────────────────────────────────────────┐
      │                                                            │
      │                    Hand                                    │
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

div: game-actions
                   [Restart Game] [Choose Another Deck]
```

## Layout

## Search Library Modal

The Search button opens a modal dialog that displays the library contents in a user-friendly interface.

### Modal Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Dark Overlay (60% opacity)                        │
│                                                                             │
│    ┌─────────────────────────────────────────────────────────────────┐     │
│    │                    Library Contents                         ×   │     │
│    ├─────────────────────────────────────────────────────────────────┤     │
│    │                                                             │     │
│    │  99 cards in library, ordered by position                 │     │
│    │                                                             │     │
│    │  1  Academy Manufactor                    [Reveal] [Put in Hand] │     │
│    │  2  Adventurous Impulse                   [Reveal] [Put in Hand] │     │
│    │  3  Aggressive Mammoth                    [Reveal] [Put in Hand] │     │
│    │  4  Arcane Signet                         [Reveal] [Put in Hand] │     │
│    │  ...                                                        │     │
│    │  (scrollable list continues)                                │     │
│    │                                                             │     │
│    └─────────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Modal Features

**Visual Design:**

- Centered modal dialog with rounded corners and shadow
- Dark semi-transparent overlay behind modal
- Maximum width of 800px, 90% of viewport width
- Maximum height of 80% of viewport height
- Scrollable content area for large libraries

**Header:**

- "Library Contents" title
- Close button (×) in top-right corner

**Content:**

- Card count summary (e.g., "100 cards in library, ordered by position")
- Scrollable list of all cards in library order

**Card List Items:**
Each card displays:

- Position number (1, 2, 3, etc.)
- Card name as clickable link to Gatherer
- Action buttons (when game is active):
  - **Reveal** button (green, primary styling)
  - **Put in Hand** button (gray, secondary styling)

**Interaction:**

- Click "Search Library" button to open modal
- Close modal by:
  - Clicking the × button
  - Pressing Escape key
  - Clicking outside the modal dialog
- Card names link to Gatherer for card details
- Action buttons show placeholder alerts (functionality to be implemented)

**Game State Behavior:**

- **Before game starts (Deck Review)**: Shows card list without action buttons
- **During active game**: Shows card list with Reveal and Put in Hand buttons for each card
