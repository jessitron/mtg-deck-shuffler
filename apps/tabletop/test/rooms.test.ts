import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { WebSocket } from "ws";
import type { Server } from "node:http";
import { startServer } from "../src/server/server";
import { getRoomRegistry } from "../src/server/rooms";

/**
 * A3: the sync server + in-memory room registry (SCAFFOLDING — the Spine
 * absorbs table identity later). Real server on an ephemeral port; two ws
 * clients share a room.
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
