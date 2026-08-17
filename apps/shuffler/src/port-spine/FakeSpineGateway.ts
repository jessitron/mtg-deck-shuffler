import { EventEnvelope } from "../port-tabletop/types.js";
import { SpineJoinRequest, SpineJoinResult, SpinePort } from "./types.js";

export class FakeSpineGateway implements SpinePort {
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

  async join(request: SpineJoinRequest): Promise<SpineJoinResult> {
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
    const result: SpineJoinResult = { tableId, seatNumber, tableUrl: `http://fake-tabletop.test/t/${encodeURIComponent(request.name)}` };
    this.resultsByGameId.set(request.gameId, result);
    return result;
  }

  async sendEvent<Payload>(tableId: string, event: EventEnvelope<Payload>): Promise<void> {
    if (this.failure) {
      throw this.failure;
    }
    this.sentEvents.push({ tableId, event: event as EventEnvelope<unknown> });
  }
}
