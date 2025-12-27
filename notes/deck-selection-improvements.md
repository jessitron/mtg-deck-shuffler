# Deck Selection Page Improvements

## Current Implementation

The Deck Selection page (`/choose-any-deck`) is rendered via an EJS template at `views/choose-any-deck.ejs`.

**Current Layout:**
1. Header: "Choose a preconstructed deck to play"
   - Dropdown select showing deck descriptions (168 precons)
   - Submit button
2. Header: "Or play any deck on Archidekt"
   - Text input for deck number
   - Submit button
3. Slogan: "Play any deck, anywhere, with your favorite people!"

**Technical Details:**
- Route handler: `src/app.ts` lines 171-182
- Styling: `public/styles.css` lines 102-166
- Precon decks: `decks/precon-*.json` (168 files)
- Each precon includes commander data with `scryfallId` for artwork
- Uses EJS templating (not TypeScript view functions like gameplay pages)

## Planned Improvements

### 1. Add Hero Image
**Goal:** Start the page with the same cascading cataracts image that appears behind "Choose any deck" on the home page.

**Implementation:**
- Use `public/images/aeoe-43-cascading-cataracts.png` as a hero/banner at the top
- This provides visual continuity from the home page

### 2. Reorder: Archidekt Input First
**Goal:** Move the Archidekt deck input upward since it's compact.

**Changes:**
- Swap section order: Archidekt first, precons second
- Change label from "Or play any deck on Archidekt" to remove "Or" since it's now primary
- Update to "Enter link to deck on Archidekt" instead of "Enter deck number"

**Link Parsing:**
- Accept full Archidekt URLs: `https://archidekt.com/decks/{deckId}/`
- Parse the deck ID number from the URL
- Still accept plain numbers for backward compatibility

### 3. Enhance Precon Display with Commander Art
**Goal:** Transform the precon section from a simple dropdown to a rich visual gallery.

**Visual Design:**
- Display each precon with commander artwork from Scryfall
- Use art crop format: `https://cards.scryfall.io/art_crop/front/{id1}/{id2}/{scryfallId}.jpg`
  - Example: `https://cards.scryfall.io/art_crop/front/2/c/2cfd4494-346c-4cbc-8072-e267254cefcc.jpg`
- Grid or card layout instead of dropdown
- Show deck name and commander name with the art

**Data Available:**
- Each precon JSON includes `commanders` array with `scryfallId`
- Format scryfallId into Scryfall art crop URL
- Example from Spirit Squadron: `scryfallId` → art crop URL path

**Benefits:**
- Much more visually appealing
- Easier to browse and recognize decks by commander
- Better matches MTG's visual nature

## New Layout Flow

1. **Hero Image:** Cascading Cataracts banner
2. **Archidekt Input Section (compact):**
   - "Enter link to deck on Archidekt"
   - Text input accepting URLs or deck IDs
   - Submit button
3. **Precon Gallery Section (expanded):**
   - "Choose a preconstructed deck to play"
   - Visual grid of commander art cards
   - Each card clickable/selectable with deck name
   - Submit button to start game with selected precon

## Implementation Notes

### URL Parsing Logic
Need to handle:
- Full URL: `https://archidekt.com/decks/2209039/spirit-squadron`
- Partial URL: `archidekt.com/decks/2209039`
- Plain number: `2209039`
- Extract numeric deck ID using regex: `/decks\/(\d+)/` or fallback to parsing as integer

### Scryfall Art URL Construction
```javascript
function getCommanderArtUrl(scryfallId) {
  const id1 = scryfallId[0];
  const id2 = scryfallId[1];
  return `https://cards.scryfall.io/art_crop/front/${id1}/${id2}/${scryfallId}.jpg`;
}
```

### Responsive Design Considerations
- Grid should adapt to viewport size
- Cards should be appropriately sized for browsing
- Maintain readability of deck names

## Files to Modify

1. `views/choose-any-deck.ejs` - Update template structure and layout
2. `public/styles.css` - Add styles for hero image and card grid
3. `src/app.ts` - Update POST `/deck` handler to parse Archidekt URLs
4. Consider adding JavaScript for interactive card selection (if needed beyond HTMX)

## Testing Checklist

- [ ] Hero image displays correctly at top of page
- [ ] Archidekt URL parsing works for all formats (URL/number)
- [ ] Archidekt input appears first (above precons)
- [ ] Commander art images load correctly for all 168 precons
- [ ] Precon gallery displays in responsive grid
- [ ] Precon selection and submission works correctly
- [ ] Visual styling matches home-v3.css design language (square corners, etc.)
- [ ] Page works on mobile and desktop viewports
