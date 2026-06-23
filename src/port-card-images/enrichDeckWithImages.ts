import { Deck, CardDefinition } from "../types.js";
import { CardImagesPort } from "./types.js";

/** Fetch Scryfall image URLs for every card in the deck and attach them to the
 * CardDefinitions in place. Best-effort: cards Scryfall doesn't recognize are
 * left without stored URLs (callers fall back to constructing the URL).
 *
 * Cards are shared object references (the same CardDefinition is pushed once per
 * copy), so mutating each unique card once updates all its copies. */
export async function enrichDeckWithImages(deck: Deck, imagesPort: CardImagesPort): Promise<void> {
  const allCards: CardDefinition[] = [...deck.commanders, ...deck.cards];
  const uniqueByScryfallId = new Map<string, CardDefinition>();
  for (const card of allCards) {
    if (card.scryfallId && !uniqueByScryfallId.has(card.scryfallId)) {
      uniqueByScryfallId.set(card.scryfallId, card);
    }
  }

  const images = await imagesPort.fetchImages([...uniqueByScryfallId.keys()]);

  for (const [scryfallId, card] of uniqueByScryfallId) {
    const fetched = images.get(scryfallId);
    if (!fetched) continue;
    card.imageUris = fetched.front;
    if (card.twoFaced && fetched.back) {
      card.backImageUris = fetched.back;
    }
  }
}
