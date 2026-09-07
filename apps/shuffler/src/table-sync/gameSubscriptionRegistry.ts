import { GameId } from "../domain-types.js";
import { GameEvent } from "../GameEvents.js";
import { PersistStatePort } from "../port-persist-state/types.js";
import { CardRepositoryPort } from "../port-card-repository/types.js";
import { SpineEventsPort, TableEventStream } from "../port-spine/events/types.js";
import { dispatchSpineEventForGame } from "./cardReturnedDispatch.js";

/** Highest `spineSeq` recorded on any event in the game's own log — the durable mark of how far this game has applied its table's events. `undefined` when the log has no recorded `spineSeq` at all (it has never applied one). */
function highestSpineSeq(events: GameEvent[]): number | undefined {
  let highest: number | undefined;
  for (const event of events) {
    if (event.eventName !== "move card" || event.spineSeq === undefined) continue;
    if (highest === undefined || event.spineSeq > highest) highest = event.spineSeq;
  }
  return highest;
}

export interface GameSubscriptionEntry {
  gameId: GameId;
  spineTableId: string;
  subscription: TableEventStream;
  /** event ids already applied — dedup for a redelivered event (reconnect landing on an already-seen event). */
  seenEventIds: Set<string>;
}

const registry = new Map<string, GameSubscriptionEntry>();

export function getGameSubscriptionRegistry(): Map<string, GameSubscriptionEntry> {
  return registry;
}

/** The one capability a browser SSE connection needs from the registry's point of view. */
export interface BrowserStream {
  write(chunk: string): void;
}

/**
 * Open browser SSE tabs per game, tracked separately from `registry` — a tab can open
 * before any Spine subscription exists (a solo game, or a table-mode game whose
 * subscription hasn't been opened by a `GET /game-section/:gameId` hit yet), so this
 * can't simply live on `GameSubscriptionEntry`.
 */
const browserStreamsByGame = new Map<string, Set<BrowserStream>>();

/** Called when a browser tab opens `GET /game-events/:gameId`. */
export function addBrowserStream(gameId: GameId, stream: BrowserStream): void {
  const key = String(gameId);
  let streams = browserStreamsByGame.get(key);
  if (!streams) {
    streams = new Set();
    browserStreamsByGame.set(key, streams);
  }
  streams.add(stream);
}

/**
 * Called when a browser tab's `GET /game-events/:gameId` connection closes. When this
 * was the last open tab for the game, tears down the game's live Spine subscription (if
 * any) — the next `GET /game-section/:gameId` hit re-opens it via
 * `ensureGameSpineSubscription`'s existing idempotent check.
 */
export function removeBrowserStream(gameId: GameId, stream: BrowserStream): void {
  const key = String(gameId);
  const streams = browserStreamsByGame.get(key);
  if (!streams) return;

  streams.delete(stream);
  if (streams.size > 0) return;

  browserStreamsByGame.delete(key);
  const entry = registry.get(key);
  if (entry) {
    entry.subscription.stop();
    registry.delete(key);
  }
}

/** Number of currently-open browser tabs for a game — test/diagnostic use. */
export function browserStreamCountForGame(gameId: GameId): number {
  return browserStreamsByGame.get(String(gameId))?.size ?? 0;
}

/** Pushes a `game-state-updated` frame to every open browser tab for a game. */
export function broadcastGameStateUpdated(gameId: GameId): void {
  const streams = browserStreamsByGame.get(String(gameId));
  if (!streams) return;
  for (const stream of streams) stream.write("data: game-state-updated\n\n");
}

/**
 * Opens the game's one live Spine SSE subscription, idempotently: a no-op if a live
 * entry already exists for this `gameId`. Called on every hit of `GET /game/:gameId`
 * (full page load) and `GET /game-section/:gameId` for a game with a `spineTableId` —
 * the same single check covers first load, HTMX re-fetch, and "came back after a while"
 * (server restart, new tab). Teardown happens in `removeBrowserStream`, below, when the
 * last open browser tab for the game disconnects.
 */
export function ensureGameSpineSubscription(
  gameId: GameId,
  spineTableId: string,
  gameSeatId: string | undefined,
  /** The persisted game's own event log — scanned for the highest recorded `spineSeq`, so a re-created subscription resumes where the game left off. */
  persistedEvents: GameEvent[],
  deps: { persistStatePort: PersistStatePort; cardRepository: CardRepositoryPort },
  /** The table's event bus. Absent for a Shuffler running without a Spine — then there is nothing to subscribe to. */
  eventsPort: SpineEventsPort | undefined
): void {
  if (!eventsPort) return;
  const key = String(gameId);
  if (registry.has(key)) return;

  const seenEventIds = new Set<string>();
  const subscription = eventsPort.followTable(
    spineTableId,
    (event) => dispatchSpineEventForGame(gameId, spineTableId, gameSeatId, seenEventIds, deps, event),
    highestSpineSeq(persistedEvents)
  );

  registry.set(key, { gameId, spineTableId, subscription, seenEventIds });
}
