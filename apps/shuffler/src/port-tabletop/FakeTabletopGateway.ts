import { CardPlayedEvent, TabletopPort } from "./types.js";

export class FakeTabletopGateway implements TabletopPort {
  public readonly sentEvents: { tableName: string; event: CardPlayedEvent }[] = [];
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
}
