import { EventEnvelope } from "../../port-tabletop/types.js";
import { SpineAdapter } from "./SpineAdapter.js";
import { SpineJoinRequest, SpineJoinResult } from "./spineWire.js";

/**
 * An in-memory table: it administers seats the way the Spine does (one table per name,
 * seats numbered 1-4, a repeat of the same gameId gets its old seat back) and remembers
 * everything it was told, so a test can read back exactly the bytes the Spine would have
 * seen — the translation is inherited from `SpineAdapter`, not re-implemented here.
 */
export class FakeSpineAdapter extends SpineAdapter {
  public readonly sentEvents: { tableId: string; event: EventEnvelope<unknown> }[] = [];
  public readonly joinRequests: SpineJoinRequest[] = [];
  private readonly tableIdsByName = new Map<string, string>();
  private readonly seatCountByTableId = new Map<string, number>();
  private readonly resultsByGameId = new Map<string, SpineJoinResult>();
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

    // Idempotent by gameId, mirroring the real Spine (a retry/restart returns the same seat).
    const existing = this.resultsByGameId.get(request.gameId);
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
    this.resultsByGameId.set(request.gameId, result);
    return result;
  }

  protected async deliverEvent(tableId: string, event: EventEnvelope<unknown>): Promise<void> {
    if (this.failure) {
      throw this.failure;
    }
    this.sentEvents.push({ tableId, event });
  }
}
