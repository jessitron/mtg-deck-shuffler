# MTG Deck Shuffler Application Flow

## Happy Little Flow Diagram

```
    ┌─────────────────┐
    │  Deck Selection │
    │      🎴         │
    └─────────┬───────┘
              │ select deck
              ▼
    ┌─────────────────┐
    │   Deck Review   │◄─────────┐
    │  📋 Not Started │          │
    │  🔍 Search Lib  │          │ choose another
    └─────┬─────┬─────┘          │
          │     │                │
 start    │     └────────────────┘
 game     │
          ▼
    ┌─────────────────┐
    │   Play Game     │
    │   🎮 Active     │◄─┐ restart
    │   🃏 Shuffled   │  │
    └─────────┬───────┘  │
              │          │
              │ quit     │
              ▼          │
    ┌─────────────────┐  │
    │  Deck Selection │  │
    │      🎴         │  │
    └─────────────────┘  │
              ▲          │
              └──────────┘
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
- No Game ID in URL yet

**Display:**
- Deck information
- Commander card(s) 
- Library with Search button (reveals full card list)

**Actions:**
- **Start Game** → Proceeds to Play Game (shuffles library, adds Game ID to URL)
- **Choose Another Deck** → Returns to Deck Selection

## 3. Play Game

The active game screen where gameplay occurs.

**State:**
- Game is active
- Library is shuffled
- Game ID present in URL

**Display:**
- Commander card(s)
- Library
- Revealed cards (future)
- Hand (future)

**Actions:**
- **Restart Game** → Reinitializes Play Game screen
- **Quit** → Returns to Deck Selection

## Key State Transitions

- **Deck Selection → Deck Review:** Deck is loaded but game not started
- **Deck Review → Play Game:** Library gets shuffled, Game ID added to URL
- **Play Game → Play Game (restart):** Game state reinitialized
- **Any screen → Deck Selection:** Via Quit/Choose Another Deck buttons