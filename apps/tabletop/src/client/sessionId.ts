/**
 * The Tabletop has no durable anchor like the Shuffler's `gameId`, so its
 * `sessionId` must persist across a refresh, in client-side storage, instead
 * of being minted fresh on every page load.
 *
 * A seated visitor (arrived via `?seat=<seatId>`) gets a generated session
 * id persisted the same way. An unseated visitor (a spectator, or anyone on
 * a bare `/t/:slug` URL) gets an `anonymous-` pseudonym instead — a visibly
 * different shape than a real seatId's `name-slug-8hex`, so interpretation
 * can tell a real occupant from a pseudonymous visitor without a separate
 * flag. The pseudonym doubles as both the session's identity token
 * (`sessionId`) and its display label — there's no separate display-name
 * concept for an anonymous visitor.
 */

/** Prefix marking a session id as an anonymous pseudonym, not a real seatId. */
export const ANONYMOUS_SESSION_ID_PREFIX = "anonymous-";

const SESSION_ID_STORAGE_KEY = "tabletop.sessionId";

const PSEUDONYM_WORDS = [
  "hippo",
  "otter",
  "falcon",
  "badger",
  "raven",
  "lynx",
  "viper",
  "yak",
  "moose",
  "gecko",
  "swift",
  "brave",
  "quiet",
  "clever",
  "lucky",
  "gentle",
  "bold",
  "curious",
  "sneaky",
  "jolly",
];

function randomWord(): string {
  return PSEUDONYM_WORDS[Math.floor(Math.random() * PSEUDONYM_WORDS.length)];
}

function randomSuffix(length: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/** Generates a fresh `anonymous-<word>-<word><random>` pseudonym. */
export function generateAnonymousPseudonym(): string {
  return `${ANONYMOUS_SESSION_ID_PREFIX}${randomWord()}-${randomWord()}${randomSuffix(8)}`;
}

/** Generates a fresh session id for a seated visitor (not shaped like a pseudonym). */
function generateSeatedSessionId(): string {
  return crypto.randomUUID();
}

/**
 * Returns this visit's `sessionId`, persisted in `storage` so a refresh
 * reuses the same value instead of minting a new one. `seatId` is `undefined`
 * for a spectator or a bare `/t/:slug` visit, in which case the persisted id
 * is an anonymous pseudonym instead of a generated session id.
 */
export function getOrCreateSessionId(seatId: string | undefined, storage: Storage): string {
  const existing = storage.getItem(SESSION_ID_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const sessionId = seatId !== undefined ? generateSeatedSessionId() : generateAnonymousPseudonym();
  storage.setItem(SESSION_ID_STORAGE_KEY, sessionId);
  return sessionId;
}
