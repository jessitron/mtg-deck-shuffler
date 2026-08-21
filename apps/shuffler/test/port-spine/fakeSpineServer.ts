import { randomUUID } from "node:crypto";
import http from "node:http";

/** W3C traceparent, syntactically valid but otherwise meaningless — good enough for a test envelope. */
export function fakeTraceparent(): string {
  return `00-${randomUUID().replace(/-/g, "")}-${randomUUID().replace(/-/g, "").slice(0, 16)}-01`;
}

export function cardReturnedEvent(tableId: string, gameCardIndex: number, scryfallId: string, overrides: Record<string, unknown> = {}) {
  return {
    id: randomUUID(),
    tableId,
    name: "card.returned",
    occurredAt: new Date().toISOString(),
    initiator: { seatId: "seat-0000001", playerName: "Jess" },
    occurredIn: "tabletop",
    origin: "tabletop.cardShapeHook",
    significance: "domain",
    traceparent: fakeTraceparent(),
    schemaVersion: 1,
    payload: {
      card: { scryfallId },
      gameCardIndex,
      seat: "seat-0000001",
      fromZone: "battlefield",
    },
    ...overrides,
  };
}

export async function waitUntil(predicate: () => boolean | Promise<boolean>, timeoutMs = 5000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error("timed out waiting for condition");
}

/**
 * A minimal fake SSE server standing in for the Spine's `GET /tables/:tableId/events/stream`,
 * mirroring `apps/tabletop/test/spineSubscriber.test.ts`'s fake server (including the Spine's
 * heartbeat behavior, `services/spine/lib/sse_stream.rb`).
 */
export function createFakeSpineServer() {
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
    connectionCount(): number {
      return clients.length;
    },
    connectionsAcceptedCount(): number {
      return connectionsAccepted;
    },
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
