import { trace } from "@opentelemetry/api";
import { GameState, GameCard } from "../GameState.js";
import { CardPlayedEvent, ZoneHint, buildCardPlayedEvent } from "../port-tabletop/types.js";
import { SpinePort } from "./types.js";
import { log } from "../log.js";

/**
 * Best-effort: send this played card's game event to the Spine, in addition
 * to (never instead of) the Tabletop send. A Spine that's down or unreachable
 * must not block a play — unlike sendCardToTableFirst, the Spine isn't
 * load-bearing for gameplay yet, just an observer building up its log.
 *
 * Looks up or creates the table by name on every call rather than caching the
 * tableId on GameState/PersistedGameState — the lookup is cheap (local SQLite)
 * and this keeps the Spine wiring from touching persisted state shapes.
 *
 * Scope note: this does not register a Spine seat (POST /tables/:id/seats) —
 * the Shuffler has no numbered-seat (1-4) concept yet, and Spine's seat.taken
 * requires one. `initiator` carries the Shuffler's own seatId/playerName, same
 * as the Tabletop send; no Spine-side seat exists for it to reference.
 */
export async function sendCardPlayedToSpineBestEffort(spinePort: SpinePort | undefined, game: GameState, gameCard: GameCard, zoneHint: ZoneHint): Promise<void> {
  if (!spinePort || !game.tableName || !gameCard.cardInstanceId) return;
  const tableName = game.tableName;
  try {
    const tableId = await spinePort.ensureTable(tableName, game.playerName ?? "player");
    const event: CardPlayedEvent = buildCardPlayedEvent(gameCard, gameCard.cardInstanceId, { seatId: game.seatId ?? "unknown-seat", playerName: game.playerName ?? "player" }, zoneHint, tableId);
    await spinePort.sendEvent(tableId, event);
  } catch (error) {
    trace.getActiveSpan()?.setAttributes({ "spine_send.send_failed": true, "table.name": tableName });
    log.warn("card.played send to Spine failed (best-effort; the Spine observes the log, it doesn't gate gameplay yet)", { "table.name": tableName }, error as Error);
  }
}
