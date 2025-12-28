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
   │  Docs  │         │ About  │    │  Deck Selection │ ◄───────────────┐
   └────────┘         └────────┘    └─────────────────┘                 │
 (informational)   (informational)           │                          │
                                              │ Let's Play               │
                                              ▼                          │
                                     ┌─────────────────┐                 │
                                     │   Game Prep     │                 │
                                     │  (Deck Review)  │                 │
                                     │                 │                 │
                                     │ State:          │                 │
                                     │ • GamePrep      │                 │
                                     │ • Unshuffled    │                 │
                                     │ • Prep ID in URL│                 │
                                     │   /prepare/:id  │                 │
                                     └─────────────────┘                 │
                                              │                          │
                                              │ Shuffle Up               │
                                              ▼                          │
                                     ┌─────────────────┐                 │
                                     │   Play Game     │                 │
                                     │                 │                 │
                                     │ State:          │                 │
                                     │ • Game Active   │                 │
                                     │ • Library       │                 │
                                     │   Shuffled      │                 │
                                     │ • Game ID in URL│                 │
                                     │   /game/:id     │                 │
                                     └─────────────────┘                 │
                                              │                          │
                                         ┌────┴────┐                     │
                                         │         │                     │
                                         ▼         ▼                     │
                                      Restart    Quit ───────────────────┤
                                        Game       │                     │
                                         │         │                     │
                                         └─────────┘                     │
                                                                         │
                                Choose Another Deck ──────────────────────┘
```

## Screen Flow Overview

The application follows a progression through informational and game screens:

**Home → Deck Selection → Game Prep → Play Game**

Informational pages (Docs, About) are accessible from Home and can be navigated to at any time.

**Key Architectural Change:** Game preparation (deck review) and active gameplay are now separate phases with distinct URLs, fixing the browser back button and enabling future prep-specific features.

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

## 5. Game Prep (Deck Review)

Shows deck information and allows final preparation before starting the game.

Endpoints:

- GET /prepare/:prepId

**State:**

- GamePrep exists (not a game yet)
- Library is not shuffled
- Prep ID in URL

**Display:**

- Deck information
- Commander card(s)
- Card list

**Actions:**

- **Shuffle Up** → Creates Active game, proceeds to Play Game (shuffles library)
- **Choose Another Deck** → Returns to Deck Selection

**Technical Details:**

- Creates PersistedGamePrep on deck load
- Stores full deck configuration
- Future: Will store prep-specific settings (playmat, card backs, etc.)

## 6. Play Game

The active game screen where gameplay occurs.

Endpoints:

- GET /game/:gameId

**State:**

- Game is Active (only Active games shown at this URL)
- Library is shuffled
- Game ID in URL
- References prepId and prepVersion (for restart)

**Display:**

- Commander card(s)
- Library
- Revealed cards
- Hand

**Actions:**

- **Restart Game** → Loads prep, creates new Active game, reinitializes Play Game screen
- **Quit** → Returns to Deck Selection

**Technical Details:**

- GameState.status is always Active (no NotStarted status)
- Restart uses existing prep to create new game

## Key State Transitions

- **Home → Deck Selection:** User clicks to start playing with a deck
- **Home → Docs/About:** User navigates to informational pages
- **Docs/About → Home:** User returns to home page
- **Deck Selection → Game Prep:** "Let's Play" clicked, deck is loaded, GamePrep created
- **Game Prep → Play Game:** "Shuffle Up" clicked, Active game created from prep, library shuffled
- **Play Game → Play Game (restart):** New Active game created from same prep, library re-shuffled
- **Any game screen → Deck Selection:** Via Quit/Choose Another Deck buttons
- **Browser back from Play Game:** Returns to Game Prep (browser history now works correctly!)
