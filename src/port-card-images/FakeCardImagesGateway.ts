import { CardImagesPort, FetchedCardImages } from "./types.js";

/** Test fake for CardImagesPort. By default it synthesizes deterministic,
 * version-tagged URLs for any requested id (so callers can assert "this came
 * from the gateway, not from construction"). Seed specific ids via the
 * constructor or `set()` to control individual results, or omit an id from a
 * seeded map to simulate Scryfall not recognizing it. */
export class FakeCardImagesGateway implements CardImagesPort {
  private seeded: Map<string, FetchedCardImages>;
  private readonly synthesizeUnknown: boolean;
  public readonly requestedIds: string[] = [];

  constructor(seeded?: Map<string, FetchedCardImages>, options: { synthesizeUnknown?: boolean } = {}) {
    this.seeded = seeded ?? new Map();
    // When a specific map is seeded, default to NOT synthesizing others (so tests
    // can simulate missing cards). With no seed, synthesize everything.
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
