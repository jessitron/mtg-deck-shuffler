import { log } from "../../log.js";
import { HttpSpineConnection } from "./HttpSpineConnection.js";
import { OpenSpineConnection, SpineConnectionPort, SpineFrame } from "./SpineConnectionPort.js";

/**
 * Reconnect orchestration for the Shuffler's Spine SSE subscription — plain code sitting
 * above a `SpineConnectionPort`, which models only one connection attempt (open, yield
 * frames, end/drop). This is what makes reconnect/backoff/`Last-Event-ID` tracking testable
 * on its own terms: drive it against `FakeSpineConnection` and assert *it* reconnects with
 * the right `Last-Event-ID`, rather than standing up a real fake HTTP server.
 *
 * Reconnects replay what was missed: every connect attempt (including the first, where
 * `lastEventId` is simply absent) sends the highest `seq` this subscriber has actually
 * applied. The Spine (`services/spine/lib/sse_stream.rb`) replays every stored event after
 * that `seq`, in order, over the same connection, then continues into the ordinary live
 * broadcast — indistinguishable on the wire from live events, so a reconnect that replays
 * anything is only visible via the `log.info` below.
 */

/** Delay before the first reconnect attempt. */
const RECONNECT_DELAY_MS = 250;
/** Doubled on each consecutive failed connection attempt, capped here — a Spine outage shouldn't turn every open game into a connection-attempt storm against it. */
const MAX_RECONNECT_DELAY_MS = 5_000;

export interface SpineSubscription {
  close(): void;
}

/** The Spine assigns `seq` on append and stamps it on every broadcast envelope. */
export function extractSeq(value: unknown): number | undefined {
  if (typeof value !== "object" || value === null || !("seq" in value)) return undefined;
  const seq = (value as { seq: unknown }).seq;
  return typeof seq === "number" ? seq : undefined;
}

/**
 * Called with each event as it's parsed off the stream. Returns (possibly async) the
 * event's `seq` once it's been fully handled and confirmed to have actually landed, so
 * `subscribeToSpine` can track the high-water mark to send as `lastEventId` on the next
 * connect. Returning `undefined` — the event carried no `seq`, or handling it threw —
 * leaves the tracked value unchanged, so a reconnect will see it replayed again rather
 * than silently skipped.
 */
export type SpineEventHandler = (event: unknown) => number | undefined | Promise<number | undefined>;

/** `connection` defaults to the real Spine over HTTP — overridable so tests can drive a `FakeSpineConnection` instead. */
export function subscribeToSpine(
  tableId: string,
  onEvent: SpineEventHandler,
  connection: SpineConnectionPort = new HttpSpineConnection(),
  /** Durable seed for a resumed subscription — the highest `spineSeq` already recorded in the game's own event log, so a subscription re-created after a full teardown doesn't start from scratch. Absent for a true first-ever connection. */
  initialLastAppliedSeq?: number
): SpineSubscription {
  let closed = false;
  let current: OpenSpineConnection | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectDelayMs = RECONNECT_DELAY_MS;
  /** Highest `seq` confirmed applied via `onEvent` — sent as `lastEventId` on every subsequent connect attempt. Absent on the very first connection. */
  let lastAppliedSeq: number | undefined = initialLastAppliedSeq;

  function connectOnce(): void {
    const startingSeq = lastAppliedSeq;
    // Frames arrive one at a time from `onFrame`, but a fresh reconnect can deliver a whole
    // replay burst back-to-back before the event loop yields between them — chaining each
    // frame's handling onto this promise keeps them applied strictly in arrival order,
    // matching the old single read-loop's `await onEvent(...)` per frame.
    let processingChain: Promise<void> = Promise.resolve();

    function scheduleReconnect(): void {
      if (closed) return;
      reconnectTimer = setTimeout(() => {
        reconnectDelayMs = Math.min(reconnectDelayMs * 2, MAX_RECONNECT_DELAY_MS);
        connectOnce();
      }, reconnectDelayMs);
    }

    async function handleFrame(frame: SpineFrame): Promise<void> {
      try {
        const frameSeq = extractSeq(frame.event);
        if (frameSeq !== undefined && lastAppliedSeq !== undefined && frameSeq <= lastAppliedSeq) {
          log.warn("spine sse: replayed an event at or before our cursor, skipping", {
            "spine.table_id": tableId,
            "spine.seq": frameSeq,
            "spine.last_applied_seq": lastAppliedSeq,
          });
          return;
        }
        const applied = await onEvent(frame.event);
        if (typeof applied === "number" && (lastAppliedSeq === undefined || applied > lastAppliedSeq)) {
          lastAppliedSeq = applied;
        }
      } catch (error) {
        log.warn("spine sse: event handler threw", { "spine.table_id": tableId }, error);
      }
    }

    current = connection.open(tableId, startingSeq, {
      onOpen(): void {
        // Connected — a stream that later drops is a fresh reconnect attempt, not a
        // continuation of whatever backoff preceded this connection.
        reconnectDelayMs = RECONNECT_DELAY_MS;
      },
      onFrame(frame: SpineFrame): void {
        processingChain = processingChain.then(() => handleFrame(frame));
      },
      onEnd(): void {
        if (closed) return;
        log.warn("spine sse: stream ended, reconnecting", { "spine.table_id": tableId });
        scheduleReconnect();
      },
      onDrop(error: Error): void {
        if (closed) return;
        log.warn("spine sse: connection error, reconnecting", { "spine.table_id": tableId }, error);
        scheduleReconnect();
      },
    });
  }

  connectOnce();

  return {
    close(): void {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      current?.close();
    },
  };
}
