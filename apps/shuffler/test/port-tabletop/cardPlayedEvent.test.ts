import { buildCardPlayedEvent, CARD_PLAYED_EVENT_NAME } from "../../src/port-tabletop/types";
import { GameCard } from "../../src/GameState";
import { lightningBolt, nicolBolas } from "../generators";

function handCard(card = lightningBolt, gameCardIndex = 42): GameCard {
  return {
    card,
    location: { type: "Hand", position: 3 },
    gameCardIndex,
    isCommander: false,
    currentFace: "front",
  };
}

describe("buildCardPlayedEvent (the card.played envelope, JES-128)", () => {
  const initiator = { seatId: "abc123", playerName: "Jess" };
  const tableName = "Friday Night";

  it("builds the envelope carrying a card.played payload from a GameCard", () => {
    const event = buildCardPlayedEvent(handCard(), "instance-guid-1", initiator, "stack", tableName);

    expect(event.name).toBe(CARD_PLAYED_EVENT_NAME);
    expect(event.id).toMatch(/[0-9a-f-]{36}/);
    expect(event.tableId).toBe(tableName);
    expect(event.occurredAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(event.initiator).toEqual({ seatId: "abc123", playerName: "Jess" });
    expect(event.occurredIn).toBe("shuffler");
    expect(event.visibility).toBe("public");
    expect(event.traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/);
    expect(event.schemaVersion).toBe(1);
    expect(event.payload.card).toEqual({ scryfallId: lightningBolt.scryfallId, instanceId: "instance-guid-1" });
    expect(event.payload.face).toBe("front");
    expect(event.payload.zoneHint).toBe("stack");
    expect(event.payload.cardName).toBe(lightningBolt.name);
    expect(event.payload.frontImageUrl).toContain(lightningBolt.scryfallId.substring(0, 1));
    expect(event.payload.backImageUrl).toBeNull(); // not twoFaced
  });

  it("mints a fresh event id per attempt (retries are distinguishable)", () => {
    const one = buildCardPlayedEvent(handCard(), "i-1", initiator, "battlefield", tableName);
    const two = buildCardPlayedEvent(handCard(), "i-1", initiator, "battlefield", tableName);
    expect(one.id).not.toBe(two.id);
  });

  it("sends the CURRENT face flag, independent of which image URLs are attached", () => {
    const flipped: GameCard = { ...handCard(nicolBolas), currentFace: "back" };
    const event = buildCardPlayedEvent(flipped, "i-2", initiator, "stack", tableName);
    expect(event.payload.face).toBe("back");
  });

  it("sends both front and back image URLs for a two-faced card", () => {
    const event = buildCardPlayedEvent(handCard(nicolBolas), "i-2b", initiator, "stack", tableName);
    expect(event.payload.frontImageUrl).not.toContain("/back/");
    expect(event.payload.backImageUrl).toContain("/back/");
  });

  it("derives backImageUrl from twoFaced, never from backImageUris happening to be populated", () => {
    const missingBackUris: GameCard = handCard({ ...nicolBolas, backImageUris: undefined });
    const event = buildCardPlayedEvent(missingBackUris, "i-2c", initiator, "stack", tableName);
    expect(event.payload.backImageUrl).not.toBeNull(); // falls back to constructCardImageUrl, still populated
  });

  it("NEVER leaks gameCardIndex — an index is a decodable secret (alphabetical rank in a known decklist)", () => {
    const event = buildCardPlayedEvent(handCard(lightningBolt, 7), "i-3", initiator, "graveyard", tableName);
    const serialized = JSON.stringify(event);
    expect(serialized).not.toContain("gameCardIndex");
    expect(serialized).not.toContain("Index");
    // and no bare numeric leak of the index either, anywhere in the envelope
    expect(Object.values(event)).not.toContain(7);
    expect(Object.values(event.payload)).not.toContain(7);
  });
});
