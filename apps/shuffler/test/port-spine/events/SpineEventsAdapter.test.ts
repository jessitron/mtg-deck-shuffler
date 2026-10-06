import { EventEnvelope } from "../../../src/port-tabletop/types.js";
import { HttpSpineEventsAdapter } from "../../../src/port-spine/events/HttpSpineEventsAdapter.js";
import { SpineEventsGateway } from "../../../src/port-spine/events/HttpSpineEventsGateway.js";
import { TableSeat } from "../../../src/port-spine/events/types.js";
import { GameCard } from "../../../src/domain-types.js";
import { lightningBolt } from "../../generators.js";

/** A table log that only remembers. The adapter is what's under test; this stands in for the wire. */
class RecordingSpineEventsGateway implements SpineEventsGateway {
  public readonly sentEvents: { tableId: string; event: EventEnvelope<unknown> }[] = [];

  async sendEvent(tableId: string, event: EventEnvelope<unknown>): Promise<void> {
    this.sentEvents.push({ tableId, event });
  }
}

function gameCard(card = lightningBolt, cardInstanceId = "instance-1"): GameCard {
  return { card, location: { type: "Hand", position: 0 }, gameCardIndex: 3, isCommander: false, currentFace: "front", cardInstanceId };
}

/** A card that never got a `cardInstanceId` — nothing at the table could tell it from its twins. */
function unidentifiedCard(): GameCard {
  const { cardInstanceId, ...rest } = gameCard();
  return rest;
}

const seat: TableSeat = { tableId: "table-9", seatId: "seat-abc", playerName: "Jess", sessionId: "session-1" };

function adapterWithGateway(): { adapter: HttpSpineEventsAdapter; gateway: RecordingSpineEventsGateway } {
  const gateway = new RecordingSpineEventsGateway();
  return { adapter: new HttpSpineEventsAdapter(gateway), gateway };
}

describe("SpineEventsAdapter announcements", () => {
  it("announceCardPlayed builds card.played addressed to the seat's table, carrying the session id", async () => {
    const { adapter, gateway } = adapterWithGateway();

    await adapter.announceCardPlayed(seat, gameCard(), false);

    expect(gateway.sentEvents).toHaveLength(1);
    const { tableId, event } = gateway.sentEvents[0];
    expect(tableId).toBe("table-9");
    expect(event.name).toBe("card.played");
    expect(event.tableId).toBe("table-9");
    expect(event.initiator).toEqual({ seatId: "seat-abc", playerName: "Jess", sessionId: "session-1" });
    expect(event.payload).toMatchObject({ card: { cardDefinitionId: lightningBolt.cardDefinitionId, instanceId: "instance-1" }, owner: "seat-abc" });
  });

  it("announceCardPlayed with faceDown builds the separate card.played-face-down kind", async () => {
    const { adapter, gateway } = adapterWithGateway();

    await adapter.announceCardPlayed(seat, gameCard(), true);

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

  it("announceCardDiscarded builds card.discarded", async () => {
    const { adapter, gateway } = adapterWithGateway();

    await adapter.announceCardDiscarded(seat, gameCard());

    const { event } = gateway.sentEvents[0];
    expect(event.name).toBe("card.discarded");
  });

  it("refuses a card with no cardInstanceId — the table could not tell which copy it was", async () => {
    const { adapter, gateway } = adapterWithGateway();

    await expect(adapter.announceCardReturned(seat, unidentifiedCard())).rejects.toThrow(/no cardInstanceId/);
    expect(gateway.sentEvents).toHaveLength(0);
  });
});
