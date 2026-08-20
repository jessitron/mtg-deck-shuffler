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
});
