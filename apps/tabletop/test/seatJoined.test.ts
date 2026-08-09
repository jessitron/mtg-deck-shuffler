import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import { startServer } from "../src/server/server";
import { getRoomRegistry } from "../src/server/rooms";
import { playmatBounds, libraryBounds, commandZoneBounds, graveyardBounds, exileBounds, stackBounds } from "../src/server/cardLayout";

/**
 * JES-140: POST /api/tables/:tableName/events (seat.joined) — the player area
 * (playmat, library, graveyard, exile, name label) is drawn at Shuffle Up,
 * before any card arrives. Seats take compass slots (S, N, E, W by join
 * order) around a fixed centered Stack square (ticket 14, the square).
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
function seatJoined(overrides: Record<string, unknown> = {}) {
  eventCounter++;
  return {
    id: `seat-event-${eventCounter}-${Math.random().toString(36).slice(2)}`,
    name: "seat.joined",
    occurredAt: new Date().toISOString(),
    initiator: { seatId: `seat-${eventCounter}`, playerName: "Jess" },
    playmatImageUrl: "https://example.com/playmat.png",
    cardBackImageUrl: "https://example.com/card-back.jpg",
    ...overrides,
  };
}

async function post(tableName: string, body: unknown): Promise<Response> {
  return fetch(`http://localhost:${port}/api/tables/${tableName}/events`, {
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
    .filter((r) => r.typeName === "shape");
}

describe("seat joined", () => {
  it("draws a full player area — playmat, library, command zone, graveyard, exile, name label — before any card", async () => {
    const event = seatJoined();
    const response = await post("seat-basic", event);
    expect(response.status).toBe(201);

    const shapes = shapesOf("seat-basic");
    const mat = playmatBounds(0);
    const library = libraryBounds(0);
    const command = commandZoneBounds(0);
    const graveyard = graveyardBounds(0);
    const exile = exileBounds(0);

    expect(shapes.some((s) => s.x === mat.x && s.y === mat.y)).toBe(true);
    expect(shapes.some((s) => s.x === library.x && s.y === library.y)).toBe(true);
    expect(
      shapes.some((s) => s.type === "mtg-zone" && s.props?.zone === "command" && s.x === command.x && s.y === command.y && s.props?.w === command.w)
    ).toBe(true);
    expect(shapes.some((s) => s.x === graveyard.x && s.y === graveyard.y && s.props?.w === graveyard.w && s.props?.h === graveyard.h)).toBe(true);
    expect(shapes.some((s) => s.x === exile.x && s.y === exile.y && s.props?.w === exile.w && s.props?.h === exile.h)).toBe(true);
    expect(shapes.some((s) => s.type === "text")).toBe(true);
  });

  it("dedups a retried request (same event id): physical no-op", async () => {
    const event = seatJoined();
    await post("seat-dedup-id", event);
    const retry = await post("seat-dedup-id", event);
    expect(retry.status).toBe(200);
    expect((await retry.json()).deduped).toBe(true);
  });

  it("dedups a seat that already joined (fresh event id): a second seat.joined is a no-op", async () => {
    const event = seatJoined();
    await post("seat-dedup-seat", event);
    const secondAttempt = await post("seat-dedup-seat", { ...seatJoined(), initiator: event.initiator });
    expect(secondAttempt.status).toBe(200);
    expect((await secondAttempt.json()).deduped).toBe(true);
  });

  it("missing playmatImageUrl degrades to a plain mat, not a broken player area", async () => {
    const event = seatJoined({ playmatImageUrl: undefined, cardBackImageUrl: undefined });
    const response = await post("seat-no-image", event);
    expect(response.status).toBe(201);

    const shapes = shapesOf("seat-no-image");
    const mat = playmatBounds(0);
    // The mat outline is still drawn; no image shape was created for it.
    expect(shapes.some((s) => s.x === mat.x && s.y === mat.y && s.type === "mtg-zone")).toBe(true);
    expect(shapes.some((s) => s.type === "image")).toBe(false);
  });

  it("seats 1-4 take compass slots S, N, E, W by join order, and existing seats never move", async () => {
    const table = "seat-square";
    const positionsAfterEachJoin: Array<Array<{ x: number; y: number }>> = [];
    for (const seat of ["A", "B", "C", "D"]) {
      await post(table, seatJoined({ initiator: { seatId: `seat-sq-${seat}`, playerName: seat } }));
      positionsAfterEachJoin.push(
        shapesOf(table)
          .filter((s) => s.type === "mtg-zone" && s.props?.zone === "playmat")
          .map((s) => ({ x: s.x, y: s.y }))
      );
    }

    // Each seat's playmat lands at its compass slot's coordinates.
    const mats = positionsAfterEachJoin[3];
    for (let seat = 0; seat < 4; seat++) {
      const expected = playmatBounds(seat);
      expect(mats, `seat ${seat} playmat at its compass slot`).toContainEqual({ x: expected.x, y: expected.y });
    }

    // A new seat joining never moves the seats already at the table.
    for (let join = 1; join < 4; join++) {
      for (const earlier of positionsAfterEachJoin[join - 1]) {
        expect(positionsAfterEachJoin[join], `join ${join + 1} moved an existing playmat`).toContainEqual(earlier);
      }
    }
  });

  it("draws the Stack as a fixed centered square that does not change as seats join", async () => {
    const expected = stackBounds();
    await post("seat-stack-fixed", seatJoined({ initiator: { seatId: "seat-fixed-A", playerName: "Sam" } }));
    const afterOne = shapesOf("seat-stack-fixed").find((s) => s.props?.label === "The Stack");
    expect({ x: afterOne.x, y: afterOne.y, w: afterOne.props.w, h: afterOne.props.h }).toEqual(expected);

    await post("seat-stack-fixed", seatJoined({ initiator: { seatId: "seat-fixed-B", playerName: "Alex" } }));
    const afterTwo = shapesOf("seat-stack-fixed").find((s) => s.props?.label === "The Stack");
    expect({ x: afterTwo.x, y: afterTwo.y, w: afterTwo.props.w, h: afterTwo.props.h }).toEqual(expected);
  });

  it("keeps the Stack shape's z-order index stable across seat joins, instead of minting a fresh one", async () => {
    await post("seat-stack-index", seatJoined({ initiator: { seatId: "seat-index-A", playerName: "Sam" } }));
    const afterOne = shapesOf("seat-stack-index").find((s) => s.props?.label === "The Stack");

    await post("seat-stack-index", seatJoined({ initiator: { seatId: "seat-index-B", playerName: "Alex" } }));
    const afterTwo = shapesOf("seat-stack-index").find((s) => s.props?.label === "The Stack");

    expect(afterTwo.index).toBe(afterOne.index);
  });

  it("rejects a payload missing required fields", async () => {
    const response = await post("seat-invalid", { name: "seat.joined" });
    expect(response.status).toBe(400);
  });

  it("rejects a payload carrying a gameCardIndex — the secret must not cross", async () => {
    const response = await post("seat-secret", { ...seatJoined(), gameCardIndex: 7 });
    expect(response.status).toBe(400);
  });
});
