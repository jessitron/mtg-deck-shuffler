import { trace } from "@opentelemetry/api";
import { GameState, GameCard } from "../GameState.js";
import { CardPlayedEvent, ZoneHint, buildCardPlayedEvent } from "../port-tabletop/types.js";
import { SpinePort } from "./types.js";
import { log } from "../log.js";

export async function joinSpineTableBestEffort(spinePort: SpinePort | undefined, tableName: string, playerName: string): Promise<{ spineTableId?: string; spineSeatNumber?: number }> {
  if (!spinePort) return {};
  try {
    const { tableId, seatNumber } = await spinePort.join(tableName, playerName);
    return { spineTableId: tableId, spineSeatNumber: seatNumber };
  } catch (error) {
    trace.getActiveSpan()?.setAttributes({ "spine_join.failed": true, "table.name": tableName });
    log.warn("Spine join (table + seat) failed (best-effort; this game won't send to the Spine)", { "table.name": tableName }, error as Error);
    return {};
  }
}

export async function sendCardPlayedToSpineBestEffort(spinePort: SpinePort | undefined, game: GameState, gameCard: GameCard, zoneHint: ZoneHint): Promise<void> {
  if (!spinePort || !game.spineTableId || !game.spineSeatNumber || !gameCard.cardInstanceId) return;
  const tableId = game.spineTableId;
  try {
    const event: CardPlayedEvent = buildCardPlayedEvent(gameCard, gameCard.cardInstanceId, { seatId: String(game.spineSeatNumber), playerName: game.playerName ?? "player" }, zoneHint, tableId);
    await spinePort.sendEvent(tableId, event);
  } catch (error) {
    trace.getActiveSpan()?.setAttributes({ "spine_send.send_failed": true, "table.name": game.tableName ?? "" });
    log.warn("card.played send to Spine failed (best-effort; the Spine observes the log, it doesn't gate gameplay yet)", { "table.name": game.tableName ?? "" }, error as Error);
  }
}
