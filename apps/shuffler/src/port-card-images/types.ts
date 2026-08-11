import { CardImageUris } from "../types.js";

export interface FetchedCardImages {
  front: CardImageUris;
  back?: CardImageUris;
}

export interface CardImagesPort {
  fetchImages(scryfallIds: string[]): Promise<Map<string, FetchedCardImages>>;
}
