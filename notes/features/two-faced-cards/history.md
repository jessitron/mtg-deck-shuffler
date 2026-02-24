# Two-Faced Cards History

## Initial Implementation

- **`f42fb5d`** - Implement flip functionality for two-faced cards (first implementation)
- **`546b20f`** - Implement animation for flip card feature (CSS 3D transforms)
- **`9e03881`** - Fix flip animation to properly show both faces during flip
- **`9ae10ef`** - Carefully get the flip to work (iteration on the animation)
- **`453d7b5`** - Remove 'flipped' from wrapper (cleanup)
- **`3fe7618`** - Approve flip-card changes

## Commander Display

- **`0ea1616`** - Update commander display to show both faces for two-faced commanders
  - Commanders in the command zone now use the flip container

## Event Recording (Added then Removed)

- **`10c1ba9`** - Add FlipCardEvent type and recording for card flips
- **`dbd9929`** - Remove FlipCardEvent recording — card flips no longer generate events
  - **Decision**: Flipping is a UI concern, not a game action. The app tracks card locations, not battlefield state. Recording flip events cluttered the history without adding value.

## Modal Flip Challenges

This was one of the hardest parts. Multiple attempts to make flip work inside the card modal without closing it:

- **`a857fde`** - Fix flip button in modal to not close modal (first attempt)
- **`359a645`** - Revert: Add HTMX event-driven refresh after modal flip
- **`57c0ad8`** - Add HTMX event-driven refresh after modal flip
- **`27b8808`** - Fix flip button in modal closing modal
- **`ffd15a9`** - Revert fix flip button in modal
- **`d87236e`** - Add flip-card-modal endpoint to prevent modal closing on flip
  - **Solution**: A dedicated `/flip-card-modal/` route that re-renders the entire modal HTML. This avoids the HTMX swap target issues that caused the modal to close. The inline `/flip-card/` route swaps just the flip container; the modal route replaces the whole modal.

## Card Data Enrichment

- **`8effcf5`** - Add CardFace type and backFace field to CardDefinition
- **`9d157f1`** - Update SQLite CardRepository to persist/retrieve backFace (JSON column)
- **`26a0ae6`** - Update test generators with CardFace and two-faced card support
- **`20b9149`** - Add two-faced card tests for CardRepository adapters

## Adapter Back-Face Extraction

- **`faa16ee`** - Extract back-face data in Archidekt adapter (uses `faces[1]`)
- **`d87f17e`** - Extract back-face data in MTGJSON adapter (uses `otherFaceIds` + side "b")
- **`3af3b01`** - Error on missing back face, download AllIdentifiers for lookups
  - MTGJSON precon files don't include back-face cards inline. The adapter needs AllIdentifiers.json to look up back faces by UUID.
- **`329baf5`** - Regenerate precon decks with back-face data from AllIdentifiers

## Type Merging for Library Search

- **`037dd01`** - Merge back-face types into Library Search type grouping
- **`7c51713`** - Deduplicate merged back-face types in library search grouping

## Bug Fixes

- **`e904a8c`** - Fix being-played animation for two-faced cards by targeting nested flip container images
  - The "being played" animation wasn't reaching the actual `<img>` elements inside the flip container's nested divs.
- **`bea77cf`** - Fix two-faced card copying by adding face support to Play button
- **`7800fb3`** - Fix play button for single-faced cards (regression fix after two-faced changes)
- **`ab05cfb`** - Fix TypeScript errors in flip-card-modal route

## Navigation Integration

- **`9338358`** - Fix prep flip button losing navList, add prep flip E2E test
  - Bug: prep card modal flip button wasn't passing `navList` through in `hx-get` URL
- **`66644e2`** - E2E test: flip two-faced card preserves group-scoped navigation
- **`1ff418a`** - Update library search feature owner docs with navList and flip fixes

## Test Infrastructure

- **`b937ea2`** - Add two-faced card game to seed test data
  - Seed script creates a game with "From Cute to Brute" precon (many two-faced cards) for testing

## What Was Tried and Abandoned

- **FlipCardEvent**: Recording flip as a game event was added and removed. It cluttered history without purpose since flipping doesn't change the game's logical state.
- **In-modal flip via HTMX swap**: Multiple attempts to flip a card inside the modal by swapping just the image or flip container. All caused the modal to close due to HTMX's swap mechanism removing the modal overlay. Solution was a dedicated route that re-renders the full modal.
