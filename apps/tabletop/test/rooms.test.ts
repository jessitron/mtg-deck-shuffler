import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { WebSocket } from "ws";
import type { Server } from "node:http";
import { createShapeId } from "@tldraw/tlschema";
import { logs } from "@opentelemetry/api-logs";
import { LoggerProvider, InMemoryLogRecordExporter, SimpleLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { startServer } from "../src/server/server";
import { getRoomRegistry, getOrCreateRoom } from "../src/server/rooms";
import { mtgCardShape } from "../src/server/tableFurniture";

let server: Server;
let port: number;
let exportedLogs: InMemoryLogRecordExporter;

beforeAll(async () => {
  exportedLogs = new InMemoryLogRecordExporter();
  logs.setGlobalLoggerProvider(new LoggerProvider({ processors: [new SimpleLogRecordProcessor({ exporter: exportedLogs })] }));

  server = await startServer(0);
  const address = server.address();
  if (typeof address === "object" && address) port = address.port;
});

afterAll(() => {
  server.close();
  logs.disable();
});

/** Poll until the predicate holds; tldraw's session pruning is throttled, so this can take a beat. */
async function waitUntil(predicate: () => boolean, timeoutMs = 10_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error("timed out waiting for condition");
}

function logsFor(body: string, tableName: string) {
  return exportedLogs.getFinishedLogRecords().filter((r) => r.body === body && r.attributes["table.name"] === tableName);
}

function connect(slug: string, sessionId: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${port}/connect/${slug}?sessionId=${sessionId}`);
    ws.on("open", () => resolve(ws));
    ws.on("error", reject);
  });
}

describe("room registry", () => {
  it("two ws clients on the same table name share one room", async () => {
    const one = await connect("friday-night", "session-1");
    const two = await connect("friday-night", "session-2");

    // give the room a beat to register both sessions
    await new Promise((r) => setTimeout(r, 200));

    const registry = getRoomRegistry();
    const entry = registry.get("friday-night");
    expect(entry).toBeDefined();
    expect(entry!.room.getNumActiveSessions()).toBe(2);

    one.close();
    two.close();
  });

  it("different table names get different rooms", async () => {
    const one = await connect("table-a", "session-a");
    const two = await connect("table-b", "session-b");
    await new Promise((r) => setTimeout(r, 200));

    const registry = getRoomRegistry();
    expect(registry.get("table-a")).toBeDefined();
    expect(registry.get("table-b")).toBeDefined();
    expect(registry.get("table-a")!.room).not.toBe(registry.get("table-b")!.room);

    one.close();
    two.close();
  });

  it("rejects a connection with no usable slug", async () => {
    await expect(connect("%20%20", "session-x")).rejects.toBeDefined();
  });
});

describe("RoomEntry.hasInstance", () => {
  it("is false when no shape with that instanceId is on the table", () => {
    const entry = getOrCreateRoom("hasinstance-empty");
    expect(entry.hasInstance("no-such-instance")).toBe(false);
  });

  it("is true once a card shape with that instanceId is in the room store", async () => {
    const entry = getOrCreateRoom("hasinstance-present");
    await entry.room.updateStore((store) => {
      store.put(
        mtgCardShape({
          id: createShapeId("hasinstance-card"),
          pageId: "page:page",
          x: 0,
          y: 0,
          w: 170,
          h: 238,
          index: "a1" as any,
          instanceId: "instance-present",
          scryfallId: "xyz",
          cardName: "Lightning Bolt",
          frontImageUrl: "https://cards.scryfall.io/normal/front/x/y/xyz.jpg",
          backImageUrl: null,
          face: "front",
          faceDown: false,
          sleeveColor: null,
          cardBackImageUrl: null,
          owner: "seat-1",
          isCommander: false,
        })
      );
    });

    expect(entry.hasInstance("instance-present")).toBe(true);
    expect(entry.hasInstance("some-other-instance")).toBe(false);
  });
});

describe("room lifecycle is recorded from a callback that outlives its span", () => {
  it("emits room lifecycle records from the throttled callback", async () => {
    const only = await connect("closing-time", "session-last");
    await waitUntil(() => getRoomRegistry().get("closing-time")?.room.getNumActiveSessions() === 1);

    only.close();

    await waitUntil(() => logsFor("room emptied", "closing-time").length > 0);

    const [removed] = logsFor("room session removed", "closing-time");
    expect(removed.attributes).toMatchObject({ "table.name": "closing-time", "room.sessions_remaining": 0 });

    const [emptied] = logsFor("room emptied", "closing-time");
    expect(emptied.attributes).toMatchObject({ "table.name": "closing-time" });


  }, 20_000);
});
