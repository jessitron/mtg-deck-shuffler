import { Agent, type Dispatcher } from "undici";
import { log } from "../../log.js";
import { SpineGatewayError } from "../SpineGatewayError.js";

const SPINE_URL = process.env.SPINE_URL || "http://localhost:4600";

/** One parsed event frame off the stream (`data: {"event": ...}\n\n`) — heartbeat/comment frames never reach this far. */
export interface SpineFrame {
  event: unknown;
}

export interface SpineStreamHandlers {
  /** The connection is live (headers received) — signals the reconnect orchestration to reset its backoff delay. */
  onOpen(): void;
  /** An event frame arrived. */
  onFrame(frame: SpineFrame): void;
  /** The stream ended without an error — a clean close from the far side. */
  onEnd(): void;
  /** The connection broke (network error, timeout, non-OK response). */
  onDrop(error: Error): void;
}

/** Handed back by `openStream()` — the caller's handle on the one connection attempt it just started. */
export interface OpenSpineStream {
  /** Ends this attempt from our side. Neither `onEnd` nor `onDrop` fires after this. */
  close(): void;
}

/**
 * The Spine's per-table SSE stream, narrowed to plain data: one connection attempt, parsed
 * frames out. Nothing here knows what a `GameCard` is, and nothing here reconnects — that
 * is `SpineEventsAdapter`'s job, above. A gateway instance is expected to outlive any one
 * attempt: it owns the connection pool that every reconnect reuses.
 */
export interface SpineStreamGateway {
  /**
   * Opens one connection for `tableId`, resuming after `lastEventId` when given (absent on a
   * fresh subscription's first attempt). Delivers everything that happens on that one
   * connection through `handlers`, until it ends, drops, or is closed.
   */
  openStream(tableId: string, lastEventId: number | undefined, handlers: SpineStreamHandlers): OpenSpineStream;
}

/**
 * Bounded `headersTimeout`/`bodyTimeout`, matching the Tabletop's
 * `createHeartbeatAwareDispatcher` fix — Node's global `fetch` defaults both to
 * 300000ms, far too patient for a genuine hang. The Spine's immediate-plus-periodic
 * heartbeat (`services/spine/lib/sse_stream.rb`) is what makes shorter values safe: headers
 * arrive with the first heartbeat, and three missed intervals in a row means the
 * connection is actually gone, not just an honestly quiet game.
 */
const HEADERS_TIMEOUT_MS = 5_000;
const BODY_TIMEOUT_MS = 45_000;

function createHeartbeatAwareDispatcher(): Dispatcher {
  return new Agent({ headersTimeout: HEADERS_TIMEOUT_MS, bodyTimeout: BODY_TIMEOUT_MS });
}

/**
 * Real Spine SSE client — a hand-rolled reader over `fetch`, since the Shuffler's
 * server holds one connection per active game at once and Node's built-in `EventSource`
 * isn't built for that. The wire format (`services/spine/lib/sse_stream.rb`) is exactly
 * `data: <json>\n\n`, one line, plus a `: heartbeat\n\n` comment frame sent immediately on
 * connect and every `HEARTBEAT_INTERVAL_SECONDS` while nothing's been published — swallowed
 * here as a transport detail; the reconnect orchestration above this gateway never sees it.
 *
 * One instance holds one undici `Agent`, i.e. one connection pool, for its whole life. Build
 * it once and keep it: a per-attempt instance would mint a fresh `Agent` on every reconnect,
 * so a Spine outage would leak a socket pool per retry.
 */
export class HttpSpineStreamGateway implements SpineStreamGateway {
  constructor(
    private readonly baseUrl: string = SPINE_URL,
    private readonly dispatcher: Dispatcher = createHeartbeatAwareDispatcher()
  ) {}

  openStream(tableId: string, lastEventId: number | undefined, handlers: SpineStreamHandlers): OpenSpineStream {
    const abort = new AbortController();
    void this.run(tableId, lastEventId, handlers, abort.signal);
    return {
      close(): void {
        abort.abort();
      },
    };
  }

  private async run(tableId: string, lastEventId: number | undefined, handlers: SpineStreamHandlers, signal: AbortSignal): Promise<void> {
    try {
      const headers: Record<string, string> = { accept: "text/event-stream" };
      if (lastEventId !== undefined) headers["Last-Event-ID"] = String(lastEventId);

      // Resolves as soon as headers arrive, not when the stream ends.
      const response = await fetch(`${this.baseUrl}/tables/${encodeURIComponent(tableId)}/events/stream`, {
        signal,
        headers,
        dispatcher: this.dispatcher,
      } as unknown as RequestInit);
      if (!response.ok || !response.body) {
        throw new SpineGatewayError(`spine sse stream responded ${response.status}`);
      }
      handlers.onOpen();

      // A connection that carried `lastEventId` may get replayed events before whatever it
      // missed catches up — count them until the heartbeat frame that always follows replay
      // (`sse_stream.rb`), so a nonzero catch-up is visible without instrumenting every event.
      // This is transport-specific (it depends on recognizing the heartbeat's comment-frame
      // shape), which is why it lives here rather than in the reconnect orchestration above.
      let inReplayPhase = lastEventId !== undefined;
      let replayedCount = 0;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          handlers.onEnd();
          return;
        }
        buffer += decoder.decode(value, { stream: true });

        let frameEnd;
        while ((frameEnd = buffer.indexOf("\n\n")) !== -1) {
          const frame = buffer.slice(0, frameEnd);
          buffer = buffer.slice(frameEnd + 2);
          const dataLine = frame.split("\n").find((line) => line.startsWith("data: "));
          if (!dataLine) {
            if (inReplayPhase) {
              inReplayPhase = false;
              if (replayedCount > 0) {
                log.info("spine sse: reconnected, caught up on missed events", {
                  "spine.table_id": tableId,
                  "spine.replayed_count": replayedCount,
                });
              }
            }
            continue; // comment/heartbeat frame — nothing to deliver
          }

          try {
            const message = JSON.parse(dataLine.slice("data: ".length)) as { event?: unknown };
            if (message.event !== undefined) {
              if (inReplayPhase) replayedCount++;
              handlers.onFrame({ event: message.event });
            }
          } catch (error) {
            log.warn("spine sse: failed to parse frame", { "spine.table_id": tableId }, error);
          }
        }
      }
    } catch (error) {
      if (signal.aborted) return; // closed locally — not a drop
      // undici's own errors stop here: everything above this gateway sees our error type.
      handlers.onDrop(error instanceof SpineGatewayError ? error : new SpineGatewayError(error instanceof Error ? error.message : String(error), { cause: error }));
    }
  }
}
