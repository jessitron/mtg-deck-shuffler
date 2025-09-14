# Golden Master Testing for HTML Formatting

status: implementing

## Overview

Golden master testing (also known as snapshot testing) will capture the current HTML output of our view formatting functions and detect any unintended changes during refactoring. Then we can refactor the view functions.

The snapshot tests will let the user see HTML changes succinctly when we are implementing new features.

Snapshot tests must be separate from unit tests. Unit tests run after each change and their failure is a signal to fix something.

If HTML changes are not intended, then the agent should run snapshot tests too. If HTML changes are intended, then only the user needs to run them, because it's the user's job to approve them.

## Implement

[x] Start by implementing one test, for the view method called by "/", which is formatHomepageHtml. That's the simplest one.
The input to formatHomepageHtml is the list of available decks. That's a simple data structure. Add a few fake decks and call the function.

[x] The view method called by "/deck" is formatDeckHtml. The input is a Deck object. Test with zero, one, and two commanders. Include only a few other cards.

[x] The view method called by "/game/:gameId" is formatGameHtml. The input is a GameState object. Test with a game state that includes cards in hand, cards revealed, and cards on the table.

[x] what other routes are in app.ts, and what format functions do they call? List additional methods to test here:

Missing snapshot tests for these top-level view functions called in app.ts:
- formatErrorPageHtmlPage (src/view/error-view.ts) - Used for 500/404 error pages in multiple routes
- formatLibraryModalHtml (src/view/review-deck-view.ts) - Library search modal at /library-modal/:gameId
- formatTableModalHtmlFragment (src/view/active-game-view.ts) - Table contents modal at /table-modal/:gameId
- formatGamePageHtmlPage (src/html-formatters.ts) - Complete game page wrapper at /game/:gameId

## Document

[x] The snapshot tests need their own script in package.json. They should not be run by the normal "test" script.

[x] Document procedures in the README and CLAUDE.md.
