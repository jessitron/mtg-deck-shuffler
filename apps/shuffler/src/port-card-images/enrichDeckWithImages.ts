import { Deck, CardDefinition } from "../types.js";
import { CardImagesPort } from "./types.js";

/** Fetch Scryfall image URLs for every card in the deck and attach them to the
 * CardDefinitions in place. Best-effort: cards Scryfall doesn't recognize are
 * left without stored URLs (callers fall back to constructing the URL).
 *
 * Fetches once per unique scryfallId but applies the result to EVERY card with
 * that id. Fresh adapter output shares object references across copies, but a
 * deck round-tripped through JSON (e.g. the backfill script) has a distinct
 * object per copy — so we must enrich each card, not just one per id. */
export async function enrichDeckWithImages(deck: Deck, imagesPort: CardImagesPort): Promise<void> {
  const allCards: CardDefinition[] = [...deck.commanders, ...deck.cards];
  const uniqueIds = [...new Set(allCards.map((c) => c.scryfallId).filter((id) => id && id.length > 0))];

  const images = await imagesPort.fetchImages(uniqueIds);

  for (const card of allCards) {
    const fetched = images.get(card.scryfallId);
    if (!fetched) continue;
    card.imageUris = fetched.front;
    if (card.twoFaced && fetched.back) {
      card.backImageUris = fetched.back;
    }
  }
}
