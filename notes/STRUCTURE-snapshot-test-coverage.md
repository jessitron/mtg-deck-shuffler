# Snapshot Test Coverage Analysis

This document maps which endpoints call which view functions, and tracks snapshot test coverage.

## Endpoints and View Functions: TESTED by Snapshot Tests

### GET Endpoints (Rendering Pages/Fragments)

#### GET / (Homepage)
- **View Function**: EJS template `views/index.ejs`
- **Snapshot Test**: None (EJS template - manual testing only)
  - Note: Previously used `formatHomepageHtmlPage()` but migrated to EJS

#### GET /game/:gameId (Active Game Page)
- **View Function**: `formatGamePageHtmlPage()`
- **Location**: `src/view/play-game/active-game-page.ts`
- **Snapshot Test**: `test/snapshot/game-page-html.snapshot.test.ts`

#### GET /game/:gameId (Deck Review Page - game not started)
- **View Function**: `formatDeckReviewHtmlPage()`
- **Location**: `src/view/deck-review/deck-review-page.ts`
- **Snapshot Test**: `test/snapshot/deck-review-html.snapshot.test.ts`

#### GET /library-modal/:gameId
- **View Function**: `formatLibraryModalHtml()`
- **Location**: `src/view/play-game/game-modals.ts`
- **Snapshot Test**: `test/snapshot/library-modal-html.snapshot.test.ts`
  - Tests: multiple cards, single card, empty library

#### GET /table-modal/:gameId
- **View Function**: `formatTableModalHtmlFragment()`
- **Location**: `src/view/play-game/game-modals.ts`
- **Snapshot Test**: `test/snapshot/table-modal-html.snapshot.test.ts`
  - Tests: multiple cards, single card, empty table

#### GET /card-modal/:gameId/:cardIndex
- **View Function**: `formatCardModalHtmlFragment()`
- **Location**: `src/view/play-game/game-modals.ts`
- **Snapshot Test**: `test/snapshot/card-modal-html.snapshot.test.ts`
  - Tests: library card, revealed card

#### GET /history-modal/:gameId
- **View Function**: `formatHistoryModalHtmlFragment()`
- **Location**: `src/view/play-game/history-components.ts`
- **Snapshot Test**: `test/snapshot/history-modal-html.snapshot.test.ts`
  - Tests: multiple events, single event, empty history

#### GET /game-section/:gameId (HTMX fragment updates)
- **View Function**: `formatActiveGameHtmlSection()`
- **Location**: `src/view/play-game/active-game-page.ts`
- **Snapshot Test**: `test/snapshot/game-html.snapshot.test.ts`
  - Tests: active state, empty library

### POST Endpoints (Actions)

#### POST /deck, /start-game, /restart-game (Error cases)
- **View Function**: `formatErrorPageHtmlPage()`
- **Location**: `src/view/error-view.ts`
- **Snapshot Test**: `test/snapshot/error-page-html.snapshot.test.ts`

#### POST /reveal-card, /put-in-hand, /put-in-graveyard, etc.
- **View Function**: `formatActiveGameHtmlSection()`
- **Location**: `src/view/play-game/active-game-page.ts`
- **Snapshot Test**: `test/snapshot/game-html.snapshot.test.ts` (same as GET /game-section)

#### POST /flip-card-modal/:gameId/:gameCardIndex
- **View Function**: `formatCardModalHtmlFragment()`
- **Location**: `src/view/play-game/game-modals.ts`
- **Snapshot Test**: `test/snapshot/card-modal-html.snapshot.test.ts` (same as GET /card-modal)

---

## Endpoints and View Functions: NOT TESTED by Snapshot Tests

### GET Endpoints

#### GET /load-state-modal (Debug feature)
- **View Function**: `formatLoadStateModalHtmlFragment()`
- **Location**: `src/view/debug/load-state.ts`
- **Reason**: Debug functionality not covered

#### GET /debug-state/:gameId (Debug feature)
- **View Function**: `formatDebugStateModalHtmlFragment()`
- **Location**: `src/view/debug/state-copy.ts`
- **Reason**: Debug functionality not covered

### POST Endpoints

#### POST /draw/:gameId (Edge case: empty library)
- **View Function**: `formatLossModalHtmlFragment()`
- **Location**: `src/view/play-game/game-modals.ts`
- **Reason**: Edge case - loss modal shown when library is empty

#### POST /flip-card/:gameId/:gameCardIndex
- **View Function**: `formatFlippingContainer()`
- **Location**: `src/view/common/shared-components.ts`
- **Reason**: Standalone fragment (though this component appears in tested pages)

#### POST /create-game-from-state (Debug feature)
- **View Function**: Inline HTML with JavaScript redirect
- **Location**: Inline in `src/app.ts`
- **Reason**: Debug functionality, returns simple redirect HTML

---

## Not Applicable (No HTML Output)

These endpoints don't need snapshot tests:

- **GET /close-modal** - Returns empty string
- **GET /close-card-modal** - Returns empty string
- **GET /proxy-image** - Returns binary image data
- **GET *** (404)** - Serves static file `/public/404.html`
- **POST /end-game** - Redirects to `/`
- **POST /deck, /start-game, /restart-game** (Success cases) - Redirect only

---

## Summary

- **Total endpoints**: 32
- **Endpoints with testable HTML output**: ~20
- **View functions tested by snapshots**: ~10 (covering main user flows)
- **View functions NOT tested**: 4-5 (debug features + edge cases)

### Coverage Assessment

**Good coverage for:**
- Main page renders (homepage, game page, deck review)
- All major modals (library, table, card, history)
- Game state fragments used by HTMX
- Error pages

**Missing coverage for:**
- Debug functionality (load state, debug state modals)
- Edge case: loss modal when drawing from empty library
- Small utility fragments
