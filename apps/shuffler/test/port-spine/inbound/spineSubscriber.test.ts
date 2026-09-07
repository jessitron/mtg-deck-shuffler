import { describe, test, expect } from "@jest/globals";
import { subscribeToSpine } from "../../../src/port-spine/inbound/spineSubscriber.js";
import { FakeSpineConnection } from "../../../src/port-spine/inbound/FakeSpineConnection.js";
import { waitUntil } from "./FakeSpineTable.js";

/**
 * Unit-level reconnect orchestration tests, driven directly against `FakeSpineConnection` —
 * no socket, no HTTP, no fake server. `gameSubscriptionRegistry.test.ts` covers the same
 * subscriber wired up through the registry + dispatch + Revealed-zone application; these
 * tests are scoped to `subscribeToSpine` itself: does it reconnect, and with the right
 * `lastEventId`.
 */
describe("subscribeToSpine reconnect orchestration", () => {
  test("start → connect → receive events → local close: a clean close opens no further connection", async () => {
    const connection = new FakeSpineConnection();
    const applied: unknown[] = [];
    const subscription = subscribeToSpine("table-1", (event) => {
      applied.push(event);
      return 1;
    }, connection);

    connection.connect();
    connection.emitFrame({ seq: 1, name: "card.returned" });
    await waitUntil(() => applied.length === 1);
    expect(applied).toEqual([{ seq: 1, name: "card.returned" }]);

    subscription.close();
    await new Promise((r) => setTimeout(r, 300)); // give a would-be reconnect time to land

    expect(connection.openCalls).toHaveLength(1); // no reconnect after a local close
  });

  test("connect → mid-stream drop → reconnects with lastEventId set to the highest applied seq", async () => {
    const connection = new FakeSpineConnection();
    const subscription = subscribeToSpine(
      "table-1",
      (event) => (event as { seq: number }).seq,
      connection
    );

    connection.connect();
    expect(connection.lastOpenLastEventId()).toBeUndefined(); // first connect: nothing applied yet
    connection.emitFrame({ seq: 1 });

    connection.dropConnection();
    await waitUntil(() => connection.openCalls.length === 2);

    expect(connection.lastOpenLastEventId()).toBe(1);

    subscription.close();
  });

  test("frames delivered back-to-back are applied strictly in arrival order, even when a later frame's handler resolves faster", async () => {
    const connection = new FakeSpineConnection();
    const appliedOrder: number[] = [];
    const subscription = subscribeToSpine(
      "table-1",
      async (event) => {
        const { seq, delayMs } = event as { seq: number; delayMs: number };
        await new Promise((r) => setTimeout(r, delayMs));
        appliedOrder.push(seq);
        return seq;
      },
      connection
    );

    connection.connect();
    // Emitted in order 1, 2, 3 — but frame 1's handler is the slowest, so a fire-and-forget
    // dispatcher would let 3 (and maybe 2) finish first if it didn't chain them.
    connection.emitFrame({ seq: 1, delayMs: 30 });
    connection.emitFrame({ seq: 2, delayMs: 15 });
    connection.emitFrame({ seq: 3, delayMs: 0 });

    await waitUntil(() => appliedOrder.length === 3);
    expect(appliedOrder).toEqual([1, 2, 3]);

    subscription.close();
  });

  test("a clean stream end (not a drop) also reconnects, carrying the applied seq forward", async () => {
    const connection = new FakeSpineConnection();
    const subscription = subscribeToSpine(
      "table-1",
      (event) => (event as { seq: number }).seq,
      connection
    );

    connection.connect();
    connection.emitFrame({ seq: 5 });

    connection.endStream();
    await waitUntil(() => connection.openCalls.length === 2);

    expect(connection.lastOpenLastEventId()).toBe(5);

    subscription.close();
  });
});
