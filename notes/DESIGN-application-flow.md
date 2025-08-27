# MTG Deck Shuffler Application Flow

```
┌─────────────────┐
│  Deck Selection │ ◄─────────────────────────┐
│   (Entry Point) │                           │
└─────────────────┘                           │
         │                                    │
         │ Select/Load Deck                   │
         ▼                                    │
┌─────────────────┐                           │
│   Deck Review   │                           │
│                 │                           │
│ State:          │ ◄─┐                       │
│ • Not Started   │   │                       │
│ • Unshuffled    │   │ Choose Another Deck   │
│ • Game ID in URL│   │                       │
└─────────────────┘   │                       │
         │             │                       │
         │ Shuffle Up  │                       │
         ▼             │                       │
┌─────────────────┐    │                       │
│   Play Game     │    │                       │
│                 │    │                       │
│ State:          │    │                       │
│ • Game Active   │    │                       │
│ • Library       │    │                       │
│   Shuffled      │    │                       │
│ • Game ID in URL│    │                       │
└─────────────────┘    │                       │
         │              │                       │
    ┌────┴────┐         │                       │
    │         │         │                       │
    ▼         ▼         │                       │
 Restart    Quit ───────┴───────────────────────┘
   Game        
    │           
    └─────┘     
```

## Screen Flow Overview

The application follows a linear progression through three main screens:

**Deck Selection → Deck Review → Play Game**

## 1. Deck Selection

The entry point where users choose which deck to load for their game session.

**Actions:**

- Select/load a deck

**Navigation:**

- Proceeds to: Deck Review

## 2. Deck Review

Shows deck information and allows final preparation before starting the game.

**State:**

- Game exists but is "Not Started"
- Library is not shuffled
- Game ID in URL

**Display:**

- Deck information
- Commander card(s)
- Library with Search button (reveals full card list)

**Actions:**

- **Shuffle Up** → Proceeds to Play Game (shuffles library)
- **Choose Another Deck** → Returns to Deck Selection

## 3. Play Game

The active game screen where gameplay occurs.

**State:**

- Game is active
- Library is shuffled
- Game ID in URL

**Display:**

- Commander card(s)
- Library
- Revealed cards (future)
- Hand (future)

**Actions:**

- **Restart Game** → Reinitializes Play Game screen
- **Quit** → Returns to Deck Selection

## Key State Transitions

- **Deck Selection → Deck Review:** Deck is loaded, game exists but is Not Started
- **Deck Review → Play Game:** Library gets shuffled, Game ID added to URL
- **Play Game → Play Game (restart):** Game state reinitialized
- **Any screen → Deck Selection:** Via Quit/Choose Another Deck buttons
