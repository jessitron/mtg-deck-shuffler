---
name: library-search
kind: feature
---

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

## Users

The app is public but currently used by people Jessitron invites for remote MTG games. Library search is used during gameplay when a card effect says "search your library for [card type]" - the player opens the modal, browses/filters by type, clicks a card, and uses card modal actions to move it.

## Design Philosophy

The app assists gameplay without enforcing MTG rules. Library search defaults to alphabetical order by canonical card name on both the game and prep pages — a card effect says "search your library for a Forest," and you're finding, not reading positions, and you shuffle afterward anyway. Alphabetical is the default, but as of 2026-08-21 there's a UI toggle back to position order (`?order=position`), reversing an earlier deliberate "no toggle wanted or built" decision — Jess asked for it directly; see history.md. Position order is still the one true order internally (`GameState.listLibrary()` sorts by `location.position` — draw/Put on Top/Put on Bottom depend on it); the routes only stop re-sorting their display copy when `order=position` is requested. No auto-shuffle, no restrictions on what you can pick.

## Feature Summary

| Aspect | Detail |
|--------|--------|
| Entry points | "Search" button on game page and prep page; on the prep page the library stack itself is also clickable |
| Modal type | HTMX-loaded EJS partial into `#modal-container` |
| URL params | `?openLibrary=true`, `?groupBy=type`, `?order=alphabetical\|position` (default alphabetical) |
| Two routes | `/library-modal/:gameId` (game), `/prep-library-modal/:prepId` (prep) |
| Template | Single shared EJS template: `views/partials/library-modal.ejs` |
| Cards shown | All cards with `location.type === "Library"`; sorted alphabetically by canonical card name for display unless `?order=position` is requested; `GameState.listLibrary()` itself stays position-ordered |
| Auto-shuffle | No. The app doesn't enforce MTG rules; player shuffles manually if needed |
| Grouping | Toggle to group cards by MTG card type (Creature, Instant, etc.) |
| Order toggle | "A-Z" / "Position" buttons in the modal subtitle; defaults to A-Z; survives the Group by Type toggle |
| Type icons | SVG icons for each card type, colored for lands |
| Card types source | `CardDefinition.cardTypes` — pre-unioned across all faces/parts at ingestion |
| Multi-face cards | Appear in every group their faces/parts belong to (transform, MDFC, split, adventure, prepare) |
| Card click | Opens card detail modal overlaid on library modal |
