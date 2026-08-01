import { CardPlayedEvent, SeatJoinedEvent, TabletopPort } from "./types.js";

/**
 * Fake (not mock) Tabletop for tests: records every event it accepts, and can
 * be told to fail — which is how send-then-commit's failure path is exercised.
 */
export class FakeTabletopGateway implements TabletopPort {
  public readonly sentEvents: { tableName: string; event: CardPlayedEvent }[] = [];
  public readonly sentSeatJoinedEvents: { tableName: string; event: SeatJoinedEvent }[] = [];
  private failure: Error | null = null;

  failWith(error: Error): void {
    this.failure = error;
  }

  succeedAgain(): void {
    this.failure = null;
  }

  async sendCardToTable(tableName: string, event: CardPlayedEvent): Promise<void> {
    if (this.failure) {
      throw this.failure;
    }
    this.sentEvents.push({ tableName, event });
  }

  async sendSeatJoined(tableName: string, event: SeatJoinedEvent): Promise<void> {
    if (this.failure) {
      throw this.failure;
    }
    this.sentSeatJoinedEvents.push({ tableName, event });
  }
}
