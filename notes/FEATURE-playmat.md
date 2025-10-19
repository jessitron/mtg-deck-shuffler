# Feature: Dynamic Playmat Background

## Goal
Simulate the physical MTG playmat experience by allowing players to select and display different background images during gameplay.

## Implementation Tasks

### 1. Playmat Selection UI (Deck Review Screen)
- Add playmat selector to deck review screen
- Display available playmat options (thumbnails or names)
- Store selection in GameState
- Persist playmat choice with game state

### 2. Background Application (Play Game Screen)
- Load selected playmat from GameState
- Apply as CSS background to game container
- Ensure cards remain readable against background
- Handle default (no playmat selected) state

### 3. Visual Design Considerations
- Card contrast: ensure text/images remain legible on various backgrounds
- Consider semi-transparent overlay on playmat for better card visibility
- Zone definitions: play area boundaries should be clear
- Responsive behavior: background should scale/position appropriately

## Recommendations

### Playmat Storage
- Store playmat images in `public/images/playmats/`
- Use descriptive filenames (e.g., `forest-landscape.jpg`, `starfield.jpg`)
- Consider multiple resolutions or SVG for scalability

### State Management
- Add `playmathId?: string` to GameState
- Default to null/undefined (no custom background)
- Include in PersistedGameState schema

### CSS Approach
- Apply background to `.game-container` or main play area
- Use `background-size: cover` for full coverage
- Consider `background-attachment: fixed` for stability during scrolling
- Add semi-transparent overlay div for contrast: `background: rgba(255,255,255,0.1)`

### Initial Playmat Set
Start with 3-5 curated options:
- Plain felt/cloth textures (classic playmat feel)
- MTG-themed landscapes (forest, island, mountain, etc.)
- Neutral patterns (geometric, subtle textures)
- "None" option for default white/clean background

### Future Enhancements
- Custom image upload
- Preview before selection
- Per-zone backgrounds (battlefield, graveyard, exile)
- Community playmat sharing
