# Pages and Modals Map

Complete reference of all pages and modals in the MTG Deck Shuffler application.

## Pages (Full Page Returns)

### Static Information Pages

#### 1. Home (`GET /`)
- **Returns**: `views/index.ejs`
- **Modals**: None
- **Parameters**: None

#### 2. Documentation (`GET /docs`)
- **Returns**: `views/docs.ejs`
- **Modals**: None
- **Parameters**: None

#### 3. About (`GET /about`)
- **Returns**: `views/about.ejs`
- **Modals**: None
- **Parameters**: None

### Dynamic Gameplay Pages

#### 4. Deck Selection (`GET /choose-any-deck`)
- **Returns**: `views/choose-any-deck.ejs`
- **Parameters**: None
- **Sub-fragments**:
  - Precon Tab: `GET /deck-selection-tabs/precon`
  - Archidekt Tab: `GET /deck-selection-tabs/archidekt`
- **Modals**: None

#### 5. Deck Preparation/Review (`GET /prepare/:prepId`)
- **Returns**: `views/prepare.ejs`
- **Parameters**: `prepId` (integer)
- **Modals**:
  - `GET /prep-card-modal/:prepId/:cardIndex` - View card details
  - `GET /prep-library-modal/:prepId` - View all library cards

#### 6. Active Game (`GET /game/:gameId`)
- **Returns**: `formatGamePageHtmlPage()` from `src/view/play-game/active-game-page.ts`
- **Parameters**: `gameId` (integer)
- **Modals**:
  - `GET /card-modal/:gameId/:cardIndex` - View card details in game
  - `GET /library-modal/:gameId` - View library contents
  - `GET /table-modal/:gameId` - View cards on table
  - `GET /history-modal/:gameId` - View action history
  - `GET /debug-state/:gameId` - View game state JSON (debug)
  - Loss modal (special) - Shows when drawing from empty library

#### 7. Load Game State (`GET /load-game-state`)
- **Returns**: `formatLoadStateHtmlPage()` from `src/view/debug/load-state.ts`
- **Parameters**: None
- **Purpose**: Debug page for pasting JSON game state
- **Modals**: None

---

## Modals (Fragments Returning Modal HTML)

### Game Modals (require `gameId`)

| Modal Route | Triggered From | Parameters | Content |
|---|---|---|---|
| `GET /card-modal/:gameId/:cardIndex` | Click on card in game, or navigation within modal | `gameId`, `cardIndex`, optional `?expected-version=N` | Single card details with image, Gatherer link, Copy button, Flip (if 2-faced), location-specific actions, navigation to prev/next card in zone |
| `GET /library-modal/:gameId` | "Search" button in Library section | `gameId` | List of library cards with clickable names that open `/card-modal` |
| `GET /table-modal/:gameId` | "N Cards on table" button | `gameId` | List of cards on table with clickable names that open `/card-modal` |
| `GET /history-modal/:gameId` | "Action History (N)" button in game footer | `gameId` | List of all game events/actions taken |
| `GET /debug-state/:gameId` | "State" debug button in footer | `gameId` | Collapsible JSON view of entire persisted game state |

### Prep Page Modals (require `prepId`)

| Modal Route | Triggered From | Parameters | Content |
|---|---|---|---|
| `GET /prep-card-modal/:prepId/:cardIndex` | Click on card in prep page | `prepId`, `cardIndex` | Single card details (simplified - no game actions) with Gatherer link and Copy button |
| `GET /prep-library-modal/:prepId` | "Library Contents" button in prep page | `prepId` | List of library cards with clickable names that open `/prep-card-modal` |

### Utility Modals

| Modal Route | Triggered From | Parameters | Content |
|---|---|---|---|
| `GET /close-modal` | Close button or Escape on any standard modal | None | Empty response (closes modal) |
| `GET /close-card-modal` | Close button or Escape on card modal | None | Empty response (closes modal) |
| Loss Modal | `POST /draw/:gameId` when library is empty | None | Shows "☠️ You Lose! ☠️" message |
| Stale State Error Modal | Any action when client version != server version | None | Shows version mismatch, list of missed events, Refresh button |

---

## Modal Nesting (Modal → Modal Links)

Modals can open other modals, creating navigation chains. **Crucially, when opening a card modal from within a library/table modal, BOTH modals remain open simultaneously** (see Modal Container Architecture section).

### 1. Game → Library Modal → Card Modal
- Click "Search" button → `GET /library-modal/:gameId` (populates `#modal-container`)
- Click card name in list → `GET /card-modal/:gameId/:cardIndex` (populates `#card-modal-container`)
- **Result**: Library modal stays open in background, card modal overlays it
- Can navigate with ◀/▶ buttons to next/prev card in library
- Closing card modal returns to library modal view

### 2. Game → Table Modal → Card Modal
- Click "N Cards on table" button → `GET /table-modal/:gameId` (populates `#modal-container`)
- Click card name in list → `GET /card-modal/:gameId/:cardIndex` (populates `#card-modal-container`)
- **Result**: Table modal stays open in background, card modal overlays it
- Closing card modal returns to table modal view

### 3. Game → Card Modal → Card Modal (Navigation)
- Click card anywhere (hand, revealed, etc.) → `GET /card-modal/:gameId/:cardIndex` (populates `#card-modal-container`)
- **Result**: Only card modal is open, no background modal
- Click ◀ or ▶ buttons → `GET /card-modal/:gameId/:nextOrPrevCardIndex` (replaces content in `#card-modal-container`)
- Flip button on 2-faced cards → Same modal updated with back face

### 4. Prep → Library Modal → Card Modal
- Click "Library Contents" button → `GET /prep-library-modal/:prepId`
- Click card name in list → `GET /prep-card-modal/:prepId/:cardIndex`

### 5. Prep → Card Modal (Direct)
- Click any card directly → `GET /prep-card-modal/:prepId/:cardIndex`

---

## Parameter Requirements

| Parameter | Required For | Purpose | Type |
|---|---|---|---|
| `gameId` | Card, Library, Table, History, Debug modals | Identifies which game | integer (route param) |
| `cardIndex` | Card modals (game and prep) | Identifies which card to display | integer (route param) |
| `prepId` | Prep card and library modals | Identifies prep page context | integer (route param) |
| `expected-version` | Card modals, most card actions | Optimistic concurrency control | integer (query param) |

---

## Card Modal Details

### Game Card Modal (`/card-modal/:gameId/:cardIndex`)

**Always Includes**:
- Card image (front or back face)
- Card name
- Gatherer link
- Copy button (copies image to clipboard)
- Close button

**Conditional Elements**:
- **Flip button**: If card has 2 faces (routes to `POST /flip-card-modal/:gameId/:cardIndex`)
- **Navigation arrows** (◀/▶): Navigate to prev/next card in same zone
- **Position indicator**: "Card X of Y" (except for Table location)

**Action Buttons by Location**:
- **Hand**: Play, Put on Top, Put on Bottom
- **Library**: Reveal, Put in Hand
- **Revealed**: Play, Put in Hand, Put on Top, Put on Bottom
- **Table**: Return (to revealed)
- **CommandZone**: No location-specific actions

### Prep Card Modal (`/prep-card-modal/:prepId/:cardIndex`)

**Simplified version**:
- Card image
- Card name
- Gatherer link
- Copy button
- Close button
- **No game-state-changing actions** (no Play, Put on Top, etc.)

---

## Modal Closing Behavior

All modals close on:
- Click X (close) button
- Click outside modal overlay
- Press Escape key
- After card action (Play, Put on Top, etc.) - modals auto-close and update game state

---

## Modal Container Architecture

The application uses **two separate modal containers** to support nested modals:

### 1. `#modal-container`
- Used for: Library Modal, Table Modal, History Modal, Debug Modal
- Can have at most one modal open at a time
- Acts as "background" layer when card modal is also open

### 2. `#card-modal-container`
- Used for: Card Detail Modals only
- Can be open independently OR simultaneously with a modal in `#modal-container`
- Acts as "foreground" layer, overlaying any modal in `#modal-container`

### Possible Modal States

| State | `#modal-container` | `#card-modal-container` | Example URL |
|---|---|---|---|
| No modals | empty | empty | `/game/123` |
| Card only | empty | Card Modal | `/game/123?openCard=5` |
| Library only | Library Modal | empty | `/game/123?openLibrary=true` |
| **Library + Card** | **Library Modal** | **Card Modal** | `/game/123?openLibrary=true&openCard=5` |
| Table only | Table Modal | empty | `/game/123?openTable=true` |
| **Table + Card** | **Table Modal** | **Card Modal** | `/game/123?openTable=true&openCard=5` |
| History only | History Modal | empty | `/game/123?openHistory=true` |
| Debug only | Debug Modal | empty | `/game/123?openDebug=true` |

**Important**: When a card modal is opened from within the library/table modal, BOTH containers have content. The user can close the card modal and still see the library/table modal behind it. This is different from opening a card modal directly (e.g., clicking a card in hand), where only the card modal is open.

---

## Application Flow Summary

```
Home → Choose Deck → Prepare → Game
                         ↓          ↓
                    Prep Modals   Game Modals
                         ↓          ├→ Library Modal → Card Modal
                    Card Modal     ├→ Table Modal → Card Modal
                    Library Modal  ├→ History Modal
                                   ├→ Debug Modal
                                   └→ Card Modal (direct)
                                      └→ Card Modal (navigate)
```

---

## Implementation Files

- **Routes**: `/src/app.ts` (lines 140-1224)
- **Game Modals**: `/src/view/play-game/game-modals.ts`
- **Game Page**: `/src/view/play-game/active-game-page.ts`
- **Prep Page**: `/views/prepare.ejs`
- **Prep Helpers**: `/src/view/common/prep-view-helpers.ts`
