## Query Parameter Support - Target States

For testing purposes, we want to support direct URLs to specific modal states. Here are the distinct states that need query parameter support:

### Game Page States (`/game/:gameId`)

| State          | Query Parameters               | Description                        |
| -------------- | ------------------------------ | ---------------------------------- |
| No modals      | (none)                         | Just the game board                |
| Card only      | `?openCard=N`                  | Card modal for card index N        |
| Library only   | `?openLibrary=true`            | Library search modal               |
| Library + Card | `?openLibrary=true&openCard=N` | Library modal with card N overlaid |
| Table only     | `?openTable=true`              | Table contents modal               |
| Table + Card   | `?openTable=true&openCard=N`   | Table modal with card N overlaid   |
| History only   | `?openHistory=true`            | Action history modal               |
| Debug only     | `?openDebug=true`              | Debug state JSON modal             |

### Prep Page States (`/prepare/:prepId`)

| State          | Query Parameters               | Description                        |
| -------------- | ------------------------------ | ---------------------------------- |
| No modals      | (none)                         | Just the deck review page          |
| Card only      | `?openCard=N`                  | Card modal for card index N        |
| Library only   | `?openLibrary=true`            | Library contents modal             |
| Library + Card | `?openLibrary=true&openCard=N` | Library modal with card N overlaid |

**Note**: Card-to-card navigation (◀/▶ buttons within card modal) doesn't create new states - it's still "card modal is open". The query parameters establish the initial state on page load.
