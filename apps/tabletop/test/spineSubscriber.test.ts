import { describe, it, expect, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import http from "node:http";
import { Agent } from "undici";
import { subscribeToSpine, SpineSubscription } from "../src/server/spineSubscriber";
import { dispatchSpineEvent } from "../src/server/spineEventDispatch";
import { getOrCreateRoom, getRoomRegistry } from "../src/server/rooms";
import { ensurePlayerArea, pageIdOf } from "../src/server/tableFurniture";
import { slugFor } from "./support/tableSlug";

/** card.played has no seat-creating self-heal — seat this seat first, the way seat.joined would. */
async function seatUp(tableName: string, seatId: string, playerName: string): Promise<void> {
  const entry = getOrCreateRoom(slugFor(tableName));
  await ensurePlayerArea(entry, pageIdOf(entry), seatId, playerName);
}

function fakeTraceparent(): string {
  return `00-${randomUUID().replace(/-/g, "")}-${randomUUID().replace(/-/g, "").slice(0, 16)}-01`;
}

function cardPlayedEvent(tableName: string, overrides: Record<string, unknown> = {}) {
  const initiator = { seatId: "seat-0000001", playerName: "Jess" };
  return {
    id: randomUUID(),
    tableId: slugFor(tableName),
    name: "card.played",
    occurredAt: new Date().toISOString(),
    initiator,
    occurredIn: "shuffler",
    origin: "shuffler.playCardSubmit",
    significance: "domain",
    traceparent: fakeTraceparent(),
    schemaVersion: 1,
    payload: {
      card: { scryfallId: "11111111-1111-4111-8111-111111111111", instanceId: randomUUID() },
      face: "front",
      zoneHint: "stack",
      frontImageUrl: "https://cards.scryfall.io/normal/front/1/1/11111111.jpg",
      backImageUrl: null,
      cardName: "Lightning Bolt",
      owner: initiator.seatId,
      isCommander: false,
    },
    ...overrides,
  };
}

function shapesOf(tableName: string) {
  const entry = getRoomRegistry().get(slugFor(tableName));
  if (!entry) return [];
  return entry.room
    .getCurrentSnapshot()
    .documents.map((d) => d.state as any)
    .filter((r) => r.typeName === "shape" && r.type === "mtg-card" && r.props?.instanceId);
}

async function waitUntil(predicate: () => boolean, timeoutMs = 5000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error("timed out waiting for condition");
}

/**
 * A minimal fake SSE server standing in for the Spine's `GET /tables/:tableId/events/stream`,
 * including its heartbeat behavior (`services/spine/lib/sse_stream.rb`): a `: heartbeat\n\n`
 * comment frame flushed immediately on connect (so headers arrive without waiting for a card to
 * be played), plus more on demand here via `sendHeartbeat()`.
 */
function createFakeSpineServer() {
  let clients: http.ServerResponse[] = [];
  let connectionsAccepted = 0;
  const server = http.createServer((req, res) => {
    connectionsAccepted++;
    res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
    res.write(": heartbeat\n\n");
    clients.push(res);
    req.on("close", () => {
      clients = clients.filter((c) => c !== res);
    });
  });

  return {
    publish(event: unknown): void {
      const frame = `data: ${JSON.stringify({ event })}\n\n`;
      for (const res of clients) res.write(frame);
    },
    sendHeartbeat(): void {
      for (const res of clients) res.write(": heartbeat\n\n");
    },
    connectionCount(): number {
      return clients.length;
    },
    /** Total connections accepted over the server's lifetime — distinguishes "still connected" from "reconnected but count looks the same". */
    connectionsAcceptedCount(): number {
      return connectionsAccepted;
    },
    /** Simulates a network blip: force-closes every open connection without telling the client why. */
    dropConnections(): void {
      for (const res of clients.splice(0)) res.destroy();
    },
    listen(): Promise<number> {
      return new Promise((resolve) => {
        server.listen(0, () => {
          const address = server.address();
          resolve(typeof address === "object" && address ? address.port : 0);
        });
      });
    },
    close(): Promise<void> {
      for (const res of clients.splice(0)) res.destroy();
      return new Promise((resolve) => server.close(() => resolve()));
    },
  };
}

describe("Spine SSE subscriber", () => {
  let subscription: SpineSubscription | undefined;
  let fakeServer: ReturnType<typeof createFakeSpineServer> | undefined;

  afterEach(async () => {
    subscription?.close();
    subscription = undefined;
    await fakeServer?.close();
    fakeServer = undefined;
  });

  it("places a card.played event received over the stream, same as the HTTP-driven path", async () => {
    fakeServer = createFakeSpineServer();
    const port = await fakeServer.listen();
    const tableName = "sse-basic";
    const tableId = slugFor(tableName);

    subscription = subscribeToSpine(tableId, (event) => dispatchSpineEvent(tableId, event), `http://localhost:${port}`);
    await waitUntil(() => fakeServer!.connectionCount() === 1);
    await seatUp(tableName, "seat-0000001", "Jess");

    const event = cardPlayedEvent(tableName);
    fakeServer.publish(event);

    await waitUntil(() => shapesOf(tableName).length === 1);
    const [shape] = shapesOf(tableName);
    expect(shape.props.instanceId).toBe(event.payload.card.instanceId);
    expect(shape.props.cardName).toBe("Lightning Bolt");
    expect(shape.props.face).toBe("front");
  });

  it("ignores non-card.played kinds on the stream (e.g. seat.taken)", async () => {
    fakeServer = createFakeSpineServer();
    const port = await fakeServer.listen();
    const tableName = "sse-ignore-kind";
    const tableId = slugFor(tableName);

    subscription = subscribeToSpine(tableId, (event) => dispatchSpineEvent(tableId, event), `http://localhost:${port}`);
    await waitUntil(() => fakeServer!.connectionCount() === 1);
    await seatUp(tableName, "seat-0000001", "Jess");

    fakeServer.publish({ id: randomUUID(), name: "seat.taken", tableId, payload: {} });
    fakeServer.publish(cardPlayedEvent(tableName));

    await waitUntil(() => shapesOf(tableName).length === 1);
    expect(shapesOf(tableName)).toHaveLength(1);
  });

  it("dedups the same event id delivered twice: one card", async () => {
    fakeServer = createFakeSpineServer();
    const port = await fakeServer.listen();
    const tableName = "sse-dedup";
    const tableId = slugFor(tableName);

    subscription = subscribeToSpine(tableId, (event) => dispatchSpineEvent(tableId, event), `http://localhost:${port}`);
    await waitUntil(() => fakeServer!.connectionCount() === 1);
    await seatUp(tableName, "seat-0000001", "Jess");

    const event = cardPlayedEvent(tableName);
    fakeServer.publish(event);
    await waitUntil(() => shapesOf(tableName).length === 1);

    fakeServer.publish(event);
    await new Promise((r) => setTimeout(r, 150)); // give a would-be second placement time to land
    expect(shapesOf(tableName)).toHaveLength(1);
  });

  it("reconnects after a dropped connection and keeps placing cards, with no catch-up", async () => {
    fakeServer = createFakeSpineServer();
    const port = await fakeServer.listen();
    const tableName = "sse-reconnect";
    const tableId = slugFor(tableName);

    subscription = subscribeToSpine(tableId, (event) => dispatchSpineEvent(tableId, event), `http://localhost:${port}`);
    await waitUntil(() => fakeServer!.connectionCount() === 1);
    await seatUp(tableName, "seat-0000001", "Jess");

    const first = cardPlayedEvent(tableName);
    fakeServer.publish(first);
    await waitUntil(() => shapesOf(tableName).length === 1);

    fakeServer.dropConnections();
    await waitUntil(() => fakeServer!.connectionCount() === 1); // the subscriber reconnected on its own

    const second = cardPlayedEvent(tableName);
    fakeServer.publish(second);
    await waitUntil(() => shapesOf(tableName).length === 2);

    const instanceIds = shapesOf(tableName).map((s: any) => s.props.instanceId);
    expect(instanceIds).toContain(first.payload.card.instanceId);
    expect(instanceIds).toContain(second.payload.card.instanceId);
  });

  it("stays connected across heartbeats on a quiet table, but reconnects once they actually stop", async () => {
    // The dispatcher's timeouts are bounded now that the Spine sends heartbeats
    // (services/spine/lib/sse_stream.rb) — not disabled outright. This uses a short bodyTimeout,
    // scaled down from production's 45s, so both halves of that claim run fast: heartbeats
    // arriving faster than the timeout keep the same connection alive, and heartbeats actually
    // stopping (a genuinely hung Spine) still gets caught and reconnected.
    fakeServer = createFakeSpineServer();
    const port = await fakeServer.listen();
    const tableName = "sse-heartbeat";
    const tableId = slugFor(tableName);

    const shortDispatcher = new Agent({ headersTimeout: 5_000, bodyTimeout: 150 });
    subscription = subscribeToSpine(tableId, (event) => dispatchSpineEvent(tableId, event), `http://localhost:${port}`, shortDispatcher);
    await waitUntil(() => fakeServer!.connectionsAcceptedCount() === 1);
    await seatUp(tableName, "seat-0000001", "Jess");

    const heartbeatTimer = setInterval(() => fakeServer!.sendHeartbeat(), 50);
    try {
      await new Promise((r) => setTimeout(r, 400)); // several multiples of the 150ms bodyTimeout
      expect(fakeServer.connectionsAcceptedCount()).toBe(1); // never dropped and reconnected

      const event = cardPlayedEvent(tableName);
      fakeServer.publish(event);
      await waitUntil(() => shapesOf(tableName).length === 1);
    } finally {
      clearInterval(heartbeatTimer);
    }

    // Now let heartbeats actually stop — the real failure mode a hung Spine would produce.
    await waitUntil(() => fakeServer!.connectionsAcceptedCount() === 2, 2000);
  });
});
