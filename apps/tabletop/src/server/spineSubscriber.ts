import { log } from "./log.js";

/**
 * A hand-rolled SSE client for the Spine's per-table event stream — not Node's
 * built-in EventSource, since a server process holds many concurrent per-table
 * streams at once and EventSource isn't built for that. The wire format
 * (`services/spine/lib/sse_stream.rb`) is exactly `data: <json>\n\n`, one line,
 * no `id:`/`retry:`/heartbeats.
 */

const SPINE_URL = process.env.SPINE_URL || "http://localhost:4600";

/** Delay before the first bare reconnect — no catch-up/replay, just resume listening. */
const RECONNECT_DELAY_MS = 250;
/** Doubled on each consecutive failed connection attempt, capped here — a Spine outage shouldn't turn every open table into a connection-attempt storm against it. */
const MAX_RECONNECT_DELAY_MS = 5_000;

export interface SpineSubscription {
  close(): void;
}

/** `baseUrl` defaults to the real Spine — overridable so tests can point this at a fake SSE server. */
export function subscribeToSpine(tableId: string, onEvent: (event: unknown) => void, baseUrl: string = SPINE_URL): SpineSubscription {
  let closed = false;
  let currentAbort: AbortController | null = null;
  let reconnectDelayMs = RECONNECT_DELAY_MS;

  async function connectOnce(): Promise<void> {
    const abort = new AbortController();
    currentAbort = abort;
    const response = await fetch(`${baseUrl}/tables/${encodeURIComponent(tableId)}/events/stream`, {
      signal: abort.signal,
      headers: { accept: "text/event-stream" },
    });
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
