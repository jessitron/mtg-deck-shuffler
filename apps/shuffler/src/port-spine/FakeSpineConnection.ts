import { OpenSpineConnection, SpineConnectionHandlers, SpineConnectionPort } from "./SpineConnectionPort.js";

/**
 * A scriptable in-memory double for one Spine SSE connection attempt — no socket, no HTTP.
 * Tests drive it directly: `open()` records the attempt, then `connect()`/`emitFrame()`/
 * `endStream()`/`dropConnection()` trigger exactly one of the four `SpineConnectionHandlers`
 * outcomes for whichever attempt is currently live.
 */
export class FakeSpineConnection implements SpineConnectionPort {
  readonly openCalls: Array<{ tableId: string; lastEventId: number | undefined }> = [];
  private live?: SpineConnectionHandlers;

  open(tableId: string, lastEventId: number | undefined, handlers: SpineConnectionHandlers): OpenSpineConnection {
    this.openCalls.push({ tableId, lastEventId });
    this.live = handlers;
    return {
      close: (): void => {
        if (this.live === handlers) this.live = undefined;
      },
    };
  }

  /** The most recent attempt's `lastEventId`, or `undefined` if `open()` hasn't been called yet. */
  lastOpenLastEventId(): number | undefined {
    return this.openCalls[this.openCalls.length - 1]?.lastEventId;
  }

  connect(): void {
    this.live?.onOpen();
  }

  emitFrame(event: unknown): void {
    this.live?.onFrame({ event });
  }

  endStream(): void {
    const handlers = this.live;
    this.live = undefined;
    handlers?.onEnd();
  }

  dropConnection(error: Error = new Error("fake spine connection dropped")): void {
    const handlers = this.live;
    this.live = undefined;
    handlers?.onDrop(error);
  }
}
