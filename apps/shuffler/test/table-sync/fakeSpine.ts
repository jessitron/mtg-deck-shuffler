import { FakeSpineJoinAdapter } from "../../src/port-spine/join/FakeSpineJoinAdapter.js";
import { FakeSpineEventsAdapter } from "../../src/port-spine/events/FakeSpineEventsAdapter.js";
import { SpineJoinRequest } from "../../src/port-spine/join/spineWire.js";
import { EventEnvelope } from "../../src/port-tabletop/types.js";

/**
 * One Spine, two capabilities. Table administration and the event bus are separate ports
 * (`port-spine/join/`, `port-spine/events/`) with separate fakes, but they are still the
 * same service, and a test that seats a game and then plays a card wants to hold one
 * object. `spine.join` and `spine.events` are what the code under test receives.
 */
export class FakeSpine {
  public readonly join = new FakeSpineJoinAdapter();
  public readonly events = new FakeSpineEventsAdapter();

  /** The `/join` bodies the Spine would have received. */
  get joinRequests(): SpineJoinRequest[] {
    return this.join.joinRequests;
  }

  /** The event envelopes the Spine would have received. */
  get sentEvents(): { tableId: string; event: EventEnvelope<unknown> }[] {
    return this.events.sentEvents;
  }

  /** The whole Spine is down — both capabilities fail until `succeedAgain()`. */
  failWith(error: Error): void {
    this.join.failWith(error);
    this.events.failWith(error);
  }

  succeedAgain(): void {
    this.join.succeedAgain();
    this.events.succeedAgain();
  }
}
