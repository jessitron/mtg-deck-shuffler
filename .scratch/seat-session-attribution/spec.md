# Seat/session attribution: real seatId format, sessionId, and owner-vs-initiator

Mountain: spine-gathers-data
Ship: fleet
Status: ready-for-agent

Domain model settled in conversation 2026-08-19 (not a formal `/grilling` session, but the
decisions below were reached and are already recorded in `notes/GLOSSARY.md` — Seat ID, Table
Position, Session ID, Anonymous Session, Owner vs Initiator, Player URL — and
`CONTEXT-MAP.md`'s "Initiator" and "Owner (Tabletop payload) ≠ Initiator (envelope)" sections).
This spec promotes `TODO.md`'s `seat-session-attribution` line to a formal spec; it mints no new
decisions, only sequences the ones already written down into buildable work.

## Problem Statement

Three related gaps make it impossible to correctly attribute who did what at a table, and to
place cards in the right player's area on the shared Tabletop canvas:

1. `initiator.seatId` on the wire is not what the Spine actually mints. `Table#prepare_seat`
   mints a GUID (`SecureRandom.uuid`) as the seat's real identity, but nothing distinguishes it
   from the seat's 1-4 table slot ("seat number") in either naming or shape — a bug already bit
   this exact confusion once (`card.played` sending `String(spineSeatNumber)` where a real
   seatId belonged, fixed ad hoc in commit `544c932b`). The seatId format itself is also not
   human-legible in traces the way a table id already is.
2. There is no way to tell apart two concurrent sessions under the same seat — two browser tabs,
   two devices, or a page refresh — because nothing on the wire identifies a session
   independently of a seat. This also means a Tabletop visitor with no seat at all (a spectator,
   or anyone who opened a bare `/t/<slug>` URL) has no identity to attribute their actions to.
3. `card.played`'s `owner` field (which `PlayerArea` a card belongs in on the Tabletop) is
   derived directly from `initiator.seatId` (who caused the event) — conflating two different
   questions. Nothing can move a card into someone else's area, or be caused by someone other
   than the card's owner, even though nothing about the domain forbids it.

Underneath all three: there's no way for the Tabletop itself to know which seat's occupant is
looking at it, because the Player URL it's given today (`table_url` in `app.rb`) carries only
the table, never the seat.

## Solution

- Rename "seat number" to **table position** everywhere it appears in code, contracts, and docs
  — it's a reusable placement slot, not an identity.
- Give the Spine-minted **Seat ID** a legible format (`<player-name-slug>-<8hex>`, mirroring
  `TableSlug.mint`'s own shape) instead of a bare UUID, minted in the same place
  (`Table#prepare_seat`) it already is.
- Add **Session ID** to the envelope's `initiator`, shaped differently per context: the Shuffler
  already has a durable anchor (`gameId`), so its `sessionId` is free to reset every page load;
  the Tabletop has no such anchor, so its `sessionId` (or an anonymous pseudonym, for unseated
  visitors) must itself survive a refresh.
- Give the Tabletop URL a `?seat=<seatId>` query param so a loading Tabletop page knows which
  occupancy is viewing — the missing piece that both this spec and the deferred scope in
  `.scratch/tabletop-view-rotation/spec.md` need.
- Decouple `card.played`'s `owner` (a placement fact — whose `PlayerArea` a card belongs in)
  from `initiator` (an attribution fact — who caused the event), specifying each independently
  instead of deriving one from the other.

## User Stories

1. As a developer reading a trace, I want a seatId to read as a name (`jess-a1b2c3d4`) rather
   than an opaque UUID, so that I can tell whose seat an event came from without a lookup.
2. As a developer reading Spine code or the event contract, I want "seat number" renamed to
   "table position" everywhere, so that the word "seat" stops doing double duty for both the
   occupancy (Seat ID) and the 1-4 slot it currently also names.
3. As a player who opens two browser tabs on the same seat, I want each tab's actions
   attributed to a distinct session, so that later interpretation (and traces) can tell which
   tab actually caused which event instead of conflating them under one seat.
4. As a player who refreshes the Shuffler's game page, I want a fresh session id minted for
   that page load, so that a refresh doesn't require restoring any client-side session state —
   `gameId` already anchors my identity durably.
5. As a player who refreshes the Tabletop page while seated, I want my session to survive the
   refresh, so that my prior actions on this visit stay attributed to the same session rather
   than starting over.
6. As a spectator who opens a bare Tabletop table URL with no `?seat=` param, I want a stable,
   readable pseudonym (like `anonymous-hippo-234134tr`) generated for me and kept across a
   refresh, so that my actions during this visit are still attributable to one consistent
   (if anonymous) session.
7. As a developer, I want an anonymous session's pseudonym to double as both its identity token
   and its display label, so that no separate display-name concept is needed for unseated
   visitors.
8. As a developer, I want an anonymous session's pseudonym shaped visibly differently from a
   real seatId (`anonymous-`-prefixed word-word-random vs. a real seat's name-slug-hex), so
   that interpretation can tell a real occupant from a pseudonymous visitor without a separate
   flag.
9. As a player opening a Tabletop link that names their seat, I want the URL to carry
   `?seat=<seatId>`, so that the Tabletop page can know which occupancy I hold the moment it
   loads, without waiting to infer it from later events.
10. As the developer building `tabletop-view-rotation`'s deferred seat-relative Home, I want
    `?seat=` already available on the Tabletop URL, so that "which seat is this browser"
    (that ticket's explicit blocker) is solved once, here, rather than being re-solved per
    consuming feature.
11. As a developer sending `card.played`, I want to specify `owner` independently of
    `initiator`, so that a future case — a player moving a card into an opponent's zone, or an
    anonymous facilitator arranging someone else's cards — isn't foreclosed by the current
    code deriving one from the other.
12. As a developer reading `card.played`'s payload today, I want `owner` and `initiator.seatId`
    to keep the same value in every currently-existing call site (nothing plays a card into
    someone else's zone yet), so that this spec changes the *shape* of attribution without
    changing any currently-observable behavior.
13. As a developer tracing a join, I want the Shuffler to send its own `gameId` to the Spine at
    join time, purely so the Spine can log the correlation between its `seatId` and the
    Shuffler's `gameId` for tracing, so that a trace spanning both ships is easier to follow.
14. As a developer validating events against the contract, I want the envelope schema
    (`contracts/envelope.v1.json`) updated to describe the new `sessionId` field and the
    renamed table-position vocabulary, so that both the Spine and the TS apps validate the new
    shape instead of silently accepting or rejecting it by accident.
15. As a developer maintaining the Spine's `Table` model, I want `next_available_seat_number`
    and its callers renamed to talk about table position, so that the code's vocabulary matches
    the domain doc it now needs to agree with.
16. As a developer working on `.scratch/leave-and-join-table/spec.md` (already ready-for-agent,
    seat-release logic), I want this spec's seatId-format and sessionId changes to not disturb
    that spec's seat-release/clear behavior, so that the two land independently without either
    blocking the other.

## Implementation Decisions

### Table Position (rename)

- Rename "seat number" to **table position** in the Spine (`Table#next_available_seat_number`
  and its call sites in `models/table.rb`), in the Shuffler (`GameState.spineSeatNumber` and its
  call sites — the field name itself may stay `spineSeatNumber` if renaming the persisted-state
  field would force a persistence-version bump; rename the *prose*/local vocabulary at minimum,
  decide the field rename at ticket-writing time), and in `contracts/payloads/seat.taken.v1.json`
  (currently `payload.seat`) and its schema description.
- Purely a placement/layout fact, unchanged in behavior — still assigned sequentially, still
  reused across occupancies once a seat is freed (`leave-and-join-table`'s scope, not this
  spec's).

### Seat ID format

- Minted in the same place as today (`Table#prepare_seat` in `services/spine/models/table.rb`,
  still `SecureRandom` under the hood), but shaped `<player-name-slug>-<8hex>` instead of a bare
  UUID — mirroring `TableSlug.mint` (`services/spine/lib/table_slug.rb`) so a seatId reads as a
  name in Honeycomb traces the same way a table id already does. Collision handling: same
  reasoning as `TableSlug.mint`'s comment — a player-name-slug collision at the same table only
  matters combined with an (vanishingly unlikely) 8-hex suffix collision, no extra handling
  needed beyond what `SeatOccupied` already guards.
- Still Spine-minted, never Shuffler-minted — this was a real, corrected error in an earlier
  version of `notes/GLOSSARY.md`; don't reintroduce it.

### Session ID

- New field on the envelope's `initiator` (`contracts/envelope.v1.json`), alongside the existing
  `seatId`/`playerName`. Add `sessionId` as an optional property (matching `seatId`'s existing
  optionality — not every current sender has one yet) with a `description` documenting its
  per-context meaning, per the table already written in `CONTEXT-MAP.md`'s "Initiator" section.
- **Shuffler**: `initiator` becomes `{ gameId, seatId, sessionId }`. `gameId` is the durable
  anchor (already survives a refresh via existing persistence); `sessionId` is minted fresh on
  every page load — no client-side persistence needed, since `gameId` already anchors identity.
  Note `gameId` itself doesn't travel on the wire today (`Initiator` in
  `apps/shuffler/src/port-tabletop/types.ts` carries only `seatId`/`playerName`) — this spec
  adds `sessionId` to what's sent; whether `gameId` itself should also travel is the separate,
  minor decision below ("send gameId to the Spine at join," diagnostic only, not part of
  `initiator`).
- **Tabletop**: `initiator` becomes `{ seatId?, sessionId }` (when the Tabletop originates
  events itself — it doesn't emit any envelope-level events yet, so this shape becomes real the
  first time it does). `sessionId` must persist across a refresh via client-side storage — there
  is no other anchor. This is the Tabletop client's first use of `localStorage`/`sessionStorage`
  for anything (noted here since `tabletop-view-rotation`'s spec flagged the same absence).
- **Anonymous Session**: when there's no `seatId` (a spectator, or any Tabletop visit without a
  `?seat=` param), the client generates a pseudonym shaped `anonymous-<word>-<word><random>`
  (e.g. `anonymous-hippo-234134tr`) — a different shape than a real seatId's
  `name-slug-8hex`, so interpretation can tell the two apart without a separate flag. This
  pseudonym doubles as both the session's identity token (`sessionId`) and its display label; it
  persists across a refresh (client-side storage) but isn't meant to be permanent.

### `?seat=<seatId>` query param on the Tabletop URL

- `table_url` in `services/spine/app.rb` (today returns a bare `/t/<slug>`) grows a `?seat=`
  param carrying the seatId just minted for the calling player, so the URL the Shuffler receives
  from `/join` and hands to its player already identifies their seat.
- This is the concrete unblock for `.scratch/tabletop-view-rotation/spec.md`'s explicitly
  deferred "client-side which seat is this browser" scope. That spec's own seat-relative Home
  logic stays out of scope here (see Out of Scope) — this spec only makes the seat identity
  available on the URL; consuming it for view logic is that other spec's job.

### Owner vs Initiator (`card.played`)

- `buildCardPlayedEvent` (`apps/shuffler/src/port-tabletop/types.ts`) currently sets
  `payload.owner = initiator.seatId` unconditionally (line 81). Change its signature to accept
  `owner` as an independent parameter rather than deriving it from `initiator`.
- Every current call site (there is exactly one production caller today, via
  `sendCardPlayedToSpineBestEffort` in `apps/shuffler/src/port-spine/sendToSpine.ts`) passes
  `owner === initiator.seatId` — same observable value as today, since nothing yet moves a card
  into someone else's zone. This spec changes the shape, not the currently-observable behavior
  (user story 12).
- No schema change needed to `contracts/payloads/card.played.v1.json` — `owner` is already its
  own field there, independent of the envelope's `initiator`. The bug being fixed is entirely in
  how the Shuffler *populates* the payload, not the contract shape.

### Minor: `gameId` sent to the Spine at join (diagnostic only)

- The Shuffler's `/join`-equivalent call to the Spine should include its own `gameId` in the
  request body, purely so the Spine can log the correlation between the Shuffler's `gameId` and
  the seatId it mints, for tracing. This is not part of `initiator` on the wire (that's the
  Session ID decision above) — it's a join-request-only field, likely logged as a span attribute
  in `Table#prepare_seat`/`Table.join!`, not persisted to any model column unless a concrete need
  for that emerges later.

## Testing Decisions

- Fakes only, never mocks — the repo's house testing rule.
- **Spine**: `services/spine/test/models/table_test.rb` already has a dedicated event-shape
  assertion test for `seat.taken`/`seat.joined` (mirrored by `leave-and-join-table`'s planned
  `seat.left` test) — extend it to assert the new seatId format (`<slug>-<8hex>`, not a bare
  UUID) and the table-position payload key rename. `services/spine/test/test_helper.rb`'s
  envelope-building helpers need updating for `sessionId`.
- **Contract validation**: `contracts/envelope.v1.json`'s new `sessionId` field needs a
  contract-level test on both sides that already exercise contract validation —
  `apps/shuffler/test/port-spine/cardPlayedContract.test.ts` (Shuffler-side, mirrors the pattern
  fixed in `544c932b`) and the Spine's `lib/event_contract.rb` test coverage — proving an event
  with `sessionId` validates and one with the old bare-seat-number-shaped seatId does not
  regress silently.
- **Owner vs initiator**: extend `apps/shuffler/test/port-spine/sendToSpine.test.ts` (the same
  file `544c932b` added assertions to) with a case that passes a different `owner` than
  `initiator.seatId` into `buildCardPlayedEvent` and asserts the payload's `owner` reflects the
  explicit value, not a derived one — proving the decoupling actually decoupled, not just
  renamed a parameter.
- **`?seat=` URL param**: a Spine-level test (likely alongside the existing `/join` integration
  tests in `services/spine/test/integration/`) asserting `table_url`'s returned URL includes
  `?seat=<seatId>` matching the seat just minted.
- **Anonymous session pseudonym**: unit-test the Tabletop's pseudonym generator in isolation
  (format, persistence across a simulated refresh) — this is new client-side logic with no
  existing seam to extend; a small isolated unit test is the appropriate seam per
  `mattpocock-skills:codebase-design` guidance (don't force it through a browser test when a
  unit test answers the question directly).
- Per `docs/agents/coding-standards.md`: the `anonymous-` prefix and any other literal shared
  across ≥2 spec files must be exported as a named constant from whichever module defines it
  first, not hand-copied.

## Out of Scope

- **Actually consuming `?seat=` for seat-relative view logic** — the Home-orientation and
  card/zone-facing work `.scratch/tabletop-view-rotation/spec.md` explicitly deferred. This spec
  only makes the seatId available on the URL; that other spec (or its promoted TODO follow-on,
  `tabletop-card-orientation`) does the consuming.
- **Seat release / seat-leaving logic.** Fully owned by `.scratch/leave-and-join-table/spec.md`
  (already `ready-for-agent`). This spec's seatId-format change should land compatibly with
  whatever that spec builds, but doesn't re-decide any of its scope.
- **Any permission/authority system.** Restated from the domain doc: `initiator`/`sessionId`
  convey attribution, never authority. This fleet has no policing; a seated player, an anonymous
  visitor, or a stranger with a stale link can all act freely. Nothing here changes that.
- **Persisting `gameId` as a durable Spine model column.** The minor join-time `gameId` send is
  diagnostic/tracing only (see Implementation Decisions); if a real need to persist and query on
  it emerges later, that's separate work.
- **Migrating already-persisted seatIds in a running Spine database** to the new format. New
  seats mint the new format going forward; no backfill of historical UUIDs is in scope (there is
  no production data yet worth migrating, per the fleet's current stage).
- **A second Tabletop-side identity beyond `sessionId`/anonymous pseudonym** (e.g. persistent
  cross-visit accounts). Out of scope for the whole fleet at this stage, not just this spec.

## Further Notes

- This spec's decisions were reached in conversation on 2026-08-19 and are already recorded in
  `notes/GLOSSARY.md` (Seat ID, Table Position, Session ID, Anonymous Session, Owner vs
  Initiator, Player URL entries) and `CONTEXT-MAP.md` ("Initiator" and "Owner (Tabletop payload)
  ≠ Initiator (envelope)" sections) — those documents are the source of record if this spec and
  they ever drift; update both together if a ticket changes course from what's written there.
- Also raised in the same TODO.md entry, but explicitly separate from the attribution model
  above: a request for a custom Honeycomb span in the Spine for every event sent on the SSE
  streams (so the event sequence can be graphed), plus one for table creation / seat join. That's
  observability tooling, not attribution — track it separately (it's still sitting under `## Next`
  in `TODO.md`, not yet promoted to its own spec).
- Consult the `fleet-is-observable` owner before implementing the tracing-relevant pieces
  (the `gameId`-at-join span attribute, and any new attributes on seat-mint spans).

## Comments
