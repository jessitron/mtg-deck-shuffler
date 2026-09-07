import { EventEnvelope } from "../../port-tabletop/types.js";
import { SpineAdapter } from "./SpineAdapter.js";
import { SpineGateway } from "./HttpSpineGateway.js";
import { SpineJoinRequest, SpineJoinResult } from "./spineWire.js";

/** The Shuffler's table, backed by the real Spine. Translation lives upstairs; this is just delivery. */
export class HttpSpineAdapter extends SpineAdapter {
  constructor(private readonly gateway: SpineGateway) {
    super();
  }

  protected async submitJoin(request: SpineJoinRequest): Promise<SpineJoinResult> {
    return this.gateway.join(request);
  }

  protected async deliverEvent(tableId: string, event: EventEnvelope<unknown>): Promise<void> {
    await this.gateway.sendEvent(tableId, event);
  }
}
