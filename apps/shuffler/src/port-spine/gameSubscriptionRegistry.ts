import { GameId } from "../domain-types.js";
import { PersistStatePort } from "../port-persist-state/types.js";
import { CardRepositoryPort } from "../port-card-repository/types.js";
import { subscribeToSpine, SpineSubscription } from "./spineSubscriber.js";
import { dispatchSpineEventForGame } from "./cardReturnedDispatch.js";

export interface GameSubscriptionEntry {
  gameId: GameId;
  spineTableId: string;
  subscription: SpineSubscription;
  /** event ids already applied — dedup for a redelivered event (reconnect landing on an already-seen event). */
  seenEventIds: Set<string>;
}

const registry = new Map<string, GameSubscriptionEntry>();

export function getGameSubscriptionRegistry(): Map<string, GameSubscriptionEntry> {
  return registry;
}

/**
 * Opens the game's one live Spine SSE subscription, idempotently: a no-op if a live
 * entry already exists for this `gameId`. Called on every hit of
 * `GET /game-section/:gameId` for a game with a `spineTableId` — the same single check
 * covers first load, HTMX re-fetch, and "came back after a while" (server restart, new
 * tab). Teardown (closing the subscription when the last open browser tab disconnects)
 * is a later ticket's job — once opened, this entry stays open.
 */
export function ensureGameSpineSubscription(
  gameId: GameId,
  spineTableId: string,
  deps: { persistStatePort: PersistStatePort; cardRepository: CardRepositoryPort },
  /** Defaults to the real Spine (`subscribeToSpine`'s own default) — overridable so tests can point this at a fake SSE server. */
  baseUrl?: string
): void {
  const key = String(gameId);
  if (registry.has(key)) return;

  const seenEventIds = new Set<string>();
  const onEvent = (event: unknown) => dispatchSpineEventForGame(gameId, spineTableId, seenEventIds, deps, event);
  const subscription = baseUrl ? subscribeToSpine(spineTableId, onEvent, baseUrl) : subscribeToSpine(spineTableId, onEvent);

  registry.set(key, { gameId, spineTableId, subscription, seenEventIds });
}
