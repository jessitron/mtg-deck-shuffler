import { SpineJoinAdapter } from "./SpineJoinAdapter.js";
import { SpineJoinGateway } from "./HttpSpineJoinGateway.js";
import { SpineJoinRequest, SpineJoinResult } from "./spineWire.js";

/** Seats a game at a real Spine table. Translation lives upstairs; this is just submission. */
export class HttpSpineJoinAdapter extends SpineJoinAdapter {
  constructor(private readonly gateway: SpineJoinGateway) {
    super();
  }

  protected async submitJoin(request: SpineJoinRequest): Promise<SpineJoinResult> {
    return this.gateway.join(request);
  }
}
