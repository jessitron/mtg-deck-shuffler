import { Deck, CardDefinition } from "../types.js";
import { CardImagesPort } from "./types.js";

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
