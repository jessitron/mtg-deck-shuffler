import { trace } from "@opentelemetry/api";
import { GameState, GameCard, TableInfo } from "../GameState.js";
import { TabletopPort, ZoneHint, buildCardPlayedEvent, buildSeatJoinedEvent, defaultPlaymatImageUrl, playmatImageUrlFromPath, cardBackImageUrl } from "./types.js";
import { log } from "../log.js";
import { colorsForPlaymat, DEFAULT_PLAYMAT_PATH } from "../table-look.js";

export function zoneHintForPlay(gameCard: GameCard): ZoneHint {
  return gameCard.card.cardTypes.includes("Land") ? "battlefield" : "stack";
}

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
    zoneHint,
    game.tableName
  );
  await tabletopPort.sendCardToTable(game.tableName, event);
}

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
  const { primaryColor, secondaryColor } = colorsForPlaymat(playmatImagePath ?? DEFAULT_PLAYMAT_PATH, sleeveColor);
  const event = buildSeatJoinedEvent(
    { seatId, playerName },
    deckName,
    tableName,
    playmatImageUrl,
    cardBackImageUrl(),
    sleeveColor,
    commanders,
    primaryColor,
    secondaryColor
  );
  try {
    await tabletopPort.sendSeatJoined(tableName, event);
  } catch (error) {
    trace.getActiveSpan()?.setAttributes({ "seat_joined.send_failed": true, "table.name": tableName, "seat.id": seatId });
    log.warn("seat.joined send to tabletop failed (best-effort; table draws the player area lazily)", { "table.name": tableName, "seat.id": seatId }, error as Error);
  }
}
