import { DeckProvenance } from "../types.js";
import { GameEvent } from "../GameEvents.js";
import { PrepId } from "../port-persist-prep/types.js";
import { GameId, GameStatus } from "../domain-types.js";
import { PersistedGameCard } from "./persisted-types.js";

export const PERSISTED_GAME_STATE_VERSION: 11 = 11;

/** Thrown when a persisted game was saved in a format this build can't load. */
export class IncompatibleStateVersionError extends Error {
  constructor(public readonly foundVersion: unknown, public readonly expectedVersion: number) {
    super(
      `This game was saved in an older, incompatible format (version ${foundVersion}); this build expects version ${expectedVersion}. Old games can't be loaded — please start a new game.`
    );
    this.name = "IncompatibleStateVersionError";
  }
}

export interface PersistedGameState {
  version: typeof PERSISTED_GAME_STATE_VERSION;
  gameId: GameId;
  status: GameStatus;
  prepId: PrepId;
  prepVersion: number;
  deckProvenance: DeckProvenance;
  deckName: string;
  deckId: number;
  totalCards: number;
  gameCards: PersistedGameCard[]; // Changed from GameCard[] to PersistedGameCard[]
  events: GameEvent[];
  tableName?: string;
  playerName?: string;
  /** The seat's short GUID — player names are not unique; this is the seat's identity. */
  seatId?: string;
  spineTableId?: string;
  spineSeatNumber?: number;
  tableUrl?: string;
  sleeveColor?: string;
  playmatImagePath?: string;
}

export interface GameHistorySummary {
  gameId: GameId;
  deckName: string;
  commanderNames: string[];
  actionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PersistStatePort {
  save(psg: PersistedGameState): Promise<GameId>;
  retrieve(gameId: GameId): Promise<PersistedGameState | null>;
  newGameId(): GameId;
  getAllGames(): Promise<GameHistorySummary[]>;
}
