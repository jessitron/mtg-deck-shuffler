import { validateIncomingEvent } from "../../../src/port-spine/events/incomingEventValidation.js";

function cardReturned(schemaVersion: number, card: Record<string, unknown>) {
  return {
    id: "55555555-5555-5555-5555-555555555555",
    tableId: "some-table-id",
    name: "card.returned",
    initiator: { seatId: "seat-1", playerName: "Jess" },
    occurredIn: "tabletop",
    origin: "tabletop.cardShapeHook",
    significance: "domain",
    seq: 4,
    schemaVersion,
    payload: { card, gameCardIndex: 0, seat: "seat-1" },
  };
}

const definitionId = "e6f2c1a4-2222-4a22-9e33-000000000002";

describe("validateIncomingEvent (card.returned from the Spine)", () => {
  it("accepts a v2 card.returned and hands back its cardDefinitionId", () => {
    const result = validateIncomingEvent<{ card: { cardDefinitionId: string } }>(
      cardReturned(2, { cardDefinitionId: definitionId }),
      "card.returned"
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.envelope.payload.card.cardDefinitionId).toBe(definitionId);
  });

  it("rejects a v1 card.returned, which named the card scryfallId, without throwing", () => {
    const result = validateIncomingEvent(cardReturned(1, { scryfallId: definitionId }), "card.returned");
    expect(result).toEqual({ ok: false, error: 'unknown schemaVersion 1 for "card.returned"' });
  });

  it("rejects a v2 card.returned whose card still says scryfallId", () => {
    const result = validateIncomingEvent(cardReturned(2, { scryfallId: definitionId }), "card.returned");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("cardDefinitionId");
  });
});
