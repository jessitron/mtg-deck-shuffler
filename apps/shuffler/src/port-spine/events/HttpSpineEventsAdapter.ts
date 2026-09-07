import { EventEnvelope } from "../../port-tabletop/types.js";
import { SpineEventsAdapter } from "./SpineEventsAdapter.js";
import { SpineEventsGateway } from "./HttpSpineEventsGateway.js";

/** The table's event bus, backed by the real Spine. Translation lives upstairs; this is just delivery. */
export class HttpSpineEventsAdapter extends SpineEventsAdapter {
  constructor(private readonly gateway: SpineEventsGateway) {
    super();
  }

  protected async deliverEvent(tableId: string, event: EventEnvelope<unknown>): Promise<void> {
    await this.gateway.sendEvent(tableId, event);
  }
}
