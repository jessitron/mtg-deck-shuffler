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
- **Images**: `public/images/` - Local    copies of MTG card art

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
