import { GameState, TableInfo } from "../../src/GameState.js";
import { FakeTabletopGateway } from "../../src/port-tabletop/FakeTabletopGateway.js";
import { sendCardToTableFirst, sendSeatJoinedBestEffort, zoneHintForPlay } from "../../src/port-tabletop/sendToTable.js";
import { CardDefinition, Deck, PERSISTED_DECK_VERSION } from "../../src/types.js";
import { lightningBolt, testProvenance } from "../generators.js";

/**
 * Send-then-commit (JES-127, B3): the sending half. The route sends FIRST and
 * commits the game state only on success; these tests pin down what is sent
 * (and that failure propagates, so the route can block the play).
 */

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
    expect(event.initiator).toEqual({ seatId: "abc12345", playerName: "Jess" });
    expect(event.card).toEqual({ scryfallId: lightningBolt.scryfallId, instanceId: bolt.cardInstanceId });
    expect(event.zoneHint).toBe("stack");
    expect(event.cardName).toBe("Lightning Bolt");
  });

  it("mints a fresh event id per attempt (a retry is not a duplicate)", async () => {
    const game = GameState.newGame(3, 1, 1, testDeck, undefined, tableInfo);
    const bolt = cardNamed(game, "Lightning Bolt");
    const fake = new FakeTabletopGateway();

    await sendCardToTableFirst(fake, game, bolt, "stack");
    await sendCardToTableFirst(fake, game, bolt, "stack");

    expect(fake.sentEvents[0].event.id).not.toBe(fake.sentEvents[1].event.id);
    expect(fake.sentEvents[0].event.card.instanceId).toBe(fake.sentEvents[1].event.card.instanceId);
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
});

describe("sendSeatJoinedBestEffort", () => {
  it("sends a seat.joined event carrying the seat's identity, the deck's name, and both image URLs", async () => {
    const fake = new FakeTabletopGateway();

    await sendSeatJoinedBestEffort(fake, tableInfo, "Test Deck");

    expect(fake.sentSeatJoinedEvents).toHaveLength(1);
    const { tableName, event } = fake.sentSeatJoinedEvents[0];
    expect(tableName).toBe("Friday Night");
    expect(event.name).toBe("seat.joined");
    expect(event.initiator).toEqual({ seatId: "abc12345", playerName: "Jess" });
    expect(event.deckName).toBe("Test Deck");
    expect(event.playmatImageUrl).toMatch(/^https:\/\//);
    expect(event.cardBackImageUrl).toMatch(/^https:\/\//);
  });

  it("a picked sleeve travels as sleeveColor, and the card back is omitted — sleeveColor wins", async () => {
    const fake = new FakeTabletopGateway();

    await sendSeatJoinedBestEffort(fake, tableInfo, "Test Deck", "#8b2f5c");

    const { event } = fake.sentSeatJoinedEvents[0];
    expect(event.sleeveColor).toBe("#8b2f5c");
    expect(event.cardBackImageUrl).toBeUndefined();
    expect(event.playmatImageUrl).toMatch(/^https:\/\//);
  });

  it("a picked playmat travels as an absolute URL (ticket 16)", async () => {
    const fake = new FakeTabletopGateway();

    await sendSeatJoinedBestEffort(fake, tableInfo, "Test Deck", undefined, "/images/aeoe-6-seam-rip.png");

    const { event } = fake.sentSeatJoinedEvents[0];
    expect(event.playmatImageUrl).toMatch(/^https:\/\/.*\/images\/aeoe-6-seam-rip\.png$/);
  });

  it("no playmat picked → the default mat travels", async () => {
    const fake = new FakeTabletopGateway();

    await sendSeatJoinedBestEffort(fake, tableInfo, "Test Deck");

    const { event } = fake.sentSeatJoinedEvents[0];
    expect(event.playmatImageUrl).toMatch(/aeoe-43-cascading-cataracts\.png$/);
  });

  it("no sleeve picked → no sleeveColor, standard card back (today's look)", async () => {
    const fake = new FakeTabletopGateway();

    await sendSeatJoinedBestEffort(fake, tableInfo, "Test Deck", undefined);

    const { event } = fake.sentSeatJoinedEvents[0];
    expect(event.sleeveColor).toBeUndefined();
    expect(event.cardBackImageUrl).toMatch(/^https:\/\//);
  });

  it("is a no-op when no tabletop is configured — Shuffle Up must not fail", async () => {
    await expect(sendSeatJoinedBestEffort(undefined, tableInfo, "Test Deck")).resolves.toBeUndefined();
  });

  it("swallows a gateway failure — best-effort, unlike sendCardToTableFirst", async () => {
    const fake = new FakeTabletopGateway();
    fake.failWith(new Error("connection refused"));

    await expect(sendSeatJoinedBestEffort(fake, tableInfo, "Test Deck")).resolves.toBeUndefined();
    expect(fake.sentSeatJoinedEvents).toHaveLength(0);
  });
});
