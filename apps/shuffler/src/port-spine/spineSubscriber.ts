import { Agent, type Dispatcher } from "undici";
import { log } from "../log.js";

/**
 * A hand-rolled SSE client for the Spine's per-table event stream — not Node's
 * built-in EventSource, since the Shuffler's server holds one connection per active
 * game at once and EventSource isn't built for that. The wire format
 * (`services/spine/lib/sse_stream.rb`) is exactly `data: <json>\n\n`, one line,
 * plus a `: heartbeat\n\n` comment frame sent immediately on connect and every
 * `HEARTBEAT_INTERVAL_SECONDS` (`sse_stream.rb`) while nothing's been published — no
 * `id:`/`retry:`. Ported from `apps/tabletop/src/server/spineSubscriber.ts`, which has
 * this shape's full rationale.
 */

const SPINE_URL = process.env.SPINE_URL || "http://localhost:4600";

/** Delay before the first bare reconnect — no catch-up/replay, just resume listening. */
const RECONNECT_DELAY_MS = 250;
/** Doubled on each consecutive failed connection attempt, capped here — a Spine outage shouldn't turn every open game into a connection-attempt storm against it. */
const MAX_RECONNECT_DELAY_MS = 5_000;

export interface SpineSubscription {
  close(): void;
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

/** `baseUrl` defaults to the real Spine — overridable so tests can point this at a fake SSE server. */
export function subscribeToSpine(
  tableId: string,
  onEvent: (event: unknown) => void,
  baseUrl: string = SPINE_URL,
  dispatcher: Dispatcher = createHeartbeatAwareDispatcher()
): SpineSubscription {
  let closed = false;
  let currentAbort: AbortController | null = null;
  let reconnectDelayMs = RECONNECT_DELAY_MS;

  async function connectOnce(): Promise<void> {
    const abort = new AbortController();
    currentAbort = abort;
    // Resolves as soon as headers arrive, not when the stream ends — the reader loop below is
    // what actually consumes the stream for as long as the connection stays open.
    const response = await fetch(`${baseUrl}/tables/${encodeURIComponent(tableId)}/events/stream`, {
      signal: abort.signal,
      headers: { accept: "text/event-stream" },
      dispatcher,
    } as unknown as RequestInit);
    if (!response.ok || !response.body) {
      throw new Error(`spine sse stream responded ${response.status}`);
    }
    // Connected — a stream that later drops is a fresh reconnect attempt, not a
    // continuation of whatever backoff preceded this connection.
    reconnectDelayMs = RECONNECT_DELAY_MS;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (!closed) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let frameEnd;
      while ((frameEnd = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, frameEnd);
        buffer = buffer.slice(frameEnd + 2);
        const dataLine = frame.split("\n").find((line) => line.startsWith("data: "));
        if (!dataLine) continue;
        try {
          const message = JSON.parse(dataLine.slice("data: ".length)) as { event?: unknown };
          if (message.event !== undefined) onEvent(message.event);
        } catch (error) {
          log.warn("spine sse: failed to parse frame", { "spine.table_id": tableId }, error);
        }
      }
    }
  }

  async function connectLoop(): Promise<void> {
    while (!closed) {
      try {
        await connectOnce();
        if (!closed) log.warn("spine sse: stream ended, reconnecting", { "spine.table_id": tableId });
      } catch (error) {
        if (closed) break;
        log.warn("spine sse: connection error, reconnecting", { "spine.table_id": tableId }, error);
      }
      if (closed) break;
      await new Promise((resolve) => setTimeout(resolve, reconnectDelayMs));
      reconnectDelayMs = Math.min(reconnectDelayMs * 2, MAX_RECONNECT_DELAY_MS);
    }
  }

  void connectLoop();

  return {
    close(): void {
      closed = true;
      currentAbort?.abort();
    },
  };
}
