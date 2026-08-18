import { GameState, TableInfo } from "../../src/GameState.js";
import { FakeTabletopGateway } from "../../src/port-tabletop/FakeTabletopGateway.js";
import { sendCardToTableFirst, zoneHintForPlay } from "../../src/port-tabletop/sendToTable.js";
import { CardDefinition, Deck, PERSISTED_DECK_VERSION } from "../../src/types.js";
import { lightningBolt, testProvenance } from "../generators.js";


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

const testDeck: Deck = {
  version: PERSISTED_DECK_VERSION,
  id: 77,
  name: "Test Deck",
  totalCards: 2,
  commanders: [],
  cards: [lightningBolt, forest],
  provenance: testProvenance,
};

const tableInfo: TableInfo = { tableName: "Friday Night", playerName: "Jess", seatId: "abc12345" };

function cardNamed(game: GameState, name: string) {
  return game.getCards().find((gc) => gc.card.name === name)!;
}

describe("zoneHintForPlay", () => {
  const game = GameState.newGame(1, 1, 1, testDeck, undefined, tableInfo);

  it("a land is played to the battlefield", () => {
    expect(zoneHintForPlay(cardNamed(game, "Forest"))).toBe("battlefield");
  });

  it("a nonland is played to the stack", () => {
    expect(zoneHintForPlay(cardNamed(game, "Lightning Bolt"))).toBe("stack");
  });
});

describe("sendCardToTableFirst", () => {
  it("sends the event with the game's table name, seat, and the card's instance id", async () => {
    const game = GameState.newGame(2, 1, 1, testDeck, undefined, tableInfo);
    const bolt = cardNamed(game, "Lightning Bolt");
    const fake = new FakeTabletopGateway();

    await sendCardToTableFirst(fake, game, bolt, zoneHintForPlay(bolt));

    expect(fake.sentEvents).toHaveLength(1);
    const { tableName, event } = fake.sentEvents[0];
    expect(tableName).toBe("Friday Night");
    expect(event.tableId).toBe("Friday Night");
    expect(event.initiator).toEqual({ seatId: "abc12345", playerName: "Jess" });
    expect(event.payload.card).toEqual({ scryfallId: lightningBolt.scryfallId, instanceId: bolt.cardInstanceId });
    expect(event.payload.zoneHint).toBe("stack");
    expect(event.payload.cardName).toBe("Lightning Bolt");
  });

  it("mints a fresh event id per attempt (a retry is not a duplicate)", async () => {
    const game = GameState.newGame(3, 1, 1, testDeck, undefined, tableInfo);
    const bolt = cardNamed(game, "Lightning Bolt");
    const fake = new FakeTabletopGateway();

    await sendCardToTableFirst(fake, game, bolt, "stack");
    await sendCardToTableFirst(fake, game, bolt, "stack");

    expect(fake.sentEvents[0].event.id).not.toBe(fake.sentEvents[1].event.id);
    expect(fake.sentEvents[0].event.payload.card.instanceId).toBe(fake.sentEvents[1].event.payload.card.instanceId);
  });

  it("propagates the gateway's failure so the caller can block the play", async () => {
    const game = GameState.newGame(4, 1, 1, testDeck, undefined, tableInfo);
    const bolt = cardNamed(game, "Lightning Bolt");
    const fake = new FakeTabletopGateway();
    fake.failWith(new Error("connection refused"));

    await expect(sendCardToTableFirst(fake, game, bolt, "stack")).rejects.toThrow("connection refused");
  });

  it("refuses a solo game (the route must not call it without a table)", async () => {
    const soloGame = GameState.newGame(5, 1, 1, testDeck);
    const bolt = cardNamed(soloGame, "Lightning Bolt");
    const fake = new FakeTabletopGateway();

    await expect(sendCardToTableFirst(fake, soloGame, bolt, "stack")).rejects.toThrow("not at a table");
    expect(fake.sentEvents).toHaveLength(0);
  });

  it("fails loudly when no tabletop is configured", async () => {
    const game = GameState.newGame(6, 1, 1, testDeck, undefined, tableInfo);
    const bolt = cardNamed(game, "Lightning Bolt");

    await expect(sendCardToTableFirst(undefined, game, bolt, "stack")).rejects.toThrow("TABLETOP_URL");
  });

  it("sends to the Spine's real table id once the game has joined, not the bare pre-join table name", async () => {
    const game = GameState.newGame(7, 1, 1, testDeck, undefined, tableInfo);
    game.recordSpineJoin({ seatId: "abc12345", spineTableId: "friday-night-4d39ac18", spineSeatNumber: 1 });
    const bolt = cardNamed(game, "Lightning Bolt");
    const fake = new FakeTabletopGateway();

    await sendCardToTableFirst(fake, game, bolt, zoneHintForPlay(bolt));

    const { tableName, event } = fake.sentEvents[0];
    expect(tableName).toBe("friday-night-4d39ac18");
    expect(event.tableId).toBe("friday-night-4d39ac18");
  });
});
