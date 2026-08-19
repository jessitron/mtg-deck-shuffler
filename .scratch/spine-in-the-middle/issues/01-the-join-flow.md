# The join flow: one administered, idempotent Spine call, async from the player's screen

Mountain: spine-gathers-data
Ship: fleet
Type: grilling
Status: resolved

## Question

Today, "joining a table" is really two independent, best-effort operations that happen
to fire around the same moment (`/start-game`, `/restart-game`): a thin
`joinSpineTableBestEffort` call to the Spine (`{name, playerName}` →
`{tableId, seatNumber}`), and a separate, richer `seat.joined` POST straight to the
Tabletop (`deckName`, `playmatImageUrl`, `sleeveColor`, `commanders`). Both are awaited
before the game screen's redirect fires, but both swallow failure — `log.warn` only, no
player-visible error either way.

Decide: does making the Spine the only path mean these two calls become one? If so,
what does that one call look like — request shape, response shape, idempotency,
failure handling, and where in the page-load sequence it happens?

## Answer

Grilled with Jess, 2026-08-11.

1. **Joining a table is an essential API call, not an event.** The Spine acts as
   administrator: given one request, it creates the table if it doesn't exist yet,
   confirms there's room, assigns a seat, and — as part of that same administered act —
   tells the Tabletop everything it needs to draw the seat (over the Spine's existing
   SSE pipe; the Spine already broadcasts every appended event to a table's stream).
   It hands back a URL to the table. The Shuffler never talks to the Tabletop directly
   for this again.

2. **`seat.taken` and `seat.joined` stop being two independently-sent facts.** They
   were two calls because two different code paths existed (a thin Spine join, a rich
   direct-to-Tabletop POST) — once there's one call, there's no reason to keep sending
   two. The request carries everything: `playerName`, `deckName`, `playmatImageUrl`,
   `sleeveColor`, `commanders[]`, and the Shuffler's own `gameUrl` (so the Tabletop's
   library-furniture link keeps working). Whether the Spine's *own* log ends up with
   one event or two recording this fact is an implementation choice for whichever
   ticket builds it — the outward contract is one call in, one notification out.

3. **The `/game` screen does not wait for this call to finish.** It renders
   immediately. The join happens after, asynchronously from the player's point of
   view; the page shows a message on failure and updates its content on success. This
   is a real behavior change from today (where both calls, though best-effort, are
   `await`ed before the redirect) — it decouples "can the player see their game" from
   "is the Spine reachable right now."

4. **A successful join becomes an event in the Shuffler's own domain log** — not just
   a silent state update. It's narration-visible, the same way other things that
   happen to a game are. (Whether a *failed* join is also worth a log event, or stays
   UI-only, is open — see the map's Not yet specified.)

5. **The call is idempotent, keyed by the Shuffler's own `gameId` + table name.** A
   retry (network blip) or a restart resending the same join doesn't create a second
   seat — the Spine recognizes "I already know this game joined this table" and
   returns the same table URL. This replaces today's workaround (the Shuffler
   persisting `spineTableId`/`spineSeatNumber` itself and never re-joining) with the
   Spine doing the recognizing. `gameId` crossing this boundary (Shuffler→Spine) is
   fine — it's opaque to the Spine, used only as a dedup key; `gameId` may cross any
   boundary in the fleet freely, same as `gameCardIndex`.

## Left for the implementing ticket (not decisions, just noted)

- Exact request/response shape for the new `/join` (or its replacement).
- Whether the Spine's internal log records this as one event or two.
- What client-side mechanism updates the `/game` page on success/failure (HTMX poll,
  the Shuffler's own SSE subscriber once it exists — see the map's Not yet specified
  — or something simpler for a first cut).
