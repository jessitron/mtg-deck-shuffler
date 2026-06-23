import { CardImageUris, ImageFormat } from "../types.js";
import { CardImagesPort, FetchedCardImages } from "./types.js";

/** The image formats the app actually requests. We store only these (rather than
 * Scryfall's full image_uris) to keep deck files lean. */
const STORED_FORMATS: ImageFormat[] = ["normal", "large", "png", "art_crop"];

const SCRYFALL_COLLECTION_URL = "https://api.scryfall.com/cards/collection";
/** Scryfall allows up to 75 identifiers per /cards/collection request. */
const BATCH_SIZE = 75;
/** Scryfall asks for 50-100ms between requests. */
const REQUEST_DELAY_MS = 100;

/** Minimal shape of the bits of a Scryfall card we read. */
interface ScryfallImageUris {
  [format: string]: string | undefined;
}
interface ScryfallCard {
  id?: string;
  image_uris?: ScryfallImageUris;
  card_faces?: Array<{ image_uris?: ScryfallImageUris }>;
}
interface ScryfallCollectionResponse {
  data?: ScryfallCard[];
}

/** Copy only the formats we store from a Scryfall image_uris object. */
function pickStoredFormats(uris: ScryfallImageUris | undefined): CardImageUris | undefined {
  if (!uris) return undefined;
  const picked: CardImageUris = {};
  for (const format of STORED_FORMATS) {
    const url = uris[format];
    if (url) picked[format] = url;
  }
  return Object.keys(picked).length > 0 ? picked : undefined;
}

/** Pure mapping from a Scryfall card to our front/back image URLs.
 * Single-faced cards carry top-level `image_uris`; genuine double-faced cards
 * carry per-face `card_faces[].image_uris` and no top-level `image_uris`. */
export function mapScryfallCardToImages(card: ScryfallCard): FetchedCardImages | undefined {
  const frontFromFaces = pickStoredFormats(card.card_faces?.[0]?.image_uris);
  const front = pickStoredFormats(card.image_uris) ?? frontFromFaces;
  if (!front) return undefined;
  const back = pickStoredFormats(card.card_faces?.[1]?.image_uris);
  return back ? { front, back } : { front };
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Fetches card image URLs from Scryfall's /cards/collection endpoint, batching
 * by 75 and caching results across calls so repeated scryfallIds (common across
 * precon decks) are fetched once. */
export class ScryfallCardImagesGateway implements CardImagesPort {
  private cache = new Map<string, FetchedCardImages>();

  async fetchImages(scryfallIds: string[]): Promise<Map<string, FetchedCardImages>> {
    const unique = [...new Set(scryfallIds.filter((id) => id && id.length > 0))];
    const missing = unique.filter((id) => !this.cache.has(id));

    const batches = chunk(missing, BATCH_SIZE);
    for (let i = 0; i < batches.length; i++) {
      await this.fetchBatch(batches[i]);
      if (i < batches.length - 1) await delay(REQUEST_DELAY_MS);
    }

    const result = new Map<string, FetchedCardImages>();
    for (const id of unique) {
      const images = this.cache.get(id);
      if (images) result.set(id, images);
    }
    return result;
  }

  private async fetchBatch(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const response = await fetch(SCRYFALL_COLLECTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Scryfall requires a User-Agent and Accept header on API requests.
        "User-Agent": "mtg-deck-shuffler/1.0 (https://github.com/jessitron/mtg-deck-shuffler)",
        Accept: "application/json",
      },
      body: JSON.stringify({ identifiers: ids.map((id) => ({ id })) }),
    });
    if (!response.ok) {
      throw new Error(`Scryfall /cards/collection failed: ${response.status} ${response.statusText}`);
    }
    const body = (await response.json()) as ScryfallCollectionResponse;
    for (const card of body.data || []) {
      if (!card.id) continue;
      const images = mapScryfallCardToImages(card);
      if (images) this.cache.set(card.id, images);
    }
  }
}
