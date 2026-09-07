import { EventEnvelope } from "../../port-tabletop/types.js";
import { SpineEventsAdapter } from "./SpineEventsAdapter.js";

/**
 * An in-memory event log: it remembers everything it was told, so a test can read back
 * exactly the bytes the Spine would have seen — the translation is inherited from
 * `SpineEventsAdapter`, not re-implemented here.
 */
export class FakeSpineEventsAdapter extends SpineEventsAdapter {
  public readonly sentEvents: { tableId: string; event: EventEnvelope<unknown> }[] = [];
  private failure: Error | null = null;

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
}
