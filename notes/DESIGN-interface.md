# User Interface

Status: imperfectly implemented

This document describes the user interface for the MTG Deck Shuffler app. It is not complete.

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

### Main screen: game in progress

Here is a rough layout for when a game is in progress.

Revealed Cards is not always visible. Hand starts empty.

The Search button is available even before the game is started. It makes visible a list of all cards in the library, ordered by position.

```

   ┌───────────────┐
   │               │        Deck Name
   │               │
   │  Command zone │        other details
   │               │
   │               │        Game ID
   │               │
   └───────────────┘

           ┌───────────┐   ┌────────────────────────────────┐
          ┌───────────┐│   │        Revealed Cards          │
         ┌───────────┐││   │                                │
         │           │││   │   ┌────────┐   ┌───────┐       │
         │           │││   │   │        │   │       │       │
         │           │││   │   │        │   │       │       │
         │           │││   │   │        │   │       │       │
         │  Library  │││   │   │        │   │       │       │
         │           │││   │   │        │   │       │       │
         │           ││┘   │   └────────┘   └───────┘       │
         │           │┘    │                                │
         └───────────┘     └────────────────────────────────┘
          [Search]

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
      │                                                            │
      └────────────────────────────────────────────────────────────┘
                   [Restart Game] [Choose Another Deck]
```

The library displays the back of a magic card: https://backs.scryfall.io/normal/2/2/222b7a3b-2321-4d4c-af19-19338b134971.jpg
