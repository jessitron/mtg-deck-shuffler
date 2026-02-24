# Library Search Feature

**Owner**: Library Search Agent

The Library Search feature lets players browse all cards remaining in their library during gameplay or deck review. It's a modal dialog showing the full card list with optional type-based grouping and card type icons.

## Why It Exists

In Magic: the Gathering, many cards instruct a player to "search your library" for a specific card type. Since this app replaces physical cards for remote play, players need a way to browse their library contents digitally. The feature mirrors the physical act of fanning through your deck to find a card.

## Quick Links

- [Architecture](./architecture.md) - Routes, templates, data flow
- [History](./history.md) - How the feature evolved
- [Interactions](./interactions.md) - How it connects to other features
- [Files](./files.md) - All files involved, grouped by role

## Feature Summary

| Aspect | Detail |
|--------|--------|
| Entry points | "Search" button on game page and prep page |
| Modal type | HTMX-loaded EJS partial into `#modal-container` |
| URL params | `?openLibrary=true`, `?groupBy=type` |
| Two routes | `/library-modal/:gameId` (game), `/prep-library-modal/:prepId` (prep) |
| Template | Single shared EJS template: `views/partials/library-modal.ejs` |
| Cards shown | All cards with `location.type === "Library"`, sorted by position |
| Grouping | Toggle to group cards by MTG card type (Creature, Instant, etc.) |
| Type icons | SVG icons for each card type, colored for lands |
| Two-faced cards | Both front and back face types merged (deduplicated) |
| Card click | Opens card detail modal overlaid on library modal |
