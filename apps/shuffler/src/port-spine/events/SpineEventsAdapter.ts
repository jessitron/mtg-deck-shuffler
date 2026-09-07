import { GameCard } from "../../domain-types.js";
import {
  EventEnvelope,
  ZoneHint,
  buildCardPlayedEvent,
  buildCardPlayedFaceDownEvent,
  buildCardReturnedEvent,
  buildCardDiscardedEvent,
} from "../../port-tabletop/types.js";
import { log } from "../../log.js";
import { OpenSpineStream, SpineFrame, SpineStreamHandlers } from "./HttpSpineStreamGateway.js";
import { ApplyTableEvent, SpineEventsPort, TableEventStream, TableSeat } from "./types.js";

/** Delay before the first reconnect attempt. */
const RECONNECT_DELAY_MS = 250;
/** Doubled on each consecutive failed connection attempt, capped here — a Spine outage shouldn't turn every open game into a connection-attempt storm against it. */
const MAX_RECONNECT_DELAY_MS = 5_000;

/** The Spine assigns `seq` on append and stamps it on every broadcast envelope. */
function extractSeq(value: unknown): number | undefined {
  if (typeof value !== "object" || value === null || !("seq" in value)) return undefined;
  const seq = (value as { seq: unknown }).seq;
  return typeof seq === "number" ? seq : undefined;
}

/**
 * The translation between the Shuffler's domain and the event envelopes the fleet publishes
 * (`contracts/`), both ways.
 *
 * Going out: a `GameCard` at a `TableSeat` becomes a `card.played` / `card.returned` /
 * `card.discarded` envelope. Coming in: "deliver me this table's events, resuming from what
 * I applied" becomes a stream of connection attempts, each carrying a `Last-Event-ID`
 * cursor that this class maintains from the `seq` on the events it delivered and the
 * caller's plain applied/not-applied answer. `seq`-as-reconnect-cursor stops here; above
 * this line nobody counts frames or reconnects.
 *
 * Subclasses supply only *transport* — the real one over HTTP through gateways, the fake one
 * in memory — so both go through the identical translation and a test watching the fake
 * sees exactly the bytes the Spine would have seen.
 */
export abstract class SpineEventsAdapter implements SpineEventsPort {
  /** Append one fully-built event to the table's log. */
  protected abstract deliverEvent(tableId: string, event: EventEnvelope<unknown>): Promise<void>;

  /** Open ONE connection attempt to the table's stream; the reconnecting is done here. */
  protected abstract openStream(tableId: string, lastEventId: number | undefined, handlers: SpineStreamHandlers): OpenSpineStream;

  async announceCardPlayed(seat: TableSeat, gameCard: GameCard, zoneHint: ZoneHint, faceDown: boolean): Promise<void> {
    const instanceId = requireCardInstanceId(gameCard);
    const event = faceDown
      ? buildCardPlayedFaceDownEvent(gameCard, instanceId, initiatorFor(seat), seat.seatId, zoneHint, seat.tableId)
      : buildCardPlayedEvent(gameCard, instanceId, initiatorFor(seat), seat.seatId, zoneHint, seat.tableId);
    await this.deliverEvent(seat.tableId, event);
  }

  async announceCardReturned(seat: TableSeat, gameCard: GameCard): Promise<void> {
    const instanceId = requireCardInstanceId(gameCard);
    await this.deliverEvent(seat.tableId, buildCardReturnedEvent(gameCard, instanceId, initiatorFor(seat), seat.seatId, seat.tableId));
  }

  async announceCardDiscarded(seat: TableSeat, gameCard: GameCard): Promise<void> {
    const instanceId = requireCardInstanceId(gameCard);
    await this.deliverEvent(seat.tableId, buildCardDiscardedEvent(gameCard, instanceId, initiatorFor(seat), seat.seatId, seat.tableId));
  }

  /**
   * Reconnect orchestration over `openStream`, which models only one connection attempt
   * (open, yield frames, end/drop).
   *
   * Reconnects replay what was missed: every connect attempt (including the first, where
   * `lastEventId` is simply absent) sends the highest `seq` this subscription has actually
   * applied. The Spine (`services/spine/lib/sse_stream.rb`) replays every stored event after
   * that `seq`, in order, over the same connection, then continues into the ordinary live
   * broadcast — indistinguishable on the wire from live events, so a reconnect that replays
   * anything is only visible via the `log.info` in the stream gateway.
   */
  followTable(tableId: string, applyEvent: ApplyTableEvent, appliedThrough?: number): TableEventStream {
    let stopped = false;
    let current: OpenSpineStream | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectDelayMs = RECONNECT_DELAY_MS;
    /** Highest `seq` the caller has confirmed applied — sent as `lastEventId` on every subsequent connect attempt. Absent on the very first connection of a game that has never applied one. */
    let lastAppliedSeq: number | undefined = appliedThrough;

    const connectOnce = (): void => {
      const startingSeq = lastAppliedSeq;
      // Frames arrive one at a time from `onFrame`, but a fresh reconnect can deliver a whole
      // replay burst back-to-back before the event loop yields between them — chaining each
      // frame's handling onto this promise keeps them applied strictly in arrival order,
      // matching the old single read-loop's `await applyEvent(...)` per frame.
      let processingChain: Promise<void> = Promise.resolve();

      const scheduleReconnect = (): void => {
        if (stopped) return;
        reconnectTimer = setTimeout(() => {
          reconnectDelayMs = Math.min(reconnectDelayMs * 2, MAX_RECONNECT_DELAY_MS);
          connectOnce();
        }, reconnectDelayMs);
      };

      const handleFrame = async (frame: SpineFrame): Promise<void> => {
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
          // Awaited right here: whatever the caller does with the event — including the span
          // it opens around the work — happens inside this call, not after it returns.
          const { applied } = await applyEvent(frame.event);
          if (applied && frameSeq !== undefined && (lastAppliedSeq === undefined || frameSeq > lastAppliedSeq)) {
            lastAppliedSeq = frameSeq;
          }
        } catch (error) {
          log.warn("spine sse: event handler threw", { "spine.table_id": tableId }, error);
        }
      };

      current = this.openStream(tableId, startingSeq, {
        onOpen: (): void => {
          // Connected — a stream that later drops is a fresh reconnect attempt, not a
          // continuation of whatever backoff preceded this connection.
          reconnectDelayMs = RECONNECT_DELAY_MS;
        },
        onFrame: (frame: SpineFrame): void => {
          processingChain = processingChain.then(() => handleFrame(frame));
        },
        onEnd: (): void => {
          if (stopped) return;
          log.warn("spine sse: stream ended, reconnecting", { "spine.table_id": tableId });
          scheduleReconnect();
        },
        onDrop: (error: Error): void => {
          if (stopped) return;
          log.warn("spine sse: connection error, reconnecting", { "spine.table_id": tableId }, error);
          scheduleReconnect();
        },
      });
    };

    connectOnce();

    return {
      stop(): void {
        stopped = true;
        if (reconnectTimer) clearTimeout(reconnectTimer);
        current?.close();
      },
    };
  }
}

function initiatorFor(seat: TableSeat) {
  return { seatId: seat.seatId, playerName: seat.playerName, sessionId: seat.sessionId };
}

function requireCardInstanceId(gameCard: GameCard): string {
  if (!gameCard.cardInstanceId) {
    throw new Error(`${gameCard.card.name} has no cardInstanceId; cannot announce it to the Spine`);
  }
  return gameCard.cardInstanceId;
}
