import { trace } from "@opentelemetry/api";
import { GameState, GameCard } from "../GameState.js";
import { GameId } from "../domain-types.js";
import { CardPlayedEvent, ZoneHint, buildCardPlayedEvent } from "../port-tabletop/types.js";
import { SpinePort, buildSeatJoinedPayload, defaultPlaymatImageUrl, playmatImageUrlFromPath, cardBackImageUrl, shufflerPublicUrl } from "./types.js";
import { colorsForPlaymat, DEFAULT_PLAYMAT_PATH } from "../table-look.js";
import { log } from "../log.js";

export interface JoinSpineParams {
  gameId: GameId;
  tableName: string;
  playerName: string;
  deckName: string;
  sleeveColor?: string;
  playmatImagePath?: string;
  commanders?: readonly GameCard[];
}

export interface SpineJoinOutcome {
  seatId?: string;
  spineTableId?: string;
  spineSeatNumber?: number;
  tableUrl?: string;
}

/**
 * The one call that administers a seat: creates the table if needed, assigns a seat,
 * mints seat.taken + seat.joined on the Spine's own log, and has the Spine notify the
 * Tabletop. Best-effort — a down Spine must not block starting a game.
 */
export async function joinSpineBestEffort(spinePort: SpinePort | undefined, params: JoinSpineParams): Promise<SpineJoinOutcome> {
  if (!spinePort) return {};
  const { gameId, tableName, playerName, deckName, sleeveColor, playmatImagePath, commanders } = params;
  const playmatImageUrl = playmatImagePath ? playmatImageUrlFromPath(playmatImagePath) : defaultPlaymatImageUrl();
  const { primaryColor, secondaryColor } = colorsForPlaymat(playmatImagePath ?? DEFAULT_PLAYMAT_PATH, sleeveColor);
  const decoration = buildSeatJoinedPayload(
    deckName,
    `${shufflerPublicUrl()}/game/${gameId}`,
    playmatImageUrl,
    cardBackImageUrl(),
    sleeveColor,
    commanders,
    primaryColor,
    secondaryColor
  );
  try {
    const result = await spinePort.join({ gameId: String(gameId), name: tableName, playerName, ...decoration });
    return { seatId: result.seatId, spineTableId: result.tableId, spineSeatNumber: result.seatNumber, tableUrl: result.tableUrl };
  } catch (error) {
    trace.getActiveSpan()?.setAttributes({ "spine_join.failed": true, "table.name": tableName });
    log.warn("Spine join (table + seat) failed (best-effort; this game won't send to the Spine)", { "table.name": tableName }, error as Error);
    return {};
  }
}

export async function sendCardPlayedToSpineBestEffort(spinePort: SpinePort | undefined, game: GameState, gameCard: GameCard, zoneHint: ZoneHint, sessionId?: string): Promise<void> {
  if (!spinePort || !game.spineTableId || !game.seatId || !gameCard.cardInstanceId) return;
  const tableId = game.spineTableId;
  try {
    const event: CardPlayedEvent = buildCardPlayedEvent(
      gameCard,
      gameCard.cardInstanceId,
      { seatId: game.seatId, playerName: game.playerName ?? "player", sessionId },
      game.seatId,
      zoneHint,
      tableId
    );
    await spinePort.sendEvent(tableId, event);
  } catch (error) {
    trace.getActiveSpan()?.setAttributes({ "spine_send.send_failed": true, "table.name": game.tableName ?? "" });
    log.warn("card.played send to Spine failed (best-effort; the Spine observes the log, it doesn't gate gameplay yet)", { "table.name": game.tableName ?? "" }, error as Error);
  }
}
