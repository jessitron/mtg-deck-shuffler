import { Agent, type Dispatcher } from "undici";
import { log } from "../log.js";
import { OpenSpineConnection, SpineConnectionHandlers, SpineConnectionPort } from "./SpineConnectionPort.js";

const SPINE_URL = process.env.SPINE_URL || "http://localhost:4600";

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
 * The real Spine SSE client — a hand-rolled reader over `fetch`, since the Shuffler's
 * server holds one connection per active game at once and Node's built-in `EventSource`
 * isn't built for that. The wire format (`services/spine/lib/sse_stream.rb`) is exactly
 * `data: <json>\n\n`, one line, plus a `: heartbeat\n\n` comment frame sent immediately on
 * connect and every `HEARTBEAT_INTERVAL_SECONDS` while nothing's been published — swallowed
 * here as a transport detail; the reconnect orchestration above this port never sees it.
 */
export class HttpSpineConnection implements SpineConnectionPort {
  constructor(
    private readonly baseUrl: string = SPINE_URL,
    private readonly dispatcher: Dispatcher = createHeartbeatAwareDispatcher()
  ) {}

  open(tableId: string, lastEventId: number | undefined, handlers: SpineConnectionHandlers): OpenSpineConnection {
    const abort = new AbortController();
    void this.run(tableId, lastEventId, handlers, abort.signal);
    return {
      close(): void {
        abort.abort();
      },
    };
  }

  private async run(tableId: string, lastEventId: number | undefined, handlers: SpineConnectionHandlers, signal: AbortSignal): Promise<void> {
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
        throw new Error(`spine sse stream responded ${response.status}`);
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
      handlers.onDrop(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
