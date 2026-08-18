import { buildCardPlayedEvent, CARD_PLAYED_EVENT_NAME, zoneHintForPlay } from "../../src/port-tabletop/types";
import { GameCard } from "../../src/GameState";
import { CardDefinition } from "../../src/types";
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

const forest: CardDefinition = {
  name: "Forest",
  scryfallId: "def456",
  multiverseid: 54321,
  twoFaced: false,
  oracleCardName: "Forest",
  colorIdentity: ["G"],
  set: "LEA",
  cardTypes: ["Land"],
};

describe("zoneHintForPlay", () => {
  it("a land is played to the battlefield", () => {
    expect(zoneHintForPlay(handCard(forest))).toBe("battlefield");
  });

  it("a nonland is played to the stack", () => {
    expect(zoneHintForPlay(handCard(lightningBolt))).toBe("stack");
  });
});

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
    expect(event.traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/);
    expect(event.schemaVersion).toBe(1);
    expect(event.payload.card).toEqual({ scryfallId: lightningBolt.scryfallId, instanceId: "instance-guid-1" });
    expect(event.payload.face).toBe("front");
    expect(event.payload.zoneHint).toBe("stack");
    expect(event.payload.cardName).toBe(lightningBolt.name);
    expect(event.payload.frontImageUrl).toContain(lightningBolt.scryfallId.substring(0, 1));
    expect(event.payload.backImageUrl).toBeNull(); // not twoFaced
    expect(event.payload.owner).toBe("abc123");
    expect(event.payload.isCommander).toBe(false);
    expect(event.payload.gameCardIndex).toBe(42);
  });

  it("carries owner (the initiator's seatId) and isCommander (from the GameCard) — owner grants no capability, it's a fact the shape carries", () => {
    const event = buildCardPlayedEvent(handCard(lightningBolt, 1, true), "instance-guid-2", initiator, "battlefield", tableName);
    expect(event.payload.owner).toBe(initiator.seatId);
    expect(event.payload.isCommander).toBe(true);
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

  it("carries gameCardIndex now (let-gamecardindex-out, 2026-08-10): decklists are public on Archidekt anyway, so the index decodes to no real secret", () => {
    const event = buildCardPlayedEvent(handCard(lightningBolt, 7), "i-3", initiator, "graveyard", tableName);
    expect(event.payload.gameCardIndex).toBe(7);
  });
});
