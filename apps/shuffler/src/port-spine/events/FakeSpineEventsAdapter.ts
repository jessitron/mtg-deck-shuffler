import { EventEnvelope } from "../../port-tabletop/types.js";
import { SpineEventsAdapter } from "./SpineEventsAdapter.js";
import { FakeSpineStreamGateway } from "./FakeSpineStreamGateway.js";
import { OpenSpineStream, SpineStreamGateway, SpineStreamHandlers } from "./HttpSpineStreamGateway.js";

/**
 * An in-memory event bus: it remembers everything it was told, so a test can read back
 * exactly the bytes the Spine would have seen, and delivers whatever a scriptable stream
 * gateway emits — the translation and the reconnect orchestration are inherited from
 * `SpineEventsAdapter`, not re-implemented here.
 *
 * The default stream gateway is a `FakeSpineStreamGateway` (one connection attempt at a
 * time); hand in another double to drive the receive half differently.
 */
export class FakeSpineEventsAdapter extends SpineEventsAdapter {
  public readonly sentEvents: { tableId: string; event: EventEnvelope<unknown> }[] = [];
  private failure: Error | null = null;

  constructor(private readonly streamGateway: SpineStreamGateway = new FakeSpineStreamGateway()) {
    super();
  }

  failWith(error: Error): void {
    this.failure = error;
  }

  succeedAgain(): void {
    this.failure = null;
  }

  protected async deliverEvent(tableId: string, event: EventEnvelope<unknown>): Promise<void> {
    if (this.failure) {
      throw this.failure;
    }
    this.sentEvents.push({ tableId, event });
  }

  protected openStream(tableId: string, lastEventId: number | undefined, handlers: SpineStreamHandlers): OpenSpineStream {
    return this.streamGateway.openStream(tableId, lastEventId, handlers);
  }
}
