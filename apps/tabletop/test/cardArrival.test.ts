import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import { startServer } from "../src/server/server";
import { getRoomRegistry } from "../src/server/rooms";
import { playmatBounds, graveyardBounds, stackBounds } from "../src/server/cardLayout";

/**
 * A5/JES-140: POST /api/tables/:tableName/cards — the seam the Spine absorbs.
 * Dedup on event id AND on instanceId; lands go to the player's playmat,
 * everything else to the stack; discards to the graveyard box.
 *
 * These tests post cards WITHOUT a prior seat.joined, exercising
 * handleCardArrival's defensive fallback (ensurePlayerArea is idempotent and
 * seat.joined normally runs first — see seatJoined.test.ts for that path).
 */
let server: Server;
let port: number;

beforeAll(async () => {
  server = await startServer(0);
  const address = server.address();
  if (typeof address === "object" && address) port = address.port;
});

afterAll(() => {
  server.close();
});

let eventCounter = 0;
function cardPlayed(overrides: Record<string, unknown> = {}) {
  eventCounter++;
  return {
    id: `event-${eventCounter}-${Math.random().toString(36).slice(2)}`,
    name: "card.played",
    occurredAt: new Date().toISOString(),
    initiator: { seatId: "seat-1", playerName: "Jess" },
    card: { scryfallId: "11111111-2222-3333-4444-555555555555", instanceId: `instance-${eventCounter}` },
    face: "front",
    zoneHint: "stack",
    frontImageUrl: "https://cards.scryfall.io/normal/front/1/1/11111111.jpg",
    backImageUrl: null,
    cardName: "Lightning Bolt",
    ...overrides,
  };
}

async function post(tableName: string, body: unknown): Promise<Response> {
  return fetch(`http://localhost:${port}/api/tables/${tableName}/cards`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function shapesOf(tableName: string) {
  const entry = getRoomRegistry().get(tableName);
  if (!entry) return [];
  return entry.room
    .getCurrentSnapshot()
    .documents.map((d) => d.state as any)
    .filter((r) => r.typeName === "shape" && r.type === "mtg-card" && r.props?.instanceId);
}

describe("card arrival", () => {
  it("puts a stack-hinted card in the stack strip with identity props", async () => {
    const event = cardPlayed();
    const response = await post("arrival-basic", event);
    expect(response.status).toBe(201);

    const shapes = shapesOf("arrival-basic");
    expect(shapes).toHaveLength(1);
    expect(shapes[0].props).toMatchObject({
      instanceId: event.card.instanceId,
      scryfallId: event.card.scryfallId,
      cardName: "Lightning Bolt",
      frontImageUrl: event.frontImageUrl,
      backImageUrl: null,
      face: "front",
      tapped: false,
    });
    const stack = stackBounds();
    expect(shapes[0].x).toBeGreaterThanOrEqual(stack.x);
    expect(shapes[0].y).toBeGreaterThanOrEqual(stack.y);
    // no index anywhere in what the tabletop stores
    expect(JSON.stringify(shapes[0].meta)).not.toContain("Index");
  });

  it("dedups a retried request (same event id): physical no-op", async () => {
    const event = cardPlayed();
    await post("arrival-dedup-id", event);
    const retry = await post("arrival-dedup-id", event);
    expect(retry.status).toBe(200);
    expect((await retry.json()).deduped).toBe(true);
    expect(shapesOf("arrival-dedup-id")).toHaveLength(1);
  });

  it("dedups a retried play (same instanceId, new event id): one instance exists once", async () => {
    const event = cardPlayed();
    await post("arrival-dedup-instance", event);
    const replay = await post("arrival-dedup-instance", { ...cardPlayed(), card: event.card });
    expect(replay.status).toBe(200);
    expect((await replay.json()).deduped).toBe(true);
    expect(shapesOf("arrival-dedup-instance")).toHaveLength(1);
  });

  it("puts a battlefield-hinted card (a land) on the player's playmat", async () => {
    await post("arrival-zones", cardPlayed({ zoneHint: "battlefield", cardName: "Forest" }));
    const [land] = shapesOf("arrival-zones");
    const mat = playmatBounds(0);
    expect(land.y).toBeGreaterThanOrEqual(mat.y + mat.h / 2); // bottom half of the playmat

    await post("arrival-zones", cardPlayed({ zoneHint: "stack", cardName: "Llanowar Elves" }));
    const stackCard = shapesOf("arrival-zones").find((s) => s.props.cardName === "Llanowar Elves")!;
    expect(stackCard.y).toBeLessThan(land.y); // the centered Stack sits above the S seat's playmat
  });

  it("allocates player areas per seatId in join order, keyed by seat not name", async () => {
    await post("arrival-rows", cardPlayed({ zoneHint: "battlefield", initiator: { seatId: "seat-A", playerName: "Sam" } }));
    await post("arrival-rows", cardPlayed({ zoneHint: "battlefield", initiator: { seatId: "seat-B", playerName: "Sam" } }));
    const shapes = shapesOf("arrival-rows");
    expect(shapes).toHaveLength(2);
    // Same display name, different seats, different player areas. S and N
    // share an x (both centered on the Stack), so compare full positions.
    expect({ x: shapes[0].x, y: shapes[0].y }).not.toEqual({ x: shapes[1].x, y: shapes[1].y });
  });

  it("puts a graveyard-hinted card in the player's graveyard box", async () => {
    await post("arrival-graveyard", cardPlayed({ zoneHint: "graveyard", cardName: "Doomed Dissenter" }));
    const [card] = shapesOf("arrival-graveyard");
    const graveyard = graveyardBounds(0);
    expect(card.x).toBeGreaterThanOrEqual(graveyard.x);
  });

  it("bakes the seat's sleeve color into the minted card's props (ticket 17)", async () => {
    // Seat joins with a sleeve first — sleeve color is seat data, not payload data.
    await fetch(`http://localhost:${port}/api/tables/arrival-sleeved/events`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: "sleeve-seat-event",
        name: "seat.joined",
        occurredAt: new Date().toISOString(),
        initiator: { seatId: "seat-sleeved", playerName: "Jess" },
        deckName: "Blame Game",
        sleeveColor: "#8b2f5c",
      }),
    });

    await post("arrival-sleeved", cardPlayed({ initiator: { seatId: "seat-sleeved", playerName: "Jess" } }));
    const [card] = shapesOf("arrival-sleeved");
    expect(card.props.sleeveColor).toBe("#8b2f5c");
  });

  it("an unsleeved seat's cards mint with sleeveColor null (today's look)", async () => {
    await post("arrival-unsleeved", cardPlayed());
    const [card] = shapesOf("arrival-unsleeved");
    expect(card.props.sleeveColor).toBeNull();
  });

  it("rejects a payload missing required fields (JES-128 validation point)", async () => {
    const response = await post("arrival-invalid", { name: "card.played" });
    expect(response.status).toBe(400);
  });

  it("rejects a payload carrying a gameCardIndex — the secret must not cross", async () => {
    const response = await post("arrival-secret", { ...cardPlayed(), gameCardIndex: 7 });
    expect(response.status).toBe(400);
  });
});
