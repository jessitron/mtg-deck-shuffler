import { GameState, TableInfo } from "../../src/GameState.js";
import { FakeSpine } from "./fakeSpine.js";
import { joinSpineBestEffort, sendCardDiscardedToSpineBestEffort } from "../../src/table-sync/sendToSpine.js";
import { buildCardDiscardedEvent } from "../../src/port-tabletop/types.js";
import { CardDefinition, Deck, PERSISTED_DECK_VERSION } from "../../src/types.js";
import { testProvenance } from "../generators.js";
import { assertValidatesAsSpineEvent } from "./contractValidation.js";

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
  id: 77,
  name: "Test Deck",
  totalCards: 1,
  commanders: [],
  cards: [lightningBolt],
  provenance: testProvenance,
};

function cardNamed(game: GameState, name: string) {
  return game.getCards().find((gc) => gc.card.name === name)!;
}

describe("card.discarded events validate against the Spine's own contracts (contracts/envelope.v1.json, contracts/payloads/card.discarded.v1.json)", () => {
  it("a directly-built event validates", () => {
    const event = buildCardDiscardedEvent(
      { card: lightningBolt, location: { type: "Hand", position: 0 }, gameCardIndex: 0, isCommander: false, currentFace: "front" },
      "11111111-1111-1111-1111-111111111111",
      { seatId: "1", playerName: "Jess" },
      "1",
      "some-table-id"
    );

    expect(() => assertValidatesAsSpineEvent(event)).not.toThrow();
  });

  it("the event actually sent by sendCardDiscardedToSpineBestEffort, end to end through a joined seat, validates", async () => {
    const fake = new FakeSpine();
    const { spineTableId, spineSeatNumber } = await joinSpineBestEffort(fake.join, {
      gameId: "discard-contract-test-game",
      tableName: "Friday Night",
      playerName: "Jess",
      deckName: "Test Deck",
    });
    const tableInfo: TableInfo = { tableName: "Friday Night", playerName: "Jess", seatId: "abc12345", spineTableId, spineSeatNumber };
    const game = GameState.newGame(301, 1, 1, testDeck, undefined, tableInfo);
    const bolt = cardNamed(game, "Lightning Bolt");

    await sendCardDiscardedToSpineBestEffort(fake.events, game, bolt);

    expect(fake.sentEvents).toHaveLength(1);
    const { event } = fake.sentEvents[0];
    expect(event.name).toBe("card.discarded");
    expect(() => assertValidatesAsSpineEvent(event)).not.toThrow();
  });
});
