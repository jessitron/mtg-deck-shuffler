import { Agent, type Dispatcher } from "undici";
import { log } from "./log.js";

/**
 * A hand-rolled SSE client for the Spine's per-table event stream — not Node's
 * built-in EventSource, since a server process holds many concurrent per-table
 * streams at once and EventSource isn't built for that. The wire format
 * (`services/spine/lib/sse_stream.rb`) is exactly `data: <json>\n\n`, one line,
 * plus a `: heartbeat\n\n` comment frame sent immediately on connect and every
 * `HEARTBEAT_INTERVAL_SECONDS` (`sse_stream.rb`) while nothing's been played — no `id:`/`retry:`.
 */

const SPINE_URL = process.env.SPINE_URL || "http://localhost:4600";

/** Delay before the first bare reconnect — no catch-up/replay, just resume listening. */
const RECONNECT_DELAY_MS = 250;
/** Doubled on each consecutive failed connection attempt, capped here — a Spine outage shouldn't turn every open table into a connection-attempt storm against it. */
const MAX_RECONNECT_DELAY_MS = 5_000;

export interface SpineSubscription {
  close(): void;
}

/**
 * Node's global `fetch` (undici) defaults `headersTimeout`/`bodyTimeout` to 300000ms (5 min) —
 * far too patient for a real hang, and (before the Spine sent heartbeats) also far too impatient
 * for an honestly quiet table: Puma doesn't flush a streamed response's headers until its body's
 * `each` yields a first chunk, so a fresh table with nothing played yet sent no bytes at all.
 * Confirmed in Honeycomb (local env, `mtg-tabletop`, span "GET" on this stream's URL): 95
 * `UND_ERR_HEADERS_TIMEOUT` plus 1 `UND_ERR_BODY_TIMEOUT` over 30 days, all on ordinary idle
 * tables, not real outages — and since the Spine's stream has no catch-up/replay, a card played
 * during the resulting reconnect gap was lost for good.
 *
 * Now that the Spine sends an immediate heartbeat plus one every
 * `HEARTBEAT_INTERVAL_SECONDS` (`sse_stream.rb`) while quiet, both timeouts can go back to being
 * bounded — a hung Spine is detected in seconds, not never, without misreading an honestly quiet
 * table as dead:
 * - `HEADERS_TIMEOUT_MS`: headers now arrive with that very first heartbeat, so a few seconds is
 *   generous slack for real network/scheduling latency, not "however long until someone plays a
 *   card".
 * - `BODY_TIMEOUT_MS`: three heartbeat intervals' worth of total silence — one missed beat is
 *   noise (a slow GC pause, a blip), three in a row means the connection is actually gone.
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
