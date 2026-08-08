import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import { startServer } from "../src/server/server";
import { getRoomRegistry } from "../src/server/rooms";
import { playmatBounds, libraryBounds, graveyardBounds, exileBounds, stackStripBounds } from "../src/server/cardLayout";

/**
 * JES-140: POST /api/tables/:tableName/events (seat.joined) — the player area
 * (playmat, library, graveyard, exile, name label) is drawn at Shuffle Up,
 * before any card arrives, and the Stack strip widens as each seat joins.
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
  it("draws a full player area — playmat, library, graveyard, exile, name label — before any card", async () => {
    const event = seatJoined();
    const response = await post("seat-basic", event);
    expect(response.status).toBe(201);

    const shapes = shapesOf("seat-basic");
    const mat = playmatBounds(0);
    const library = libraryBounds(0);
    const graveyard = graveyardBounds(0);
    const exile = exileBounds(0);

    expect(shapes.some((s) => s.x === mat.x && s.y === mat.y)).toBe(true);
    expect(shapes.some((s) => s.x === library.x && s.y === library.y)).toBe(true);
    expect(shapes.some((s) => s.x === graveyard.x && s.y === graveyard.y)).toBe(true);
    expect(shapes.some((s) => s.x === exile.x && s.y === exile.y)).toBe(true);
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

  it("places the second seat's player area to the right of the first", async () => {
    await post("seat-row", seatJoined({ initiator: { seatId: "seat-row-A", playerName: "Sam" } }));
    await post("seat-row", seatJoined({ initiator: { seatId: "seat-row-B", playerName: "Alex" } }));

    const first = playmatBounds(0);
    const second = playmatBounds(1);
    const shapes = shapesOf("seat-row");
    expect(shapes.some((s) => s.x === first.x)).toBe(true);
    expect(shapes.some((s) => s.x === second.x)).toBe(true);
  });

  it("widens the Stack strip as each seat joins", async () => {
    await post("seat-stack-widen", seatJoined({ initiator: { seatId: "seat-widen-A", playerName: "Sam" } }));
    const afterOne = shapesOf("seat-stack-widen").find((s) => s.props?.label === "The Stack");
    const oneSeatBounds = stackStripBounds(1);
    expect(afterOne.props.w).toBe(oneSeatBounds.w);

    await post("seat-stack-widen", seatJoined({ initiator: { seatId: "seat-widen-B", playerName: "Alex" } }));
    const afterTwo = shapesOf("seat-stack-widen").find((s) => s.props?.label === "The Stack");
    const twoSeatBounds = stackStripBounds(2);
    expect(afterTwo.props.w).toBe(twoSeatBounds.w);
    expect(afterTwo.props.w).toBeGreaterThan(afterOne.props.w);
  });

  it("preserves the Stack shape's z-order index as it widens, instead of minting a fresh one", async () => {
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
