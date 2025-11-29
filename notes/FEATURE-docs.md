# Feature: Documentation Page

## Overview

Create a comprehensive documentation page accessible at `/docs` that helps users understand both how to play MTG remotely using this tool and how to use the app itself.

## Goals

1. Provide some instructions for remote MTG play setup
2. Document the app's three-screen workflow (deck selection → deck review → play)
3. Create a professional docs-style page with sidebar navigation
4. Maintain visual consistency with the home page (index.html)

## Page Structure

### URL
- `/docs` - main documentation page

### Layout Components

#### Header
- Consistent with `index.html` header:
  - Left: "MTG Deck Shuffler" title (links to `/`)
  - Right: "docs" (active/current), "about", GitHub logo
- Uses same header styling from `home-v3.css` (`.main-header`, `.header-content`, etc.)

#### Body Layout
- Two-column layout:
  - **Left sidebar (20-25% width)**: Navigation menu with internal anchor links
  - **Right content area (75-80% width)**: Documentation content with anchor targets

#### Footer
- Consistent with `index.html` footer:
  - Disclaimer: "MTG Deck Shuffler is a toy. This site is not affiliated with Wizards of the Coast. For entertainment only."

### Styling
- Create new `docs.css` for docs-specific styles
- Typography:
  - **Orbitron** - for headings (h1, h2, h3, etc.)
  - **Ovo** - for body text (paragraphs, lists, etc.)
- Reuse color palette from home page:
  - `--deep-space`: #221534 (background)
  - `--dark-pink`: #bb5277 (accents)
  - `--light-pink`: #ddc7dd (borders)

## Content Outline

### Section 1: Playing MTG Remotely
**Sidebar link**: "Playing Remotely"

This section explains the complete setup for remote MTG play using this tool.

#### 1.1 What You Need
- This deck shuffler (MTG Deck Shuffler)
- A shared visual board (Mural or Miro)
- Voice/video chat (Discord recommended)
- Your friends!

#### 1.2 Setting Up the Table
- **Visual Board**: Create a board in Mural or Miro
  - Each player gets their own area
  - Shared space for the battlefield/table
  - How to use: drag card images from MTG Deck Shuffler to Mural/Miro
- **Discord**: Voice channel for gameplay
  - Announcing plays
  - Discussing strategy
  - Social interaction that makes MTG fun

#### 1.3 During Gameplay
- Use MTG Deck Shuffler to:
  - Shuffle and draw cards
  - Look at top cards of library
  - Manage your hand
  - Track which cards you've played
- Use Mural/Miro to:
  - Show the battlefield state
  - Display permanents in play
  - Track life totals (with sticky notes/shapes)
- Use Discord to:
  - Announce your plays
  - Respond to opponent actions
  - Use the stack correctly
  - Have fun!

#### 1.4 What This Tool Does NOT Do
- Does not enforce game rules
- Does not track opponent information
- Does not manage the battlefield/table state
- Does not calculate combat or track life totals
- Does not shuffle opponents' decks

### Section 2: Using the App
**Sidebar link**: "Using the App"

This section documents the three-screen workflow of the application.

#### 2.1 Overview: Three Screens
Brief description of the linear progression:
- Deck Selection (entry point)
- Deck Review (prepare before playing)
- Play Game (active gameplay)

#### 2.2 Deck Selection
**What it does**: Choose which deck to play

**Options**:
- Enter an Archidekt deck ID/URL
- Choose a preconstructed Commander deck
- (Future: Moxfield support)

**Actions**:
- "Let's Play" button loads the deck and proceeds to Deck Review

**Notes**:
- Decks are fetched from Archidekt API
- Card images come from Scryfall
- Deck is immutable once loaded (snapshot from source)

#### 2.3 Deck Review
**What it does**: Review your deck before starting the game

**What you see**:
- Commander card(s) in the command zone
- Library (unshuffled, face-down)
- Deck provenance information (source, URL, date)

**Actions**:
- "Shuffle Up" - shuffles library and starts the game
- "Choose Another Deck" - returns to Deck Selection
- "Search" - reveals the full card list in the library

**Game State**:
- Game exists but is "Not Started"
- Library is not shuffled
- Game ID is in the URL

#### 2.4 Play Game
**What it does**: Active game screen for playing

**What you see**:
- **Command Zone**: Commander card(s) (always visible)
- **Library**: Your shuffled deck (face-down)
- **Hand**: Cards you've drawn (ordered, draggable)
- **Revealed Cards**: Cards you're looking at from library actions

**Actions on Library**:
- "Draw" - move top card to hand
- "Reveal" - look at top N cards
- "Search" - look at entire library
- "Shuffle" - randomize library order

**Actions on Hand**:
- Drag to reorder cards
- "Play" button - move card to table (removes from tracking)

**Actions on Revealed Cards**:
- "To Hand" - move to hand
- "To Top" - return to top of library
- "To Bottom" - move to bottom of library
- "Play" - move to table

**Actions on Table Cards**:
- "Return to Hand" - retrieve a played card
- "Return to Library" - put a played card back in library

**Game Management**:
- "Restart Game" - reset game state, reshuffle
- "Quit" - return to Deck Selection

**Game State**:
- Game is active
- Library is shuffled
- Game ID persists in URL (bookmark to resume)

**Persistence**:
- Game state is automatically saved
- Can return to game via URL
- Survives server restarts (SQLite storage)

### Section 3: Keyboard Shortcuts
**Sidebar link**: "Keyboard Shortcuts"

(To be documented based on existing functionality)

### Section 4: Tips & Tricks
**Sidebar link**: "Tips & Tricks"

- Copy card image URLs (right-click) for pasting into Mural/Miro
- Bookmark game URL to return later
- Use "Search Library" to find specific cards
- Reorder hand before playing to group lands/spells
- Use revealed cards area for tutoring/scry-like effects

### Section 5: Troubleshooting
**Sidebar link**: "Troubleshooting"

Common issues and solutions:
- Deck won't load from Archidekt
- Card images not showing
- Game state lost
- Browser compatibility

## Implementation Plan

### Phase 1: Create Static HTML Structure
1. Create `public/docs.html` with header, sidebar, content area, footer
2. Create placeholder content sections with anchor IDs
3. Implement sidebar navigation with internal links

### Phase 2: Create Styles
1. Create `public/docs.css`
2. Two-column layout (sidebar + content)
3. Sidebar navigation styling (active states, hover effects)
4. Content typography and spacing
5. Responsive design for mobile (sidebar collapses/overlays)

### Phase 3: Write Content
1. Research existing app functionality by reading code and testing
2. Write Section 1 (Playing Remotely) - user-facing, conceptual
3. Write Section 2 (Using the App) - step-by-step, practical
4. Write remaining sections (shortcuts, tips, troubleshooting)
5. Add screenshots/examples where helpful

### Phase 4: Connect to App
1. Update `src/app.ts` to serve docs page at `/docs` route
2. Make "docs" link in header functional (update `index.html`)
3. Test navigation between home and docs pages

### Phase 5: Polish
1. Smooth scroll to anchors
2. Highlight current section in sidebar (scroll spy)
3. Test all links and navigation
4. Proofread all content
5. Mobile responsive testing

## Technical Details

### File Structure
```
public/
  docs.html          # Main documentation page
  docs.css           # Docs-specific styles

src/view/docs/
  (if we decide to generate the page in TypeScript instead)
```

### Sidebar Navigation Structure
```html
<nav class="docs-sidebar">
  <ul>
    <li><a href="#playing-remotely">Playing Remotely</a>
      <ul>
        <li><a href="#what-you-need">What You Need</a></li>
        <li><a href="#setting-up">Setting Up the Table</a></li>
        <li><a href="#during-gameplay">During Gameplay</a></li>
        <li><a href="#what-tool-does-not-do">What This Tool Does NOT Do</a></li>
      </ul>
    </li>
    <li><a href="#using-the-app">Using the App</a>
      <ul>
        <li><a href="#overview">Overview</a></li>
        <li><a href="#deck-selection">Deck Selection</a></li>
        <li><a href="#deck-review">Deck Review</a></li>
        <li><a href="#play-game">Play Game</a></li>
      </ul>
    </li>
    <li><a href="#keyboard-shortcuts">Keyboard Shortcuts</a></li>
    <li><a href="#tips-tricks">Tips & Tricks</a></li>
    <li><a href="#troubleshooting">Troubleshooting</a></li>
  </ul>
</nav>
```

### Key CSS Classes (to be created)
- `.docs-container` - main flex container
- `.docs-sidebar` - left navigation
- `.docs-content` - right content area
- `.docs-section` - each major section with anchor
- `.docs-subsection` - subsections within major sections

## Design Considerations

### Typography Hierarchy
- H1: Page title "Documentation" (Orbitron)
- H2: Major sections (Playing Remotely, Using the App, etc.) (Orbitron)
- H3: Subsections within major sections (Orbitron)
- Body: 16-18px for readability (Ovo)

### Sidebar Behavior
- Fixed position (scrolls independently of content)
- Highlight active section based on scroll position
- Collapsible on mobile (hamburger menu)
- Smooth scroll to anchors on click

### Content Width
- Max width for content area: ~800px for readability
- Sidebar: ~250px fixed width
- Responsive breakpoint: ~900px (collapse sidebar)

## Open Questions

1. Should we generate the docs page in TypeScript (like other pages) or keep it as static HTML?
   - **Recommendation**: Start with static HTML for easy editing, migrate to TypeScript if dynamic content is needed

2. Should we include screenshots of each screen?
   - **Recommendation**: Yes, at least one per major screen (deck selection, deck review, play game)

3. Do we need a search function for docs?
   - **Recommendation**: Not for v1, add later if docs grow large

4. Should keyboard shortcuts be documented?
   - **Recommendation**: Yes, if they exist; research what's currently implemented

## Success Criteria

- [ ] Docs page is accessible at `/docs`
- [ ] Header "docs" link navigates to docs page
- [ ] Sidebar navigation works (all links jump to correct sections)
- [ ] Content comprehensively covers remote play setup
- [ ] Content comprehensively covers app usage (all three screens)
- [ ] Page is responsive on mobile
- [ ] Visual consistency with home page maintained
- [ ] Footer disclaimer present
- [ ] All sections have clear, helpful content
- [ ] No spelling/grammar errors

## Future Enhancements

- Search functionality
- Video tutorials embedded
- Interactive demos/examples
- FAQ section
- Changelog/version history
- API documentation (if we expose one)
- Keyboard shortcuts reference card (printable)
