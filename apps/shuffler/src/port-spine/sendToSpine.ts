import { trace } from "@opentelemetry/api";
import { GameState, GameCard } from "../GameState.js";
import { CardPlayedEvent, ZoneHint, buildCardPlayedEvent } from "../port-tabletop/types.js";
import { SpinePort } from "./types.js";
import { log } from "../log.js";

/**
 * Best-effort: join the Spine's table by name (creating it if none is active
 * yet) via a single POST /join, at join time (mirrors
 * sendSeatJoinedBestEffort's timing for the Tabletop). A Spine that's
 * unreachable must not block starting the game — on failure this returns {},
 * and the game simply sends nothing to the Spine for its lifetime (no retry;
 * see sendCardPlayedToSpineBestEffort).
 *
 * Callers must persist the returned ids
 * (TableInfo.spineTableId/spineSeatNumber) and carry them forward on restart
 * rather than calling this again — joining is NOT idempotent like the
 * Tabletop's seat.joined; a repeat call mints a second seat.
 */
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

/**
 * Best-effort: send this played card's game event to the Spine, in addition
 * to (never instead of) the Tabletop send. A Spine that's down or unreachable
 * must not block a play — unlike sendCardToTableFirst, the Spine isn't
 * load-bearing for gameplay yet, just an observer building up its log.
 *
 * Uses the tableId/seatId the Spine assigned at join time
 * (joinSpineTableBestEffort) — no-ops if the game never joined the Spine
 * (join failed, or this is a solo game).
 */
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
