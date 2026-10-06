import { SpineJoinAdapter } from "./SpineJoinAdapter.js";
import { SpineJoinRequest, SpineJoinResult } from "./spineWire.js";

/**
 * An in-memory table registry: it administers seats the way the Spine does (one table per
 * name, seats numbered 1-4, a repeat of the same joinRequestId gets its old seat back) and
 * remembers every request, so a test can read back exactly the bytes the Spine would have
 * seen — the translation is inherited from `SpineJoinAdapter`, not re-implemented here.
 */
export class FakeSpineJoinAdapter extends SpineJoinAdapter {
  public readonly joinRequests: SpineJoinRequest[] = [];
  private readonly tableIdsByName = new Map<string, string>();
  private readonly seatCountByTableId = new Map<string, number>();
  private readonly resultsByJoinRequestId = new Map<string, SpineJoinResult>();
  private failure: Error | null = null;
  private nextTableId = 1;

  failWith(error: Error): void {
    this.failure = error;
  }

  succeedAgain(): void {
    this.failure = null;
  }

  protected async submitJoin(request: SpineJoinRequest): Promise<SpineJoinResult> {
    if (this.failure) {
      throw this.failure;
    }
    this.joinRequests.push(request);

    // Idempotent by joinRequestId, mirroring the real Spine (a retry/restart returns the same seat).
    const existing = this.resultsByJoinRequestId.get(request.joinRequestId);
    if (existing) {
      return existing;
    }

    let tableId = this.tableIdsByName.get(request.name);
    if (!tableId) {
      tableId = `fake-spine-table-${this.nextTableId++}`;
      this.tableIdsByName.set(request.name, tableId);
    }
    const seatNumber = (this.seatCountByTableId.get(tableId) ?? 0) + 1;
    if (seatNumber > 4) {
      throw new Error(`table ${tableId} already has 4 seats taken`);
    }
    this.seatCountByTableId.set(tableId, seatNumber);
    const seatId = `fake-seat-${tableId}-${seatNumber}`;
    const result: SpineJoinResult = { tableId, seatId, seatNumber, tableUrl: `http://fake-tabletop.test/t/${encodeURIComponent(request.name)}` };
    this.resultsByJoinRequestId.set(request.joinRequestId, result);
    return result;
  }
}
