import { GameState, TableInfo } from "../../src/GameState.js";
import { FakeSpineGateway } from "../../src/port-spine/FakeSpineGateway.js";
import { joinSpineBestEffort, sendCardPlayedToSpineBestEffort } from "../../src/port-spine/sendToSpine.js";
import { buildCardPlayedEvent } from "../../src/port-tabletop/types.js";
import { CardDefinition, Deck, PERSISTED_DECK_VERSION } from "../../src/types.js";
import { testProvenance } from "../generators.js";
import { assertValidatesAsSpineEvent } from "./contractValidation.js";

// The shared `lightningBolt` fixture in generators.ts uses "abc123" for scryfallId —
// fine for tests that don't care about its shape, but the contract requires a real
// Scryfall UUID, so these tests use their own card fixtures with realistic ids.
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

const forest: CardDefinition = {
  name: "Forest",
  scryfallId: "5f6b2c9a-1111-4a22-9e33-000000000001",
  multiverseid: 54321,
  twoFaced: false,
  oracleCardName: "Forest",
  colorIdentity: ["G"],
  set: "LEA",
  cardTypes: ["Land"],
};

const testDeck: Deck = {
  version: PERSISTED_DECK_VERSION,
  id: 77,
  name: "Test Deck",
  totalCards: 2,
  commanders: [],
  cards: [lightningBolt, forest],
  provenance: testProvenance,
};

function cardNamed(game: GameState, name: string) {
  return game.getCards().find((gc) => gc.card.name === name)!;
}

describe("card.played events validate against the Spine's own contracts (contracts/envelope.v1.json, contracts/payloads/card.played.v1.json)", () => {
  it("a directly-built event, with a realistic short numeric seatId, validates", () => {
    // The contract only requires a non-empty string; this checks that a short bare
    // seat number still validates even though a real send now uses game.seatId (the
    // GUID-shaped id seat.joined minted), not a bare seat number.
    const event = buildCardPlayedEvent(
      { card: lightningBolt, location: { type: "Hand", position: 0 }, gameCardIndex: 0, isCommander: false, currentFace: "front" },
      "11111111-1111-1111-1111-111111111111",
      { seatId: "1", playerName: "Jess" },
      "stack",
      "some-table-id"
    );

    expect(() => assertValidatesAsSpineEvent(event)).not.toThrow();
  });

  it("the event actually sent by sendCardPlayedToSpineBestEffort, end to end through a joined seat, validates", async () => {
    const fake = new FakeSpineGateway();
    const { spineTableId, spineSeatNumber } = await joinSpineBestEffort(fake, {
      gameId: "contract-test-game",
      tableName: "Friday Night",
      playerName: "Jess",
      deckName: "Test Deck",
    });
    const tableInfo: TableInfo = { tableName: "Friday Night", playerName: "Jess", seatId: "abc12345", spineTableId, spineSeatNumber };
    const game = GameState.newGame(201, 1, 1, testDeck, undefined, tableInfo);
    const bolt = cardNamed(game, "Lightning Bolt");

    await sendCardPlayedToSpineBestEffort(fake, game, bolt, "stack");

    expect(fake.sentEvents).toHaveLength(1);
    const { event } = fake.sentEvents[0];
    expect(() => assertValidatesAsSpineEvent(event)).not.toThrow();
  });

  it("a directly-built event carrying initiator.sessionId (minted fresh per page load) validates", () => {
    const event = buildCardPlayedEvent(
      { card: lightningBolt, location: { type: "Hand", position: 0 }, gameCardIndex: 0, isCommander: false, currentFace: "front" },
      "22222222-2222-2222-2222-222222222222",
      { seatId: "1", playerName: "Jess", sessionId: "33333333-3333-3333-3333-333333333333" },
      "stack",
      "some-table-id"
    );

    expect(event.initiator.sessionId).toBe("33333333-3333-3333-3333-333333333333");
    expect(() => assertValidatesAsSpineEvent(event)).not.toThrow();
  });

  it("the event sent by sendCardPlayedToSpineBestEffort carries the page-load sessionId passed to it, and still validates", async () => {
    const fake = new FakeSpineGateway();
    const { spineTableId, spineSeatNumber } = await joinSpineBestEffort(fake, {
      gameId: "contract-test-game-session",
      tableName: "Friday Night",
      playerName: "Jess",
      deckName: "Test Deck",
    });
    const tableInfo: TableInfo = { tableName: "Friday Night", playerName: "Jess", seatId: "abc12345", spineTableId, spineSeatNumber };
    const game = GameState.newGame(202, 1, 1, testDeck, undefined, tableInfo);
    const bolt = cardNamed(game, "Lightning Bolt");

    await sendCardPlayedToSpineBestEffort(fake, game, bolt, "stack", "44444444-4444-4444-4444-444444444444");

    expect(fake.sentEvents).toHaveLength(1);
    const { event } = fake.sentEvents[0];
    expect(event.initiator.sessionId).toBe("44444444-4444-4444-4444-444444444444");
    expect(() => assertValidatesAsSpineEvent(event)).not.toThrow();
  });
});
