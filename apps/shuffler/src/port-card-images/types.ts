import { CardImageUris } from "../types.js";

/** Image URLs for one card, as fetched from Scryfall. `back` is present only for
 * genuinely two-faced cards (transform / modal_dfc / reversible / dfc tokens). */
export interface FetchedCardImages {
  front: CardImageUris;
  back?: CardImageUris;
}

/** Port for fetching card image URLs by scryfallId. Implemented by Scryfall over
 * HTTP at runtime, and by a fake in tests. */
export interface CardImagesPort {
  /** Returns a map from scryfallId to its image URLs. IDs that Scryfall doesn't
   * recognize are simply absent from the map (callers fall back to construction). */
  fetchImages(scryfallIds: string[]): Promise<Map<string, FetchedCardImages>>;
}
