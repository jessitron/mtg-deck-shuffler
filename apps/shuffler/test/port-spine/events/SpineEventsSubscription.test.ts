import { describe, test, expect } from "@jest/globals";
import { FakeSpineEventsAdapter } from "../../../src/port-spine/events/FakeSpineEventsAdapter.js";
import { FakeSpineStreamGateway } from "../../../src/port-spine/events/FakeSpineStreamGateway.js";
import { waitUntil } from "./FakeSpineTable.js";

/**
 * Unit-level reconnect orchestration tests, driven through the port's `followTable` over a
 * `FakeSpineStreamGateway` — no socket, no HTTP, no fake server.
 * `gameSubscriptionRegistry.test.ts` covers the same adapter wired up through the registry +
 * dispatch + Revealed-zone application; these tests are scoped to the adapter's own
 * subscription behaviour: does it reconnect, and with the right `lastEventId`.
 */
describe("SpineEventsPort.followTable reconnect orchestration", () => {
  test("start → connect → receive events → local stop: a clean stop opens no further connection", async () => {
    const stream = new FakeSpineStreamGateway();
    const applied: unknown[] = [];
    const subscription = new FakeSpineEventsAdapter(stream).followTable("table-1", (event) => {
      applied.push(event);
      return 1;
    });

    stream.connect();
    stream.emitFrame({ seq: 1, name: "card.returned" });
    await waitUntil(() => applied.length === 1);
    expect(applied).toEqual([{ seq: 1, name: "card.returned" }]);

    subscription.stop();
    await new Promise((r) => setTimeout(r, 300)); // give a would-be reconnect time to land

    expect(stream.openCalls).toHaveLength(1); // no reconnect after a local stop
  });

  test("connect → mid-stream drop → reconnects with lastEventId set to the highest applied seq", async () => {
    const stream = new FakeSpineStreamGateway();
    const subscription = new FakeSpineEventsAdapter(stream).followTable("table-1", (event) => (event as { seq: number }).seq);

    stream.connect();
    expect(stream.lastOpenLastEventId()).toBeUndefined(); // first connect: nothing applied yet
    stream.emitFrame({ seq: 1 });

    stream.dropConnection();
    await waitUntil(() => stream.openCalls.length === 2);

    expect(stream.lastOpenLastEventId()).toBe(1);

    subscription.stop();
  });

  test("an event the caller could not apply does not advance the cursor — the reconnect asks for it again", async () => {
    const stream = new FakeSpineStreamGateway();
    const subscription = new FakeSpineEventsAdapter(stream).followTable("table-1", () => undefined);

    stream.connect();
    stream.emitFrame({ seq: 7 });

    stream.dropConnection();
    await waitUntil(() => stream.openCalls.length === 2);

    expect(stream.lastOpenLastEventId()).toBeUndefined();

    subscription.stop();
  });

  test("frames delivered back-to-back are applied strictly in arrival order, even when a later frame's handler resolves faster", async () => {
    const stream = new FakeSpineStreamGateway();
    const appliedOrder: number[] = [];
    const subscription = new FakeSpineEventsAdapter(stream).followTable("table-1", async (event) => {
      const { seq, delayMs } = event as { seq: number; delayMs: number };
      await new Promise((r) => setTimeout(r, delayMs));
      appliedOrder.push(seq);
      return seq;
    });

    stream.connect();
    // Emitted in order 1, 2, 3 — but frame 1's handler is the slowest, so a fire-and-forget
    // dispatcher would let 3 (and maybe 2) finish first if it didn't chain them.
    stream.emitFrame({ seq: 1, delayMs: 30 });
    stream.emitFrame({ seq: 2, delayMs: 15 });
    stream.emitFrame({ seq: 3, delayMs: 0 });

    await waitUntil(() => appliedOrder.length === 3);
    expect(appliedOrder).toEqual([1, 2, 3]);

    subscription.stop();
  });

  test("a clean stream end (not a drop) also reconnects, carrying the applied seq forward", async () => {
    const stream = new FakeSpineStreamGateway();
    const subscription = new FakeSpineEventsAdapter(stream).followTable("table-1", (event) => (event as { seq: number }).seq);

    stream.connect();
    stream.emitFrame({ seq: 5 });

    stream.endStream();
    await waitUntil(() => stream.openCalls.length === 2);

    expect(stream.lastOpenLastEventId()).toBe(5);

    subscription.stop();
  });

  test("a subscription resumed from the game's own log asks the table to start after what it already applied", async () => {
    const stream = new FakeSpineStreamGateway();
    const subscription = new FakeSpineEventsAdapter(stream).followTable("table-1", (event) => (event as { seq: number }).seq, 12);

    stream.connect();
    expect(stream.lastOpenLastEventId()).toBe(12);

    subscription.stop();
  });
});
