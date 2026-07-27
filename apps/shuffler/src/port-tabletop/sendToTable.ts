import { GameState, GameCard } from "../GameState.js";
import { TabletopPort, ZoneHint, buildCardPlayedEvent } from "./types.js";

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
