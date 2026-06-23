import { mapScryfallCardToImages } from "../src/port-card-images/ScryfallCardImagesGateway.js";

describe("mapScryfallCardToImages", () => {
  it("maps a single-faced card's top-level image_uris to the front face", () => {
    const card = {
      id: "a5dc8c3f-c8a3-4bea-9874-4bf9b221408b",
      image_uris: {
        small: "https://cards.scryfall.io/small/...jpg?1767730226",
        normal: "https://cards.scryfall.io/normal/front/a/5/a5dc8c3f.jpg?1767730226",
        large: "https://cards.scryfall.io/large/front/a/5/a5dc8c3f.jpg?1767730226",
        png: "https://cards.scryfall.io/png/front/a/5/a5dc8c3f.png?1767730226",
        art_crop: "https://cards.scryfall.io/art_crop/front/a/5/a5dc8c3f.jpg?1767730226",
        border_crop: "https://cards.scryfall.io/border_crop/...jpg?1767730226",
      },
    };

    const result = mapScryfallCardToImages(card);

    expect(result).toEqual({
      front: {
        normal: "https://cards.scryfall.io/normal/front/a/5/a5dc8c3f.jpg?1767730226",
        large: "https://cards.scryfall.io/large/front/a/5/a5dc8c3f.jpg?1767730226",
        png: "https://cards.scryfall.io/png/front/a/5/a5dc8c3f.png?1767730226",
        art_crop: "https://cards.scryfall.io/art_crop/front/a/5/a5dc8c3f.jpg?1767730226",
      },
    });
    // Only the formats the app uses are stored (small / border_crop dropped).
    expect(result?.front).not.toHaveProperty("small");
    expect(result?.front).not.toHaveProperty("border_crop");
    expect(result?.back).toBeUndefined();
  });

  it("maps a two-faced card's card_faces to front and back", () => {
    const card = {
      id: "nicol-bolas-id",
      // True DFCs have no top-level image_uris.
      card_faces: [
        { image_uris: { normal: "https://scryfall/normal/front.jpg?1", large: "https://scryfall/large/front.jpg?1" } },
        { image_uris: { normal: "https://scryfall/normal/back.jpg?1", large: "https://scryfall/large/back.jpg?1" } },
      ],
    };

    const result = mapScryfallCardToImages(card);

    expect(result).toEqual({
      front: { normal: "https://scryfall/normal/front.jpg?1", large: "https://scryfall/large/front.jpg?1" },
      back: { normal: "https://scryfall/normal/back.jpg?1", large: "https://scryfall/large/back.jpg?1" },
    });
  });

  it("returns undefined when there are no usable image URLs", () => {
    expect(mapScryfallCardToImages({ id: "x" })).toBeUndefined();
    expect(mapScryfallCardToImages({ id: "y", image_uris: {} })).toBeUndefined();
  });
});
