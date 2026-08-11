import { EventEnvelope } from "../port-tabletop/types.js";
import { SpinePort } from "./types.js";

/**
 * Fake (not mock) Spine for tests: mints a stable tableId per name (repeated
 * joins for the same name return the same id, like the real
 * lookup-or-create), assigns the next open seat number (1-4, matching the
 * real Spine's auto-assignment), records every sent event, and can be told
 * to fail.
 */
export class FakeSpineGateway implements SpinePort {
  public readonly sentEvents: { tableId: string; event: EventEnvelope<unknown> }[] = [];
  public readonly takenSeats: { tableId: string; playerName: string; seatNumber: number }[] = [];
  private readonly tableIdsByName = new Map<string, string>();
  private readonly seatCountByTableId = new Map<string, number>();
  private failure: Error | null = null;
  private nextTableId = 1;

  failWith(error: Error): void {
    this.failure = error;
  }

  succeedAgain(): void {
    this.failure = null;
  }

  async join(name: string, playerName: string): Promise<{ tableId: string; seatNumber: number }> {
    if (this.failure) {
      throw this.failure;
    }
    let tableId = this.tableIdsByName.get(name);
    if (!tableId) {
      tableId = `fake-spine-table-${this.nextTableId++}`;
      this.tableIdsByName.set(name, tableId);
    }
    const seatNumber = (this.seatCountByTableId.get(tableId) ?? 0) + 1;
    if (seatNumber > 4) {
      throw new Error(`table ${tableId} already has 4 seats taken`);
    }
    this.seatCountByTableId.set(tableId, seatNumber);
    this.takenSeats.push({ tableId, playerName, seatNumber });
    return { tableId, seatNumber };
  }

  async sendEvent<Payload>(tableId: string, event: EventEnvelope<Payload>): Promise<void> {
    if (this.failure) {
      throw this.failure;
    }
    this.sentEvents.push({ tableId, event: event as EventEnvelope<unknown> });
  }
}
