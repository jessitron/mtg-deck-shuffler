# Feature: Homepage Redesign

## Problem Statement

The homepage and deck review page currently share the same CSS class (`.page-with-title-container`), which means they have identical styling. When we added a background image to make the deck review page more visually interesting, it also applied to the homepage, making the text hard to read.

The homepage now has a complicated background image that makes the deck selection forms and expository text difficult to read. While frosted glass overlays work for some sections, the overall design doesn't communicate the feeling of what it's like to play MTG remotely.

## Design Goal

Redesign the homepage to capture the feeling of a playmat laid out with a deck, a commander, and an unrevealed hand. The homepage should:
- Feel more like a playmat/game setup
- Be visually distinct from the deck review page
- Incorporate MTG card art in a way that enhances rather than obscures content
- Communicate the excitement and tactile nature of playing Magic remotely

## Current Page Structure

### Homepage (`src/view/deck-selection/deck-selection-page.ts`)

```
formatHomepageHtmlPage()
  └─ formatPageWrapper() [from html-layout.ts]
      └─ <div class="page-with-title-container">
          ├─ formatTitleHtmlFragment() [from shared-components.ts]
          │   └─ <div class="title-container">
          │       └─ <h1 class="homepage-title">MTG Deck Shuffler</h1>
          ├─ <div id="deck-inputs">
          │   ├─ formatLocalDeckInputHtmlFragment() - dropdown + Play button
          │   └─ formatArchidektInputHtmlFragment() - text input + Load Deck button
          ├─ <div id="modal-container">
          └─ <div class="expository-text-container">
              ├─ <div class="expository-text"> - How-to content
              └─ <div class="slogan"> - Bottom tagline
```

### Deck Review Page (`src/view/deck-review/deck-review-page.ts`)

```
formatDeckReviewHtmlPage()
  └─ formatPageWrapper() [from html-layout.ts]
      └─ <div class="page-with-title-container">
          ├─ formatTitleHtmlFragment() - Same title component
          ├─ <div class="deck-review-container">
          │   ├─ formatCommandZoneHtmlFragment() - Commander card image
          │   ├─ <div class="deck-actions"> - Shuffle Up + Choose Another Deck buttons
          │   └─ <div id="library-list"> - List of all cards (with frosted glass)
          └─ <div id="card-modal-container">
```

### Active Game Page (`src/view/play-game/active-game-page.ts`)

```
formatGamePageHtmlPage()
  └─ formatPageWrapper() [from html-layout.ts]
      └─ <div class="page-container"> ← Different container class!
          └─ formatActiveGameHtmlSection()
```

## Key Observations

1. **Shared Styling Problem**: Homepage and deck-review both use `.page-with-title-container`, so they inherit the same styles including:
   - Background image
   - Border and shadow
   - Border radius
   - Max width

2. **Active Game is Different**: The active game page uses `.page-container` instead, which has its own distinct styling.

3. **Title Component is Shared**: All three pages use `formatTitleHtmlFragment()` which creates a `.title-container` with the h1.

## Redesign Approach

### Phase 1: Separate Styling
- Give homepage its own container class (e.g., `.homepage-container`)
- Keep `.page-with-title-container` for deck-review page only
- This allows independent styling without affecting each other

### Phase 2: Visual Redesign (To Be Determined)
Create a playmat-inspired layout that might include:
- Background texture resembling a playmat
- Visual representation of a deck
- Commander zone positioning
- Card back images for "unrevealed hand" feeling
- Strategic placement of card art that doesn't interfere with content
- Form elements styled to fit the playmat aesthetic

### Phase 3: Content Organization
Reorganize homepage content to support the new visual design:
- Deck selection forms positioned like "choosing a deck to play"
- How-to content styled as "setup instructions"
- Visual hierarchy that guides users through the play experience

## Technical Changes Required

1. **HTML Structure**: Change homepage container class
2. **CSS**:
   - Create new `.homepage-container` styles
   - Adjust existing `.page-with-title-container` to only affect deck-review
   - Consider whether title-container needs page-specific variants
3. **View Functions**: Update `formatHomepageHtmlPage()` to use new container class

## Success Criteria

- Homepage and deck-review page have visually distinct styles
- Homepage text is fully readable
- Homepage conveys the feeling of setting up a Magic game
- All existing functionality remains intact
- Responsive design works across screen sizes
