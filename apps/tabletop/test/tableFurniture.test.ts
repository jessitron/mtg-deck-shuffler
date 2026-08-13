import { describe, it, expect } from "vitest";
import { createShapeId, ZERO_INDEX_KEY } from "@tldraw/tlschema";
import { mtgCardShape, zoneShape, darkerColor } from "../src/server/tableFurniture";

describe("tableFurniture constructors", () => {
  it("mtgCardShape produces a record whose parentId is the given page, not a leaked tldraw field", () => {
    const shape = mtgCardShape({
      id: createShapeId("card-test"),
      pageId: "page:page",
      x: 0,
      y: 0,
      w: 100,
      h: 140,
      index: ZERO_INDEX_KEY,
      instanceId: "instance-1",
      scryfallId: "scryfall-1",
      cardName: "Lightning Bolt",
      frontImageUrl: "https://example.com/front.jpg",
      backImageUrl: null,
      face: "front",
      faceDown: false,
      sleeveColor: null,
      cardBackImageUrl: null,
      owner: "seat-1",
      isCommander: false,
    });

    expect(shape.typeName).toBe("shape");
    expect(shape.type).toBe("mtg-card");
    expect(shape.parentId).toBe("page:page");
    expect(shape.isLocked).toBe(false);
    expect(shape.opacity).toBe(1);
    expect(shape.props.owner).toBe("seat-1");
    expect(shape.meta).toEqual({});
  });

  it("mtgCardShape honors the isLocked/opacity overrides used for ghost commanders", () => {
    const shape = mtgCardShape({
      id: createShapeId("card-ghost"),
      pageId: "page:page",
      x: 0,
      y: 0,
      w: 100,
      h: 140,
      index: ZERO_INDEX_KEY,
      instanceId: "instance-2",
      scryfallId: "scryfall-2",
      cardName: "Atraxa",
      frontImageUrl: "https://example.com/front.jpg",
      backImageUrl: null,
      face: "front",
      faceDown: false,
      sleeveColor: null,
      cardBackImageUrl: null,
      owner: "seat-1",
      isCommander: true,
      isLocked: true,
      opacity: 0.3,
    });

    expect(shape.isLocked).toBe(true);
    expect(shape.opacity).toBe(0.3);
  });

  it("zoneShape produces a locked mtg-zone record scoped to the given seat", () => {
    const shape = zoneShape({
      id: createShapeId("zone-test"),
      pageId: "page:page",
      x: 0,
      y: 0,
      w: 200,
      h: 200,
      label: "Graveyard",
      index: ZERO_INDEX_KEY,
      zone: "graveyard",
      seatId: "seat-1",
    });

    expect(shape.type).toBe("mtg-zone");
    expect(shape.parentId).toBe("page:page");
    expect(shape.isLocked).toBe(true);
    expect(shape.props.zone).toBe("graveyard");
    expect(shape.props.seatId).toBe("seat-1");
    expect(shape.props.sleeveColor).toBeNull();
  });

  it("zoneShape gives a sleeved library full opacity instead of the faint furniture look", () => {
    const shape = zoneShape({
      id: createShapeId("zone-library"),
      pageId: "page:page",
      x: 0,
      y: 0,
      w: 200,
      h: 200,
      label: "Library",
      index: ZERO_INDEX_KEY,
      zone: "library",
      seatId: "seat-1",
      sleeveColor: "#ff0000",
    });

    expect(shape.opacity).toBe(1);
    expect(shape.props.sleeveColor).toBe("#ff0000");
  });
});

describe("darkerColor — the deck-title text color", () => {
  it("picks the darker of the two identity colors by luminance", () => {
    // #530aae (dark purple) is darker than #f0e68c (warm gold).
    expect(darkerColor("#530aae", "#f0e68c")).toBe("#530aae");
    expect(darkerColor("#f0e68c", "#530aae")).toBe("#530aae");
  });

  it("uses whichever single color is present when only one is", () => {
    expect(darkerColor("#bd0a0a", undefined)).toBe("#bd0a0a");
    expect(darkerColor(undefined, "#3c99e5")).toBe("#3c99e5");
  });

  it("falls back to the house dark chrome token when a seat carries neither color", () => {
    expect(darkerColor(undefined, undefined)).toBe("var(--deep-space)");
  });
});
