import { buildCardPlayedEvent, CARD_PLAYED_EVENT_NAME } from "../../src/port-tabletop/types";
import { GameCard } from "../../src/GameState";
import { lightningBolt, nicolBolas } from "../generators";

function handCard(card = lightningBolt, gameCardIndex = 42, isCommander = false): GameCard {
  return {
    card,
    location: { type: "Hand", position: 3 },
    gameCardIndex,
    isCommander,
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
    expect(event.frontImageUrl).toContain(lightningBolt.scryfallId.substring(0, 1));
    expect(event.backImageUrl).toBeNull(); // not twoFaced
    expect(event.owner).toBe("abc123");
    expect(event.isCommander).toBe(false);
  });

  it("carries owner (the initiator's seatId) and isCommander (from the GameCard) — owner grants no capability, it's a fact the shape carries", () => {
    const event = buildCardPlayedEvent(handCard(lightningBolt, 1, true), "instance-guid-2", initiator, "battlefield");
    expect(event.owner).toBe(initiator.seatId);
    expect(event.isCommander).toBe(true);
  });

  it("mints a fresh event id per attempt (retries are distinguishable)", () => {
    const one = buildCardPlayedEvent(handCard(), "i-1", initiator, "battlefield");
    const two = buildCardPlayedEvent(handCard(), "i-1", initiator, "battlefield");
    expect(one.id).not.toBe(two.id);
  });

  it("sends the CURRENT face flag, independent of which image URLs are attached", () => {
    const flipped: GameCard = { ...handCard(nicolBolas), currentFace: "back" };
    const event = buildCardPlayedEvent(flipped, "i-2", initiator, "stack");
    expect(event.face).toBe("back");
  });

  it("sends both front and back image URLs for a two-faced card", () => {
    const event = buildCardPlayedEvent(handCard(nicolBolas), "i-2b", initiator, "stack");
    expect(event.frontImageUrl).not.toContain("/back/");
    expect(event.backImageUrl).toContain("/back/");
  });

  it("derives backImageUrl from twoFaced, never from backImageUris happening to be populated", () => {
    const missingBackUris: GameCard = handCard({ ...nicolBolas, backImageUris: undefined });
    const event = buildCardPlayedEvent(missingBackUris, "i-2c", initiator, "stack");
    expect(event.backImageUrl).not.toBeNull(); // falls back to constructCardImageUrl, still populated
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
