import { trace } from "@opentelemetry/api";
import { GameState, GameCard } from "../GameState.js";
import { GameId } from "../domain-types.js";
import { JoinTablePort } from "../port-spine/join/types.js";
import { SpineEventsPort, TableSeat } from "../port-spine/events/types.js";
import { defaultPlaymatImageUrl, playmatImageUrlFromPath, cardBackImageUrl, shufflerPublicUrl } from "../shufflerUrls.js";
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
export async function joinSpineBestEffort(joinPort: JoinTablePort | undefined, params: JoinSpineParams): Promise<SpineJoinOutcome> {
  if (!joinPort) return {};
  const { gameId, tableName, playerName, deckName, sleeveColor, playmatImagePath, commanders } = params;
  const playmatImageUrl = playmatImagePath ? playmatImageUrlFromPath(playmatImagePath) : defaultPlaymatImageUrl();
  const { primaryColor, secondaryColor } = colorsForPlaymat(playmatImagePath ?? DEFAULT_PLAYMAT_PATH, sleeveColor);
  try {
    const seat = await joinPort.join({
      gameId: String(gameId),
      tableName,
      playerName,
      deckName,
      gameUrl: `${shufflerPublicUrl()}/game/${gameId}`,
      playmatImageUrl,
      cardBackImageUrl: cardBackImageUrl(),
      sleeveColor,
      primaryColor,
      secondaryColor,
      commanders,
    });
    return { seatId: seat.seatId, spineTableId: seat.tableId, spineSeatNumber: seat.seatNumber, tableUrl: seat.tableUrl };
  } catch (error) {
    trace.getActiveSpan()?.setAttributes({ "spine_join.failed": true, "table.name": tableName });
    log.warn("Spine join (table + seat) failed (best-effort; this game won't send to the Spine)", { "table.name": tableName }, error as Error);
    return {};
  }
}

/**
 * The seat this game is sitting in, or `undefined` when it isn't at a table at all — a solo
 * game, or one whose Spine join failed at start. Every announcement below is a no-op then.
 */
function seatOf(game: GameState, gameCard: GameCard, sessionId?: string): TableSeat | undefined {
  if (!game.spineTableId || !game.seatId || !gameCard.cardInstanceId) return undefined;
  return { tableId: game.spineTableId, seatId: game.seatId, playerName: game.playerName ?? "player", sessionId };
}

export async function sendCardPlayedToSpineBestEffort(
  eventsPort: SpineEventsPort | undefined,
  game: GameState,
  gameCard: GameCard,
  sessionId?: string,
  faceDown = false
): Promise<void> {
  if (!eventsPort) return;
  const seat = seatOf(game, gameCard, sessionId);
  if (!seat) return;
  try {
    await eventsPort.announceCardPlayed(seat, gameCard, faceDown);
  } catch (error) {
    trace.getActiveSpan()?.setAttributes({ "spine_send.send_failed": true, "table.name": game.tableName ?? "" });
    log.warn("card.played send to Spine failed (best-effort; the Spine observes the log, it doesn't gate gameplay yet)", { "table.name": game.tableName ?? "" }, error as Error);
  }
}

/**
 * A card went to the graveyard (discard-from-hand or mill) — its own event kind, not a
 * card.played with a graveyard hint (tabletop-cards-come-and-go ticket 08). Best-effort,
 * mirroring sendCardPlayedToSpineBestEffort.
 */
export async function sendCardDiscardedToSpineBestEffort(eventsPort: SpineEventsPort | undefined, game: GameState, gameCard: GameCard, sessionId?: string): Promise<void> {
  if (!eventsPort) return;
  const seat = seatOf(game, gameCard, sessionId);
  if (!seat) return;
  try {
    await eventsPort.announceCardDiscarded(seat, gameCard);
  } catch (error) {
    trace.getActiveSpan()?.setAttributes({ "spine_send.send_failed": true, "table.name": game.tableName ?? "" });
    log.warn("card.discarded send to Spine failed (best-effort; the Spine observes the log, it doesn't gate gameplay yet)", { "table.name": game.tableName ?? "" }, error as Error);
  }
}

/**
 * Any transition out of the Shuffler's Table location (Return button, put-in-hand/top/bottom)
 * tells the Tabletop the card left, so it can poof the matching shape (ticket 07). Best-effort,
 * mirroring `sendCardPlayedToSpineBestEffort` — a down Spine must not block the Return action.
 */
export async function sendCardReturnedToSpineBestEffort(
  eventsPort: SpineEventsPort | undefined,
  game: GameState,
  gameCard: GameCard,
  sessionId?: string
): Promise<void> {
  if (!eventsPort) return;
  const seat = seatOf(game, gameCard, sessionId);
  if (!seat) return;
  try {
    await eventsPort.announceCardReturned(seat, gameCard);
  } catch (error) {
    trace.getActiveSpan()?.setAttributes({ "spine_send.send_failed": true, "table.name": game.tableName ?? "" });
    log.warn("card.returned send to Spine failed (best-effort; the Spine observes the log, it doesn't gate gameplay yet)", { "table.name": game.tableName ?? "" }, error as Error);
  }
}
