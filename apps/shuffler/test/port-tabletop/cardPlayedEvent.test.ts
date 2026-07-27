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

describe("buildCardPlayedEvent (F0 — the frozen card-arrival payload, JES-128)", () => {
  const initiator = { seatId: "abc123", playerName: "Jess" };

  it("builds the envelope-lite payload from a GameCard", () => {
    const event = buildCardPlayedEvent(handCard(), "instance-guid-1", initiator, "stack");

    expect(event.name).toBe(CARD_PLAYED_EVENT_NAME);
    expect(event.id).toMatch(/[0-9a-f-]{36}/);
    expect(event.occurredAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(event.initiator).toEqual({ seatId: "abc123", playerName: "Jess" });
    expect(event.card).toEqual({ scryfallId: lightningBolt.scryfallId, instanceId: "instance-guid-1" });
    expect(event.face).toBe("front");
    expect(event.zoneHint).toBe("stack");
    expect(event.cardName).toBe(lightningBolt.name);
    expect(event.imageUrl).toContain(lightningBolt.scryfallId.substring(0, 1));
  });

  it("mints a fresh event id per attempt (retries are distinguishable)", () => {
    const one = buildCardPlayedEvent(handCard(), "i-1", initiator, "battlefield");
    const two = buildCardPlayedEvent(handCard(), "i-1", initiator, "battlefield");
    expect(one.id).not.toBe(two.id);
  });

  it("sends the CURRENT face and its face-specific image", () => {
    const flipped: GameCard = { ...handCard(nicolBolas), currentFace: "back" };
    const event = buildCardPlayedEvent(flipped, "i-2", initiator, "stack");
    expect(event.face).toBe("back");
    expect(event.imageUrl).toContain("/back/");
  });

  it("NEVER leaks gameCardIndex — an index is a decodable secret (alphabetical rank in a known decklist)", () => {
    const event = buildCardPlayedEvent(handCard(lightningBolt, 7), "i-3", initiator, "graveyard");
    const serialized = JSON.stringify(event);
    expect(serialized).not.toContain("gameCardIndex");
    expect(serialized).not.toContain("Index");
    // and no bare numeric leak of the index either
    expect(Object.values(event)).not.toContain(7);
  });
});
