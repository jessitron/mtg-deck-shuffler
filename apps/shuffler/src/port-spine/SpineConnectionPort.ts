/**
 * One attempt to open the Spine's per-table SSE stream — not the reconnecting subscription
 * as a whole. `subscribeToSpine` (`spineSubscriber.ts`) is the plain orchestration code that
 * owns reconnect/backoff/`Last-Event-ID` tracking and calls `open()` again after every
 * `onEnd`/`onDrop`; a `SpineConnectionPort` implementation only has to model a single
 * connect-and-stream.
 */

/** One parsed event frame off the stream (`data: {"event": ...}\n\n`) — heartbeat/comment frames never reach this far. */
export interface SpineFrame {
  event: unknown;
}

export interface SpineConnectionHandlers {
  /** The connection is live (headers received) — signals the orchestration to reset its backoff delay. */
  onOpen(): void;
  /** An event frame arrived. */
  onFrame(frame: SpineFrame): void;
  /** The stream ended without an error — a clean close from the far side. */
  onEnd(): void;
  /** The connection broke (network error, timeout, non-OK response). */
  onDrop(error: Error): void;
}

/** Handed back by `open()` — the caller's handle on the one connection attempt it just started. */
export interface OpenSpineConnection {
  /** Ends this attempt from our side. Neither `onEnd` nor `onDrop` fires after this. */
  close(): void;
}

export interface SpineConnectionPort {
  /**
   * Opens one connection for `tableId`, resuming after `seq` `lastEventId` when given (absent
   * on a fresh subscription's first attempt). Delivers everything that happens on that one
   * connection through `handlers`, until it ends, drops, or is closed.
   */
  open(tableId: string, lastEventId: number | undefined, handlers: SpineConnectionHandlers): OpenSpineConnection;
}
