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

---

## Home-v3: Figma-Based Landing Page

A new landing page design was created from Figma designs and implemented as `public/home-v3.html`.

### Figma Design Source

**Figma File**: "What does this do"
**URL**: https://www.figma.com/design/vtnfISgjxCt1KYjH1bghxU/what-does-this-do-?node-id=0-1
**Main Frame Node**: `1:2` - "home page"

### File Structure

- **HTML**: `public/home-v3.html` - Standalone HTML file with complete page structure
- **CSS**: `public/home-v3.css` - Dedicated styles for the home-v3 page
- **Images**: `public/images/` - Local copies of MTG card art

### Design Elements

The page features:
1. **Header** - Navigation bar with "MTG Deck Shuffler" title, docs/about links, and GitHub logo
2. **Hero Section** - Large "MTG" text with "Deck Shuffler" subtitle over rainbow burst background
3. **Slogan** - "Play any deck, anywhere, with any people!"
4. **Step 1: Choose** - "any deck" with description of Archidekt/precon support
5. **Step 2: Prepare** - "the table" describing Miro/Mural setup
6. **Step 3: Enter** - "the chat" about Discord gameplay
7. **BEGIN buttons** - Call-to-action buttons after Step 1 and Step 3
8. **Footer** - Disclaimer about toy status and WotC affiliation

### Typography

- **Orbitron** - Main UI font (weights: 400, 600, 700)
- **Risque** - Display font for large action words and title

### Background Images

All images are MTG cards from Aether Revolt set:

| Section | Card | File |
|---------|------|------|
| Hero | Cascading Cataracts | `aeoe-43-cascading-cataracts.png` |
| Step 1 (Choose) | Exalted Sunborn | `aeoe-3-exalted-sunborn.png` |
| Step 2 (Prepare) | Terrasymbiosis | `aeoe-41-terrasymbiosis.png` |
| Step 3 (Enter) | Bonder's Enclave | `aeoe-49-bonders-enclave.png` |

### Color Palette

Defined in CSS variables:
- `--deep-space`: #221534 (background)
- `--dark-pink`: #bb5277 (borders)
- `--light-pink`: #ddc7dd (outer border)

### Layout

- Fixed width: 1512px
- Centered sections: 1176px wide
- Large typography with absolute positioning overlays on card art
- Alternating text alignment (right/left/right) for visual interest

### Current Status

This is a static prototype/landing page separate from the main application flow. It does not connect to the deck selection functionality in `src/view/deck-selection/`. It serves as a design exploration for what a redesigned entry point could look like.
