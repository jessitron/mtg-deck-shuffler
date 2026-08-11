import { CardImagesPort, FetchedCardImages } from "./types.js";

export class FakeCardImagesGateway implements CardImagesPort {
  private seeded: Map<string, FetchedCardImages>;
  private readonly synthesizeUnknown: boolean;
  public readonly requestedIds: string[] = [];

  constructor(seeded?: Map<string, FetchedCardImages>, options: { synthesizeUnknown?: boolean } = {}) {
    this.seeded = seeded ?? new Map();
    this.synthesizeUnknown = options.synthesizeUnknown ?? seeded === undefined;
  }

  set(scryfallId: string, images: FetchedCardImages): void {
    this.seeded.set(scryfallId, images);
  }

  async fetchImages(scryfallIds: string[]): Promise<Map<string, FetchedCardImages>> {
    this.requestedIds.push(...scryfallIds);
    const result = new Map<string, FetchedCardImages>();
    for (const id of scryfallIds) {
      if (this.seeded.has(id)) {
        result.set(id, this.seeded.get(id)!);
      } else if (this.synthesizeUnknown && id) {
        result.set(id, {
          front: { normal: `https://fake.scryfall/normal/${id}.jpg?fake`, large: `https://fake.scryfall/large/${id}.jpg?fake` },
        });
      }
    }
    return result;
  }
}
