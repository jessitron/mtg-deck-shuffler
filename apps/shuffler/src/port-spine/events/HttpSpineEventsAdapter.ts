import { EventEnvelope } from "../../port-tabletop/types.js";
import { SpineEventsAdapter } from "./SpineEventsAdapter.js";
import { SpineEventsGateway } from "./HttpSpineEventsGateway.js";
import { HttpSpineStreamGateway, OpenSpineStream, SpineStreamGateway, SpineStreamHandlers } from "./HttpSpineStreamGateway.js";

/**
 * The table's event bus, backed by the real Spine. Translation and reconnect orchestration
 * live upstairs; this is just transport — a POST out, a stream in.
 *
 * The stream gateway is held for this adapter's whole life (one per process, in practice)
 * rather than built per subscription or per connect attempt: it owns an undici `Agent`,
 * and a Spine outage would otherwise leak one connection pool per retry.
 */
export class HttpSpineEventsAdapter extends SpineEventsAdapter {
  constructor(
    private readonly gateway: SpineEventsGateway,
    private readonly streamGateway: SpineStreamGateway = new HttpSpineStreamGateway()
  ) {
    super();
  }

  protected async deliverEvent(tableId: string, event: EventEnvelope<unknown>): Promise<void> {
    await this.gateway.sendEvent(tableId, event);
  }

  protected openStream(tableId: string, lastEventId: number | undefined, handlers: SpineStreamHandlers): OpenSpineStream {
    return this.streamGateway.openStream(tableId, lastEventId, handlers);
  }
}
