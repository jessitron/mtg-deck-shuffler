# Display Commander Image

status: implemented

We want to display the commander's card image.
Card images live at Scryfall.

The deck's cards contain a `uid` field that holds the Scryfall card ID.

Scryfall's API is documented at https://scryfall.com/docs/api/cards

## Current Card Structure Analysis

The current card structure in our codebase (src/deck.ts:1) only includes:

```typescript
interface Card {
  name: string;
}
```

However, the Archidekt deck data contains much more information, including the `uid` field we need for images.

## Scryfall Image API Research

### Getting Card Images by ID

Scryfall provides multiple ways to get card images:

1. **Direct Image URLs**: You can construct image URLs directly using the pattern:

   ```
   https://cards.scryfall.io/[format]/front/[first_char]/[next_chars]/[full_card_id].[extension]
   ```

2. **Card API Response**: Making a request to `https://api.scryfall.com/cards/:id` returns a JSON object with an `image_uris` property containing all available image URLs.

### Available Image Formats

From the Scryfall API, cards have these image formats available:

- **small**: 146 × 204 pixels, thumbnail size (`*.jpg`)
- **normal**: 488 × 680 pixels, standard size (`*.jpg`)
- **large**: 672 × 936 pixels, high resolution (`*.jpg`)
- **png**: 745 × 1040 pixels, transparent background (`*.png`)
- **art_crop**: Variable size, artwork only (`*.jpg`)
- **border_crop**: 480 × 680 pixels, card with border removed (`*.jpg`)

### Example URLs (using uid: 94e0ad38-31b3-46ba-9999-9b6ff57906ae)

- Small: https://cards.scryfall.io/small/front/9/4/94e0ad38-31b3-46ba-9999-9b6ff57906ae.jpg
- Normal: https://cards.scryfall.io/normal/front/9/4/94e0ad38-31b3-46ba-9999-9b6ff57906ae.jpg
- Large: https://cards.scryfall.io/large/front/9/4/94e0ad38-31b3-46ba-9999-9b6ff57906ae.jpg

## Implementation Strategy

To implement commander image display:

1. **Update Card interface** to include the `uid` field from Archidekt data
2. **Modify convertArchidektToCard function** to extract and preserve the uid
3. **Create image URL helper function** to construct Scryfall image URLs from uid
4. **Update HTML template** to display commander image when available

### Recommended Approach

For web display, the **normal** format (488 × 680 pixels) would be ideal as it provides good quality without being too large for page loading.
