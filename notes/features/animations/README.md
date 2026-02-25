# Animations Feature

**Owner**: Animations Agent

Animations provide visual feedback for card actions during gameplay and page transitions. They help players understand what just happened — a card was drawn, played, shuffled, or rearranged.

## Why It Exists

In physical Magic, card actions are inherently visible — you see the card move from your hand to the table. In this digital app, HTMX swaps replace DOM content instantly, so without animations the player has to mentally reconstruct what changed. Animations bridge that gap.

## Quick Links

- [Architecture](./architecture.md) - How animations work with HTMX, CSS, and JS
- [History](./history.md) - How animations evolved, what was tried and abandoned
- [Interactions](./interactions.md) - Connections to other features
- [Files](./files.md) - All files involved, grouped by role

## Users

Same as the app: people Jessitron invites for remote MTG games. Animations serve new players especially — experienced users already know the layout, but newcomers need visual cues to understand card movement.

## Design Philosophy

- **CSS-driven**: Animations use CSS `@keyframes` and `transition`, not JS animation libraries. This keeps them performant and declarative.
- **Class-based triggers**: Server-side TypeScript adds CSS classes based on `WhatHappened` (what changed in game state). The browser animates on render.
- **HTMX swap timing**: For exit animations (card leaving), `hx-swap="outerHTML swap:Xs"` delays the DOM swap so the CSS animation has time to play.
- **No animation library**: No FLIP, no View Transitions API, no GreenSock. Pure CSS + minimal JS class application.

## Animation Inventory

| Animation | CSS Class | Status | Duration | Trigger |
|-----------|-----------|--------|----------|---------|
| Card slide left/right | `.card-moved-left`, `.card-moved-right` | Working | 0.5s | `WhatHappened.movedLeft/Right` |
| Card drop from side | `.dropped-from-left`, `.dropped-from-right` | Working (a bit weird) | 0.5s | `WhatHappened.dropppedFromLeft/Right` |
| Library shuffle | `.shuffling` on `.library-stack` | Working | 1.5s | `WhatHappened.shuffling` |
| Card play exit | `.being-played` on card container | **Broken** | 1.5s | JS adds class in `htmx:beforeRequest` |
| Deck tile fade-in | `.precon-tile` with `fadeInTile` | Working | 0.4s + stagger | CSS animation-delay on load |
| Card flip | `.card-flipped` on `.flip-container-outer` | Working | 0.8s | CSS transition on class toggle |
| Button shimmer | `.start-game-button:hover::before` | Working | 0.8s | CSS hover pseudo-element |
