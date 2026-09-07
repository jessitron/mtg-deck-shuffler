import { EventEnvelope } from "../../../src/port-tabletop/types.js";
import { HttpSpineAdapter } from "../../../src/port-spine/outbound/HttpSpineAdapter.js";
import { SpineGateway } from "../../../src/port-spine/outbound/HttpSpineGateway.js";
import { SpineJoinRequest, SpineJoinResult } from "../../../src/port-spine/outbound/spineWire.js";
import { TableSeat } from "../../../src/port-spine/outbound/types.js";
import { GameCard } from "../../../src/domain-types.js";
import { lightningBolt, nicolBolas } from "../../generators.js";

/** A Spine that only remembers. The adapter is what's under test; this stands in for the wire. */
class RecordingSpineGateway implements SpineGateway {
  public readonly joinRequests: SpineJoinRequest[] = [];
  public readonly sentEvents: { tableId: string; event: EventEnvelope<unknown> }[] = [];

  async join(request: SpineJoinRequest): Promise<SpineJoinResult> {
    this.joinRequests.push(request);
    return { tableId: "table-9", seatId: "seat-abc", seatNumber: 2, tableUrl: "http://table.test/t/friday" };
  }

  async sendEvent(tableId: string, event: EventEnvelope<unknown>): Promise<void> {
    this.sentEvents.push({ tableId, event });
  }
}

function gameCard(card = lightningBolt, cardInstanceId: string | undefined = "instance-1"): GameCard {
  return { card, location: { type: "Hand", position: 0 }, gameCardIndex: 3, isCommander: false, currentFace: "front", cardInstanceId };
}

/** A card that never got a `cardInstanceId` — nothing at the table could tell it from its twins. */
function unidentifiedCard(): GameCard {
  const { cardInstanceId, ...rest } = gameCard();
  return rest;
}

const seat: TableSeat = { tableId: "table-9", seatId: "seat-abc", playerName: "Jess", sessionId: "session-1" };

function adapterWithGateway(): { adapter: HttpSpineAdapter; gateway: RecordingSpineGateway } {
  const gateway = new RecordingSpineGateway();
  return { adapter: new HttpSpineAdapter(gateway), gateway };
}

describe("SpineAdapter join translation", () => {
  it("turns a JoinTableRequest into the Spine's /join body — tableName becomes name, decoration is flattened in", async () => {
    const { adapter, gateway } = adapterWithGateway();

    await adapter.join({
      gameId: "game-1",
      tableName: "Friday Night",
      playerName: "Jess",
      deckName: "Test Deck",
      gameUrl: "https://shuffler.test/game/game-1",
      playmatImageUrl: "https://shuffler.test/images/playmats/a.png",
      cardBackImageUrl: "https://shuffler.test/back.png",
      primaryColor: "#111111",
      secondaryColor: "#222222",
    });

    expect(gateway.joinRequests[0]).toEqual({
      gameId: "game-1",
      name: "Friday Night",
      playerName: "Jess",
      deckName: "Test Deck",
      gameUrl: "https://shuffler.test/game/game-1",
      playmatImageUrl: "https://shuffler.test/images/playmats/a.png",
      cardBackImageUrl: "https://shuffler.test/back.png",
      sleeveColor: undefined,
      primaryColor: "#111111",
      secondaryColor: "#222222",
      commanders: undefined,
    });
  });

  it("a sleeve wins over the card back — only one of the two crosses the wire", async () => {
    const { adapter, gateway } = adapterWithGateway();

    await adapter.join({
      gameId: "game-2",
      tableName: "Friday Night",
      playerName: "Jess",
      deckName: "Test Deck",
      gameUrl: "https://shuffler.test/game/game-2",
      cardBackImageUrl: "https://shuffler.test/back.png",
      sleeveColor: "#8b2f5c",
    });

    expect(gateway.joinRequests[0].sleeveColor).toBe("#8b2f5c");
    expect(gateway.joinRequests[0].cardBackImageUrl).toBeUndefined();
  });

  it("translates commander GameCards into seat decoration, with a back image only for a two-faced card", async () => {
    const { adapter, gateway } = adapterWithGateway();

    await adapter.join({
      gameId: "game-3",
      tableName: "Friday Night",
      playerName: "Jess",
      deckName: "Test Deck",
      gameUrl: "https://shuffler.test/game/game-3",
      commanders: [gameCard(lightningBolt, "i-1"), gameCard(nicolBolas, "i-2")],
    });

    const { commanders } = gateway.joinRequests[0];
    expect(commanders).toHaveLength(2);
    expect(commanders![0].card).toEqual({ scryfallId: lightningBolt.scryfallId, instanceId: "i-1" });
    expect(commanders![0].cardName).toBe(lightningBolt.name);
    expect(commanders![0].backImageUrl).toBeNull();
    expect(commanders![1].backImageUrl).toContain("/back/");
  });

  it("refuses a commander with no cardInstanceId rather than sending an unidentifiable card", async () => {
    const { adapter } = adapterWithGateway();

    await expect(
      adapter.join({
        gameId: "game-4",
        tableName: "Friday Night",
        playerName: "Jess",
        deckName: "Test Deck",
        gameUrl: "https://shuffler.test/game/game-4",
        commanders: [unidentifiedCard()],
      })
    ).rejects.toThrow(/no cardInstanceId/);
  });

  it("answers in the Shuffler's own words — a seat at a table, not a response body", async () => {
    const { adapter } = adapterWithGateway();

    const result = await adapter.join({
      gameId: "game-5",
      tableName: "Friday Night",
      playerName: "Jess",
      deckName: "Test Deck",
      gameUrl: "https://shuffler.test/game/game-5",
    });

    expect(result).toEqual({ tableId: "table-9", seatId: "seat-abc", seatNumber: 2, tableUrl: "http://table.test/t/friday" });
  });
});

describe("SpineAdapter announcements", () => {
  it("announceCardPlayed builds card.played addressed to the seat's table, carrying the session id", async () => {
    const { adapter, gateway } = adapterWithGateway();

    await adapter.announceCardPlayed(seat, gameCard(), "stack", false);

    expect(gateway.sentEvents).toHaveLength(1);
    const { tableId, event } = gateway.sentEvents[0];
    expect(tableId).toBe("table-9");
    expect(event.name).toBe("card.played");
    expect(event.tableId).toBe("table-9");
    expect(event.initiator).toEqual({ seatId: "seat-abc", playerName: "Jess", sessionId: "session-1" });
    expect(event.payload).toMatchObject({ card: { scryfallId: lightningBolt.scryfallId, instanceId: "instance-1" }, zoneHint: "stack", owner: "seat-abc" });
  });

  it("announceCardPlayed with faceDown builds the separate card.played-face-down kind", async () => {
    const { adapter, gateway } = adapterWithGateway();

    await adapter.announceCardPlayed(seat, gameCard(), "stack", true);

    expect(gateway.sentEvents[0].event.name).toBe("card.played-face-down");
  });

  it("announceCardReturned builds card.returned, carrying the gameCardIndex the Shuffler needs back", async () => {
    const { adapter, gateway } = adapterWithGateway();

    await adapter.announceCardReturned(seat, gameCard());

    const { event } = gateway.sentEvents[0];
    expect(event.name).toBe("card.returned");
    expect(event.occurredIn).toBe("shuffler");
    expect(event.payload).toMatchObject({ gameCardIndex: 3, seat: "seat-abc" });
  });

  it("announceCardDiscarded builds card.discarded, which carries no zoneHint at all", async () => {
    const { adapter, gateway } = adapterWithGateway();

    await adapter.announceCardDiscarded(seat, gameCard());

    const { event } = gateway.sentEvents[0];
    expect(event.name).toBe("card.discarded");
    expect(event.payload).not.toHaveProperty("zoneHint");
  });

  it("refuses a card with no cardInstanceId — the table could not tell which copy it was", async () => {
    const { adapter, gateway } = adapterWithGateway();

    await expect(adapter.announceCardReturned(seat, unidentifiedCard())).rejects.toThrow(/no cardInstanceId/);
    expect(gateway.sentEvents).toHaveLength(0);
  });
});
