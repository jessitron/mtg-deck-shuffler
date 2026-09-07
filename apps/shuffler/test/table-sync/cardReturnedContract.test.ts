import { GameState, TableInfo } from "../../src/GameState.js";
import { FakeSpineAdapter } from "../../src/port-spine/outbound/FakeSpineAdapter.js";
import { joinSpineBestEffort, sendCardReturnedToSpineBestEffort } from "../../src/table-sync/sendToSpine.js";
import { CardDefinition, Deck, PERSISTED_DECK_VERSION } from "../../src/types.js";
import { testProvenance } from "../generators.js";
import { assertValidatesAsSpineEvent } from "./contractValidation.js";

function baseEnvelope(payload: unknown) {
  return {
    id: "55555555-5555-5555-5555-555555555555",
    tableId: "some-table-id",
    name: "card.returned",
    initiator: { seatId: "1", playerName: "Jess" },
    occurredIn: "tabletop",
    origin: "tabletop.cardShapeHook",
    significance: "domain",
    schemaVersion: 1,
    payload,
  };
}

describe("card.returned events validate against the Spine's own contracts (contracts/envelope.v1.json, contracts/payloads/card.returned.v1.json)", () => {
  it("a well-formed payload validates", () => {
    const event = baseEnvelope({
      card: { scryfallId: "e6f2c1a4-2222-4a22-9e33-000000000002" },
      gameCardIndex: 0,
      seat: "1",
      fromZone: "battlefield",
    });

    expect(() => assertValidatesAsSpineEvent(event)).not.toThrow();
  });

  it("a well-formed payload without the optional fromZone still validates", () => {
    const event = baseEnvelope({
      card: { scryfallId: "e6f2c1a4-2222-4a22-9e33-000000000002" },
      gameCardIndex: 0,
      seat: "1",
    });

    expect(() => assertValidatesAsSpineEvent(event)).not.toThrow();
  });

  it("a payload missing gameCardIndex is rejected", () => {
    const event = baseEnvelope({
      card: { scryfallId: "e6f2c1a4-2222-4a22-9e33-000000000002" },
      seat: "1",
    });

    expect(() => assertValidatesAsSpineEvent(event)).toThrow(/invalid payload/);
  });

  it("a payload carrying an unexpected face field is rejected", () => {
    const event = baseEnvelope({
      card: { scryfallId: "e6f2c1a4-2222-4a22-9e33-000000000002" },
      gameCardIndex: 0,
      seat: "1",
      face: "front",
    });

    expect(() => assertValidatesAsSpineEvent(event)).toThrow(/invalid payload/);
  });

  it("a shuffler-initiated payload carrying instanceId (ticket 07) validates too — instanceId is additive, not exclusive", () => {
    const event = baseEnvelope({
      card: { scryfallId: "e6f2c1a4-2222-4a22-9e33-000000000002", instanceId: "11111111-1111-1111-1111-111111111111" },
      gameCardIndex: 0,
      seat: "1",
    });

    expect(() => assertValidatesAsSpineEvent(event)).not.toThrow();
  });
});

describe("sendCardReturnedToSpineBestEffort's actual send validates against the same contracts", () => {
  const lightningBolt: CardDefinition = {
    name: "Lightning Bolt",
    scryfallId: "e6f2c1a4-2222-4a22-9e33-000000000002",
    multiverseid: 12345,
    twoFaced: false,
    oracleCardName: "Lightning Bolt",
    colorIdentity: ["R"],
    set: "LEA",
    cardTypes: ["Instant"],
  };

  const testDeck: Deck = {
    version: PERSISTED_DECK_VERSION,
    id: 78,
    name: "Test Deck",
    totalCards: 1,
    commanders: [],
    cards: [lightningBolt],
    provenance: testProvenance,
  };

  it("the event actually sent by sendCardReturnedToSpineBestEffort, end to end through a joined seat, validates and carries occurredIn: shuffler", async () => {
    const fake = new FakeSpineAdapter();
    const { seatId, spineTableId, spineSeatNumber } = await joinSpineBestEffort(fake, {
      gameId: "contract-test-game-returned",
      tableName: "Friday Night",
      playerName: "Jess",
      deckName: "Test Deck",
    });
    const tableInfo: TableInfo = { tableName: "Friday Night", playerName: "Jess", seatId: seatId ?? "no-seat-id", spineTableId, spineSeatNumber };
    const game = GameState.newGame(203, 1, 1, testDeck, undefined, tableInfo);
    const bolt = game.getCards()[0];

    await sendCardReturnedToSpineBestEffort(fake, game, bolt);

    expect(fake.sentEvents).toHaveLength(1);
    const { event } = fake.sentEvents[0];
    expect((event as { occurredIn: string }).occurredIn).toBe("shuffler");
    expect(() => assertValidatesAsSpineEvent(event)).not.toThrow();
  });
});
