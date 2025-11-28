# Feature: homepage redesign

## Home-v3: Figma-Based Landing Page

A new landing page design was created from Figma designs and implemented as `public/home-v3.html`.

### Figma Design Source

**Figma File**: "What does this do"
**URL**: https://www.figma.com/design/vtnfISgjxCt1KYjH1bghxU/what-does-this-do-?node-id=0-1
**Main Frame Node**: `1:2` - "home page"

(see Deviations from Figma below)

### File Structure

- **HTML**: `public/home-v3.html` - Standalone HTML file with complete page structure
- **CSS**: `public/home-v3.css` - Dedicated styles for the home-v3 page
- **JavaScript**: `public/home-v3-parallax.js` - Parallax scrolling effect for depth illusion
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

All images are MTG cards from Edge of Eternities set:

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

- Centered sections: 1040px wide (see Deviations from Figma below)

### Deviations from Figma

**Section Width: 1040px instead of 1176px**
- **Figma design**: Hero and step sections are 1176px wide × 484px tall
- **Implementation**: Sections are 1040px wide × 428px tall
- **Reason**: Background images are 1040px wide
- **Aspect ratio preserved**: Both use ~2.43:1 aspect ratio

### Current Status

This is a static prototype/landing page separate from the main application flow. It does not connect to the rest of the app yet. Once it looks good enough, it will become the homepage for the app, and the 'Begin' buttons will navigate to the deck selection page.

### TODO

- [x] NOW: get the linear gradient background overlays that I have in Figma onto the sections
- [x] make the pictures move a little as you scroll, like they're way in the background and your perspective shifts as you scroll.
- [] create the 'docs' page
- [] create the 'about' page

### Gradient Overlays Implementation

Each step section now has a gradient overlay applied via CSS `::before` pseudo-elements:
- **Step 1 (Choose)**: Dark to transparent gradient (left to right) - matches text positioning on the left
- **Step 2 (Prepare)**: Transparent to dark gradient (right to left) - matches text positioning on the right
- **Step 3 (Enter)**: Dark to transparent gradient (left to right) - matches text positioning on the left

The gradients use `rgba(34, 21, 52, 0.75)` (deep-space color with 75% opacity) to improve text readability while maintaining visual interest from the background card art.

### Parallax Scrolling Effect

Background images in the hero and step sections use a parallax scrolling effect that creates a sense of depth:
- Images move at 35% of the scroll speed (PARALLAX_FACTOR = 0.35)
- Creates the illusion that backgrounds are far away behind a "window" of foreground content
- Implemented using `requestAnimationFrame` for smooth, performant animation
- Adjusts `background-position` based on scroll position relative to viewport center
