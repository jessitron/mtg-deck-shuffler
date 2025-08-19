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

### Second screen: deck details

After the backend fetches the deck from archidekt, we display the commander and a few other details

```
             *Woohoo it's Magic time!*
  ┌────────────┐
  │            │
  │            │
  │  Commander │         Deck Name
  │            │
  │            │         other details
  │            │
  └────────────┘
         [Start Game]  [Choose Another Deck]
```

Choose Another Deck returns to the load deck screen.

Start Game moves to the game in progress screen.

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
                               [End Game]
```
