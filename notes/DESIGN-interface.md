# User Interface

This document describes the user interface for the MTG Deck Shuffler app. It is not complete.

## Wireframes

### First screen: load deck

This has an encouraging title and a way to enter a deck number and load it.
The deck number defaults to my favorite deck.

```
        *Woohoo it's Magic time!*
  Enter Archidekt Deck Number: [__14669648_______] [Load Deck]
```

The 'Load Deck' button brings out the deck details.

### Main screen: game in progress

Here is a rough layout for when a game is in progress:

```

   ┌────────────┐
   │            │        Deck Name
   │            │
   │  Commander │        other details
   │            │
   │            │        Game ID
   │            │
   └────────────┘

           ┌───────────┐   ┌────────────────────────────────┐
          ┌───────────┐│   │        Revealed Cards          │
         ┌───────────┐││   │                                │
         │           │││   │   ┌────────┐   ┌───────┐       │
         │           │││   │   │        │   │       │       │
         │           │││   │   │        │   │       │       │
         │           │││   │   │        │   │       │       │
         │  Library  │││   │   │        │   │       │       │
         │           │││   │   │        │   │       │       │
         │           │││   │   │        │   │       │       │
         │           │││   │   │        │   │       │       │
         │           ││┘   │   └────────┘   └───────┘       │
         │           │┘    │                                │
         └───────────┘     └────────────────────────────────┘

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
      ⏵ View library contents (for testing)
                   [Restart Game] [Choose Another Deck]
```

The library displays the back of a magic card: https://backs.scryfall.io/normal/2/2/222b7a3b-2321-4d4c-af19-19338b134971.jpg
