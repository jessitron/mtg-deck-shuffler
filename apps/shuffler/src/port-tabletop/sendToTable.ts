import { trace } from "@opentelemetry/api";
import { GameState, GameCard, TableInfo } from "../GameState.js";
import { TabletopPort, ZoneHint, buildCardPlayedEvent, buildSeatJoinedEvent, defaultPlaymatImageUrl, playmatImageUrlFromPath, cardBackImageUrl } from "./types.js";
import { log } from "../log.js";

/**
 * The Shuffler picks the zone hint — it knows land vs nonland from
 * CardDefinition.cardTypes; the tabletop stays meaning-free and honors it.
 * Playing: a land goes to the player's battlefield row, everything else to
 * the stack. Discarding: the graveyard spot (see discard's caller).
 */
export function zoneHintForPlay(gameCard: GameCard): ZoneHint {
  return gameCard.card.cardTypes.includes("Land") ? "battlefield" : "stack";
}

/**
 * Send-then-commit (JES-127, B3): send the card to the table FIRST; the caller
 * commits the game-state change only after this resolves. Throws on any
 * failure — a play that silently missed the tabletop is worse than one that
 * says it failed. (A send that worked but wasn't acknowledged is covered by
 * the tabletop's dedup on instanceId: re-sending is a physical no-op.)
 * Full protocol, all stations: notes/DESIGN-send-then-commit.md.
 *
 * A fresh event id is minted per attempt (inside buildCardPlayedEvent), so
 * retries are distinguishable from duplicates.
 */
export async function sendCardToTableFirst(
  tabletopPort: TabletopPort | undefined,
  game: GameState,
  gameCard: GameCard,
  zoneHint: ZoneHint
): Promise<void> {
  if (!game.tableName) {
    throw new Error("This game is not at a table");
  }
  if (!tabletopPort) {
    throw new Error("This game is at a table, but no tabletop is configured (set TABLETOP_URL)");
  }
  if (!gameCard.cardInstanceId) {
    // Should never happen: newGame mints, fromPersistedGameState mints-on-load.
    throw new Error(`Card ${gameCard.card.name} has no cardInstanceId; cannot send it to the table`);
  }
  const event = buildCardPlayedEvent(
    gameCard,
    gameCard.cardInstanceId,
    { seatId: game.seatId ?? "unknown-seat", playerName: game.playerName ?? "player" },
    zoneHint
  );
  await tabletopPort.sendCardToTable(game.tableName, event);
}

/**
 * Announce a seat joining its table (JES-140), at Shuffle Up. Best-effort:
 * unlike sendCardToTableFirst, a Tabletop that's unreachable here must not
 * block starting the game — the player area is drawn lazily as a fallback
 * the first time one of this seat's cards arrives (see the Tabletop's
 * ensurePlayerArea).
 */
export async function sendSeatJoinedBestEffort(
  tabletopPort: TabletopPort | undefined,
  tableInfo: TableInfo,
  deckName: string,
  sleeveColor?: string,
  playmatImagePath?: string,
  commanders?: readonly GameCard[]
): Promise<void> {
  if (!tabletopPort) return;
  const { tableName, seatId, playerName } = tableInfo;
  const playmatImageUrl = playmatImagePath ? playmatImageUrlFromPath(playmatImagePath) : defaultPlaymatImageUrl();
  const event = buildSeatJoinedEvent({ seatId, playerName }, deckName, playmatImageUrl, cardBackImageUrl(), sleeveColor, commanders);
  try {
    await tabletopPort.sendSeatJoined(tableName, event);
  } catch (error) {
    trace.getActiveSpan()?.setAttributes({ "seat_joined.send_failed": true, "table.name": tableName, "seat.id": seatId });
    log.warn("seat.joined send to tabletop failed (best-effort; table draws the player area lazily)", { "table.name": tableName, "seat.id": seatId }, error as Error);
  }
}
