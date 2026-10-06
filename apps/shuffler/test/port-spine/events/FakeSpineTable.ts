import { randomUUID } from "node:crypto";
import { OpenSpineStream, SpineStreamGateway, SpineStreamHandlers } from "../../../src/port-spine/events/HttpSpineStreamGateway.js";

/** W3C traceparent, syntactically valid but otherwise meaningless — good enough for a test envelope. */
export function fakeTraceparent(): string {
  return `00-${randomUUID().replace(/-/g, "")}-${randomUUID().replace(/-/g, "").slice(0, 16)}-01`;
}

export function cardReturnedEvent(tableId: string, gameCardIndex: number, cardDefinitionId: string, overrides: Record<string, unknown> = {}) {
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
    schemaVersion: 2,
    payload: {
      card: { cardDefinitionId },
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

interface FakeClient {
  handlers: SpineStreamHandlers;
}

export interface FakeSpineTable extends SpineStreamGateway {
  /** Mints an ever-increasing `seq` and broadcasts to every open connection — mirroring the Spine's own assign-on-append, so a later connection carrying `lastEventId` can be replayed exactly what it missed. */
  publish(event: unknown): void;
  connectionCount(): number;
  connectionsAcceptedCount(): number;
  /** `lastEventId` seen on each accepted connection, in order — `undefined` where absent (a fresh subscription's first attempt). */
  lastEventIdsSeen(): Array<number | undefined>;
  /** Drops every open connection, as `onDrop` — simulating the Spine's stream breaking mid-read. */
  dropConnections(): void;
  close(): void;
}

/**
 * A scriptable in-memory double standing in for the Spine's whole per-table SSE broadcast —
 * multiple `openStream()` calls (one per game's `followTable`), fanning a single `publish()`
 * out to every live connection, with replay-on-connect for whatever a `lastEventId` missed.
 * No socket, no HTTP: this is the multi-connection test-harness analog of
 * `src/port-spine/events/FakeSpineStreamGateway.ts`, which models a single attempt.
 */
export function createFakeSpineTable(): FakeSpineTable {
  let clients: FakeClient[] = [];
  let connectionsAccepted = 0;
  let nextSeq = 1;
  const publishedEvents: Array<{ seq: number; event: unknown }> = [];
  const lastEventIdsSeen: Array<number | undefined> = [];

  return {
    openStream(_tableId: string, lastEventId: number | undefined, handlers: SpineStreamHandlers): OpenSpineStream {
      connectionsAccepted++;
      lastEventIdsSeen.push(lastEventId);
      const client: FakeClient = { handlers };
      clients.push(client);
      handlers.onOpen();
      for (const stored of publishedEvents) {
        if (lastEventId === undefined || stored.seq > lastEventId) handlers.onFrame({ event: stored.event });
      }
      return {
        close(): void {
          clients = clients.filter((c) => c !== client);
        },
      };
    },
    publish(event: unknown): void {
      const seq = nextSeq++;
      const stamped = { ...(event as Record<string, unknown>), seq };
      publishedEvents.push({ seq, event: stamped });
      for (const client of clients) client.handlers.onFrame({ event: stamped });
    },
    connectionCount(): number {
      return clients.length;
    },
    connectionsAcceptedCount(): number {
      return connectionsAccepted;
    },
    lastEventIdsSeen(): Array<number | undefined> {
      return lastEventIdsSeen;
    },
    dropConnections(): void {
      for (const client of clients.splice(0)) client.handlers.onDrop(new Error("fake spine table: connection dropped"));
    },
    close(): void {
      for (const client of clients.splice(0)) client.handlers.onDrop(new Error("fake spine table: closed"));
    },
  };
}
