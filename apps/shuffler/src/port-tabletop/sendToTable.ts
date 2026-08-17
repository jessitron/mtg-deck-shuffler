import { GameState, GameCard } from "../GameState.js";
import { TabletopPort, ZoneHint, buildCardPlayedEvent } from "./types.js";

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
