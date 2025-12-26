# MTG Deck Shuffler Application Flow

```
                    ┌──────────────┐
                    │     Home     │
                    │ (Entry Point)│
                    └──────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
   ┌────────┐         ┌────────┐    ┌─────────────────┐
   │  Docs  │         │ About  │    │  Deck Selection │ ◄─────────────┐
   └────────┘         └────────┘    └─────────────────┘               │
 (informational)   (informational)           │                        │
                                              │ Let's Play             │
                                              ▼                        │
                                     ┌─────────────────┐               │
                                     │   Deck Review   │               │
                                     │                 │               │
                                     │ State:          │ ◄─┐           │
                                     │ • Not Started   │   │           │
                                     │ • Unshuffled    │   │           │
                                     │ • Game ID in URL│   │           │
                                     └─────────────────┘   │           │
                                              │            │           │
                                              │ Shuffle Up │           │
                                              ▼            │           │
                                     ┌─────────────────┐   │           │
                                     │   Play Game     │   │           │
                                     │                 │   │           │
                                     │ State:          │   │           │
                                     │ • Game Active   │   │           │
                                     │ • Library       │   │           │
                                     │   Shuffled      │   │           │
                                     │ • Game ID in URL│   │           │
                                     └─────────────────┘   │           │
                                              │            │           │
                                         ┌────┴────┐       │           │
                                         │         │       │           │
                                         ▼         ▼       │           │
                                      Restart    Quit ─────┴───────────┤
                                        Game       │                   │
                                         │         │                   │
                                         └─────────┘                   │
                                                                       │
                                Choose Another Deck ────────────────────┘
```

## Screen Flow Overview

The application follows a progression through informational and game screens:

**Home → Deck Selection → Deck Review → Play Game**

Informational pages (Docs, About) are accessible from Home and can be navigated to at any time.

## 1. Home

The landing page that introduces the tool and explains how to use it.

Endpoints:

- GET / (loads the home page)

**Display:**

- Overview of the application
- Links to get started with a deck
- Links to documentation and about pages

**Navigation:**

- To Deck Selection (start playing)
- To Docs (learn how to use)
- To About (learn about the project)

## 2. Docs

Documentation page explaining how to use the deck shuffler for remote gameplay.

Endpoints:

- GET /docs (loads the documentation page)

**Display:**

- Instructions for using the app with Mural/Miro and Discord
- Gameplay guidance

**Navigation:**

- Back to Home

## 3. About

Information about the project.

Endpoints:

- GET /about (loads the about page)

**Display:**

- Project information
- Credits and acknowledgments

**Navigation:**

- Back to Home

## 4. Deck Selection

The entry point where users choose which deck to load for their game session.

Endpoints:

- GET /choose-any-deck (loads the deck selection page)

**Actions:**

- Let's Play (choose a deck and create a game)

**Navigation:**

- Proceeds to: Deck Review

## 5. Deck Review

Shows deck information and allows final preparation before starting the game.

Endpoints:

- GET /game/:gameId

**State:**

- Game exists but is "Not Started"
- Library is not shuffled
- Game ID in URL

**Display:**

- Deck information
- Commander card(s)
- card list

**Actions:**

- **Shuffle Up** → Proceeds to Play Game (shuffles library)
- **Choose Another Deck** → Returns to Deck Selection

## 6. Play Game

The active game screen where gameplay occurs.

Endpoints:

- GET /game/:gameId (loads game.html)

**State:**

- Game is active
- Library is shuffled
- Game ID in URL

**Display:**

- Commander card(s)
- Library
- Revealed cards
- Hand

**Actions:**

- **Restart Game** → Reinitializes Play Game screen
- **Quit** → Returns to Deck Selection

## Key State Transitions

- **Home → Deck Selection:** User clicks to start playing with a deck
- **Home → Docs/About:** User navigates to informational pages
- **Docs/About → Home:** User returns to home page
- **Deck Selection → Deck Review:** "Let's Play" clicked, deck is loaded, game exists but is Not Started
- **Deck Review → Play Game:** Library gets shuffled, Game ID added to URL
- **Play Game → Play Game (restart):** Game state reinitialized
- **Any game screen → Deck Selection:** Via Quit/Choose Another Deck buttons
