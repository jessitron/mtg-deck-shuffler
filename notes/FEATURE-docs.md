# Feature: Documentation Page

## Overview

Make a docs page that's easy for me to maintain.

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

## Content

Content is maintained in **`src/view/docs/content.md`** in markdown format.

The content includes:
- **Playing MTG Remotely**: Complete setup guide for remote play with Mural/Miro and Discord
- **Using the App**: Documentation of the three-screen workflow (Deck Selection → Deck Review → Play Game)
- **Keyboard Shortcuts**: (To be documented)
- **Tips & Tricks**: Helpful usage tips
- **Troubleshooting**: Common issues and solutions
- **Support**: How to get help and contribute

## Implementation Plan

### Phase 1: Set Up Infrastructure
1. ✅ Extract content to `src/view/docs/content.md` markdown file
2. Install `marked` library for markdown rendering
3. Create shared header/footer functions in `src/view/common/html-layout.ts`:
   - `formatHomeStyleHeader(currentPage)` - matches index.html header style
   - `formatHomeStyleFooter()` - matches index.html footer style

### Phase 2: Create TypeScript View
1. Create `src/view/docs/docs-view.ts`:
   - Read and parse `src/view/docs/content.md`
   - Render markdown to HTML using `marked`
   - Generate full page with shared header/footer
   - Include sidebar navigation with section anchors
2. Create `public/docs.css` for docs-specific styles:
   - Two-column layout (sidebar + content)
   - Sidebar navigation styling
   - Content typography and spacing
   - Responsive design for mobile

### Phase 3: Connect to App
1. Add route in `src/app.ts` to serve generated docs page at `/docs`
2. Test navigation between home and docs pages
3. Verify all anchor links work

### Phase 4: Content Development
1. Expand content in `src/view/docs/content.md` as needed
2. Add any missing sections
3. Proofread all content

### Phase 5: Polish
1. Smooth scroll to anchors (CSS)
2. Test all links and navigation
3. Mobile responsive testing
4. Consider: Highlight current section in sidebar (scroll spy - optional)

## Technical Details

### File Structure
```
src/view/docs/
  content.md              # Documentation content in markdown
  docs-view.ts            # TypeScript view function that renders docs page

src/view/common/
  html-layout.ts          # Shared header/footer functions (including home style)

public/
  docs.css                # Docs-specific styles
  docs.html               # (deprecated - will be replaced by generated page)
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
    <li><a href="#support">Support</a></li>
  </ul>
</nav>
```

### Key CSS Classes
- `.docs-container` - main flex container
- `.docs-sidebar` - left navigation
- `.docs-content` - right content area
- `.docs-section` - each major section with anchor
- `.docs-subsection` - subsections within major sections

## Design Considerations

### Typography Hierarchy
- Page title "Docs - MTG Deck Shuffler"
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

## Design Decisions

1. **Generate docs page in TypeScript**: ✅ Using TypeScript view functions with `marked` for markdown rendering
   - Consistent with existing architecture
   - Easy to maintain content in markdown
   - Can reuse header/footer components

2. **Screenshots**: Not yet, because the screens aren't stable. We can, however, include images of the same art cards that are used on the home page.

3. **Search function**: No, Ctrl-F is fine.

4. **Keyboard shortcuts**: Not until they exist (they don't currently)

## Success Criteria

- [ ] Docs page is accessible at `/docs`
- [ ] Content comprehensively covers remote play setup
- [ ] Content comprehensively covers app usage (all three screens)
- [ ] Page is responsive on mobile
- [ ] Visual consistency with home page maintained
- [ ] Footer disclaimer present
- [ ] Tone of content expresses the playful purpose of this tool

## Future Enhancements

- Video tutorials embedded
