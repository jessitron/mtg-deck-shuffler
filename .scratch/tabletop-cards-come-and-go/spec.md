# Cards come and go — two-way card transit between the Shuffler and the Tabletop

Mountain: tabletop-replaces-mural
Ship: fleet
Status: ready-for-agent

Spec produced from [the map](map.md) and its four resolved tickets
([return channel](issues/01-return-channel.md), [event vocabulary](issues/02-event-vocabulary.md),
[round-trip identity](issues/03-round-trip-identity.md), [portal gesture](issues/04-portal-gesture.md)).
All decisions below were grilled with Jess (2026-08-08/09); this document synthesizes them —
it mints nothing new.

## Problem Statement

Cards flow one way. A player plays or discards a card in the Shuffler and it appears on
the Tabletop — but nothing ever comes back. A card on the table is stranded there:

- Dragging it anywhere on the table means nothing to the Shuffler; there is no gesture
  that sends a card home.
- The Shuffler's card modal has a **Return** button (Table → Revealed) that works today —
  but it tells the table nothing, so the card's shape lingers on the board. Worse, because
  the Tabletop dedups arrivals on instanceId-present-on-board, **re-playing that returned
  card is silently swallowed**: the Shuffler commits the move, the table shows nothing new.
- Undoing a play or discard in the Shuffler likewise leaves a ghost shape on the table.
- Commanders don't reach the table at all at seating, even though a Commander game starts
  with them in the command zone.
- The library furniture on the table links to nothing, even though every seat came from a
  specific Shuffler game.

Mural — the thing the Tabletop replaces — has none of these seams because it has no
Shuffler integration at all; the point of the Tabletop is that the two sides agree. Today
they drift apart the moment any card leaves the table on the Shuffler side.

## Solution

Make the table boundary two-way. Every way a card crosses it is decided and wired:

**Onto the table** (existing, refined): play and discard become distinct event kinds;
commanders arrive with the seat itself, standing in the command zone from the moment the
player sits down.

**Off the table** (new, both directions of initiative):

- **The library portal.** Drag a card over your own library on the table: a rotating
  two-color vortex arms over the library. Drop, and the card spins twice while shrinking
  into the library (~500ms) — everyone at the table sees the swallow — and lands in the
  Shuffler's **Reveal zone**, the in-between place where its owner chooses hand, top, or
  bottom of library. Anything attached to the card falls off and stays on the table.
- **Shuffler-initiated exits.** The card modal's Return button — and any other transition
  out of the Shuffler's `Table` location, including undo of a play or discard — now tells
  the table, and the shape poofs (attachments stay, detached).

**The plumbing that carries it:** the Tabletop learns, per seat, where its Shuffler lives —
two Shuffler-minted URLs ride the seating message. One is public (the library furniture
becomes a clickable link back to the game); one is a server-to-server **event inbox** that
speaks the `contracts/` envelope, so pointing the Tabletop at the Spine later is a URL
swap, not a redesign. Contract validation becomes real on every receiver this work
touches. Send-then-commit in both directions: neither side commits its state change until
the other confirms delivery.

## User Stories

1. As a player, I want to drag a card from the table onto my library, so that it returns
   to my Shuffler game without me switching windows.
2. As a player dragging a card over my library, I want the library to visibly arm (the
   vortex swirl), so that I know a drop here will swallow the card.
3. As a player who drops a card on the library, I want to see it inhaled — spinning and
   shrinking into the library — so that the exit feels physical rather than the card
   blinking out.
4. As a player, I want a card returned via the portal to land in my Shuffler's Reveal
   zone, so that I can then choose hand, top, or bottom of library with the tools I
   already have.
5. As a player, I want the portal to arm only on my **own** library, so that I can't
   accidentally (or deliberately) shove someone else's card into a game that has nowhere
   to put it.
6. As a player dragging a multi-selection, I want the drop destination decided by my
   pointer, so that dropping the group on my library swallows all of it — one gesture,
   one destination.
7. As a player, I want anything attached to a returning card (counters, tokens piled on
   it) to fall off and remain on the table, so that returning a card follows the same
   physics as graveyard and exile.
8. As a player, I want the card's shape to stay visibly on the table if the Shuffler
   couldn't be reached, so that a failed return never makes a card vanish into nothing.
9. As a player using the Shuffler's Return button on a table card, I want its shape to
   poof from the table, so that the two sides agree about where the card is.
10. As a player who returns a card and later plays it again, I want it to actually appear
    on the table, so that the round trip doesn't silently strand my card (today's dedup
    trap).
11. As a player who undoes a play in the Shuffler, I want the table to remove that card's
    shape wherever people moved it, so that undo works across the boundary.
12. As a player who undoes a discard in the Shuffler, I want the same poof, so that
    discard-undo isn't a special case.
13. As a table-mate, I want a card someone else returns/undoes to disappear from my view
    too (and its attachments to stay behind, detached), so that we all see the same board.
14. As a table-mate, I want the arming swirl to stay local to the dragger while the
    swallow animation is visible to everyone, so that my screen isn't lit up by other
    people's hovering.
15. As a Commander player, I want my commander(s) standing in my command zone the moment
    I sit down at the table, so that setup matches how a game of Commander actually starts.
16. As a Commander player, I want my seated commander to behave as an ordinary card —
    returnable to hand or library through the same exits as anything else — so that
    there's no special-case physics to learn.
17. As a player at the table, I want the library furniture to link back to its seat's
    Shuffler game, so that I can jump from the shared board to my private zones in one
    click.
18. As a player, I want a returned card to show the Shuffler's remembered face (the table
    is not authoritative for face), so that hidden-zone information never leaks from
    table-side flipping.
19. As a player whose discard is undone, I want the event to be distinct from "play was
    undone", so that the log — and someday the Interpreter — knows what actually happened.
20. As a deck owner, I want a crafted request that moves a table card out of the `Table`
    location through any Shuffler route (put-in-hand, put-on-top, put-on-bottom) to also
    notify the table, so that there is no back door that desyncs the board.
21. As the Shuffler, I want a generic event inbox rather than a card-return endpoint, so
    that future event kinds arrive without new plumbing and the Spine can interpose later
    by handing out a different inbox URL.
22. As the Tabletop server, I want the two Shuffler URLs delivered with the seating
    message and stored per seat, so that I never compose URLs and need zero
    Shuffler-related configuration.
23. As either receiver, I want incoming events validated against `contracts/` with
    unknown name/version rejected loudly, so that vocabulary drift fails at the boundary
    instead of corrupting state.
24. As a maintainer, I want discard split from play in the event vocabulary, so that the
    Tabletop routes on kind (not on a zone hint) and the event log tells the truth.
25. As a maintainer, I want undo kinds named by prefixing `undo.` to the full name of the
    event being undone, so that adding undo removes no information from the log.

## Implementation Decisions

### Transport and channel (ticket 01)

- **Transport stays direct** Shuffler↔Tabletop for this mountain. Every message conforms
  to the `contracts/` envelope (`name.vN`, validated payload) so re-pointing at the Spine
  later changes a URL, not the vocabulary.
- **`seat.joined` grows two Shuffler-minted URL fields:**
  - `gameUrl` — public, player-clickable address of the game; becomes the library
    furniture's link target.
  - `eventsUrl` — where the Tabletop *server* POSTs events back; the Shuffler mints it
    from the environment-appropriate base (localhost in dev, cluster-internal name in
    prod).
  - `gameId` may cross the boundary freely, same as `gameCardIndex` — there's no
    boundary guard to reason about here.
- **The Tabletop stores both URLs per seat**, in memory, never composes URLs, and needs
  zero Shuffler config. `seat.joined` replay on start/restart re-establishes the mapping
  after a Tabletop redeploy.
- **`eventsUrl` is a generic event inbox**, not a card-return endpoint: contracts-enveloped
  events dispatched on `name`, unknown name/version rejected loudly. Today it hears
  exactly one kind (`card.returned.v1`).
- **The table name IS the id.** No Spine-minted UUID exists; the return channel doesn't
  pretend otherwise.
- **Send-then-commit, mirrored both directions.** Tabletop→Shuffler: the card's shape is
  not deleted until the Shuffler returns 2xx — no 2xx, no poof; on failure the card
  visibly stays. This mirrors the Shuffler's existing send-to-table-first behavior.
- **No guard on the inbox.** Nothing in this app has logins; a capability-URL scheme was
  considered and rejected.
- The Shuffler has no inbound path addressed by `instanceId` today; the inbox handler
  must map `card.instanceId → GameCard` itself.

### Envelope amendments (`envelope.v1`, amended in place — ticket 02)

Free exactly now, with zero conforming producers or consumers; never again after this
ships.

- `tableId` drops `format: uuid`; pre-Spine, the table name is the id — one value, both
  roles, 1-1. Description rewritten to say so.
- `initiator` becomes the object `{ seatId?, playerName }`, matching what the fleet
  already speaks. `seatId` optional (a spectator has none).

### Event kinds (ticket 02)

- **`card.returned.v1` — one kind for both table exits**, distinguished by the envelope's
  `occurredIn`:
  - `occurredIn: "tabletop"`: the library portal swallowed it → Shuffler receives it on
    the inbox and moves the card to **Revealed**.
  - `occurredIn: "shuffler"`: any Shuffler-side transition out of the `Table` location
    (Return button; put-in-hand/top/bottom reached by crafted request; undo is separate,
    below) → Tabletop receives it and poofs the shape; attachments stay, detached.
  - Payload: `card: { scryfallId, instanceId }` (required), `seat: 1–4` (required),
    `fromZone` (optional; table geography from a zone hit-test at the card's pre-drag
    position; **absent** when `occurredIn: "shuffler"` — the Shuffler honestly doesn't
    know table geography).
  - **No `face` field and no `faceDown`** — "cards removed from play no longer have a
    face up." The Shuffler keeps its own `currentFace`; the table is NOT authoritative
    for a table card's face. Accepted consequence once table-flip lands: a table-flipped
    card returns showing the Shuffler's remembered face.
- **`card.discarded.v1` splits out of `card.played`.** Payload: `card`, `face`, `seat` —
  like `card.played` minus `zoneHint` (graveyard *is* its meaning; keeps `face` because a
  discard is public). Consequence: **`card.played.v1`'s `zoneHint` enum narrows to
  `stack | battlefield`**.
- **`undo.card.played.v1` / `undo.card.discarded.v1`** — undo kinds are named by
  prefixing `undo.` to the full name of the event being undone. Payload: `card` + `seat`.
  Tabletop effect for both: poof; attachments stay, detached. Informational — distinct
  from the opposite action.

### Seating (`seat.joined.v1` — ticket 02, converging with table-layout's extensions)

- Gains optional **`commanders`**: an array of 0–2 entries, each
  `{ card: { scryfallId, instanceId } }`, alongside `gameUrl`/`eventsUrl`. Commanders are
  ordinary GameCards in the Shuffler's CommandZone location with real instanceIds.
- **No `face` per commander** — a commander always arrives in the command zone face up;
  flipping it there afterward is table-local.
- On the pre-Spine wire the scaffolding fields ride along off-schema (`cardName`,
  `frontImageUrl`, `backImageUrl`), with the two-faced-cards owner's sharp edge honored:
  `backImageUrl` derived from the card's `twoFaced` flag, never from stored-URI presence.
- Once seated, a commander is an ordinary card: same exits as anything else.
- **`seat.taken` vs `seat.joined` are two different facts from two different flows**, not
  a divergence to unify: `seat.joined` (Shuffler→Tabletop) means a seat's game connected;
  `seat.taken` (Spine context) means someone sat down via the Spine's own join endpoint.
  Document the distinction in `contracts/README.md` and the glossary; convergence is
  map-5 work.

### Validation gets real (this map, not map 5 — ticket 02)

- Every receiver this work touches loads `contracts/` and validates on receipt: the
  Shuffler's new inbox from day one; the Tabletop's card-arrival and seat-joined handlers
  converted while their payloads churn anyway. Unknown name/version rejected loudly.
- This retires the hand-rolled "JES-128" if-chains and makes the TS side symmetric with
  the Spine's Ruby-side validation.
- Tabletop removal handlers identify shapes by the shape's `instanceId` **prop** (not
  shape meta), per the two-faced-cards owner.

### Round-trip identity (ticket 03 — facts that shape the build)

- `cardInstanceId` is minted once per card per game and never re-minted; a returned card
  re-played sends the **same** instanceId.
- The Tabletop's arrival dedup keys on shape-presence-on-board. Deleting the shape when
  the card exits is therefore the whole fix for re-play: the second arrival passes dedup
  and lands as a fresh shape, no identity change needed. The dedup's meaning stays
  exactly "one instance exists once, physically."
- **Any transition out of the `Table` location tells the table** — Return, and the
  sibling put-in-hand/top/bottom moves that can reach Table cards by crafted request.
  Close the hole by notifying on the transition, not by guessing which routes the UI
  exposes.

### The portal gesture (ticket 04 — prototyped live, Vortex · inhale won)

- **Arming:** while a card drags over the library — **pointer-keyed** — a rotating
  two-color swirl (pink/amber conic gradient) with a faint dark veil renders over the
  library. Local to the dragger.
- **Swallow:** on drop, the card spins twice while shrinking and fading into the
  library's center over ~500ms, then leaves the table. The swallow is a store write —
  everyone at the table sees it.
- **Pointer-keyed is standing policy** (recorded with the tabletop-shape-mechanics
  owner): the pointer picks the one destination, for a single card and for multi-select
  alike. A multi-select dropped on the library swallows the whole group.
- **Owner-gated: only your own library.** Same gate shape as the command zone's, sharing
  the `owner` card-prop dependency from table-layout ticket 18. Rationale: the return
  channel lands the card in the *owner's* Reveal zone, so a foreign card has nowhere to go.
- Send-then-commit sequences the gesture: swallow animation may play, but the shape's
  deletion is committed only on the Shuffler's 2xx; on failure the card visibly stays.
- Mechanics constraints learned from the prototype (they are decisions about *how*, made
  by tldraw's behavior):
  - The translate-end hook fires once per moving shape in a multi-select, and tldraw
    non-null-asserts each shape during settle — a hook must never synchronously delete a
    *sibling* moving shape, and should defer even self-deletion past the settle.
  - tldraw's shape animation interpolates only x/y/rotation/opacity; the shrink needs
    interpolated numeric props via the ShapeUtil's interpolation hook.
  - Arming visuals cannot render inside the zone shape (the opaque library image sits on
    top); they render in viewport space via the in-front-of-the-canvas layer, reading
    page→viewport so pan/zoom track correctly.
  - The existing armed signal fires for *any* translating shape; the portal must gate on
    card shapes only (a dragged counter must not threaten a swallow) — fold that gate
    into the shared signal.
- The winning variant is **rebuilt properly at implementation time**, not merged from the
  prototype branch (`prototype/portal-gesture-ticket-04`, preserved for reference).

### Schema files to write or amend at build time

`envelope.v1` (two amendments), `card.returned.v1` (new), `card.discarded.v1` (new),
`undo.card.played.v1` (new), `undo.card.discarded.v1` (new), `seat.joined.v1` (amend:
`gameUrl`, `eventsUrl`, `commanders` — the file now exists in `contracts/payloads/` from
table-layout work), `card.played.v1` (narrow `zoneHint`).

## Testing Decisions

Good tests here exercise **external behavior at the boundary**: an enveloped event goes
in, observable state comes out (a card's location in the Shuffler; shapes present or
absent in the Tabletop's store). No test should know how a handler is decomposed
internally. Fakes only, never mocks (house rule) — the fleet already has fake stores and
fake gateways in both ships' suites.

**Seams, highest first — all existing:**

1. **The event-handler seam, both ships.** The Tabletop already tests its receivers as
   handler functions fed request-shaped input against a fake room store
   (`cardArrival.test.ts`, `seatJoined.test.ts` are the prior art); the new removal
   handling and commander seating extend that suite, and the Shuffler's new event inbox
   gets the same treatment on its side: enveloped `card.returned.v1` in, card lands in
   `Revealed`, unknown name/version rejected loudly. Contract validation is part of this
   seam's behavior, not a separate unit.
2. **GameState transitions** (Shuffler unit tests, existing suite): any transition out of
   `Table` produces the outbound notification; undo of play/discard produces the undo
   events; send-then-commit ordering (no 2xx from the table → no location change is
   committed… and mirrored on the other side). Prior art: the existing GameState and
   port-tabletop test suites, including the event-builder tests
   (`cardPlayedEvent.test.ts` pattern for the `backImageUrl`-from-`twoFaced` treatment,
   which the commanders payload must repeat).
3. **Playwright verification** (both ships' `test/verification/`, existing convention)
   for the user-visible slice: the portal arming/swallow gesture (the prototype already
   left per-variant + multi-select smokes as prior art), the library link, the round-trip
   — return a card, play it again, see it actually land (the dedup-trap regression test).

No new seam is proposed. The one genuinely new surface — the Shuffler's event inbox —
sits at seam 1, which both ships already use.

## Out of Scope

- **Who deletes the table on restart** — the Spine's: it administers tables. Not the
  Tabletop's job (Jess, 2026-08-11). Restart's lingering-cards behavior, documented in
  ticket 03, stays as-is for now.
- **The eleven hidden-zone Shuffler actions** (draw, shuffle, mulligan, put-on-top/bottom
  as *hidden-zone* facts, …) — no counts on the table this mountain; Spine vocabulary for
  a Spine design effort (map 5 territory).
- **Tokens and duplicated cards** — table-only physics; their events go to the Spine
  someday, never to the Shuffler.
- **The Tabletop's own undo** — map 4's design question.
- **The Spine transport itself** — map 5, The table reports.
- **Hand or library counts on the table** — not Mural parity.
- **Rules enforcement** — standing fleet non-goal.
- **Unifying `seat.taken` and `seat.joined`** — documented as two facts; convergence
  waits for real traffic (map 5).

## Further Notes

- **Dependency:** the portal's owner-gating needs the `owner` card prop from
  table-layout's ticket 18 (in flight on that map). The gesture can build behind the
  gate's absence, but it must not ship un-gated — the Shuffler cannot handle someone
  else's card.
- **The "stuff falls off" rule is owned by the Physics map** (`.scratch/tabletop-physics/`);
  this spec points at it rather than restating it. Implementations of the poof and the
  swallow should invoke whatever that map built for graveyard/exile entry.
- The `library-links-to-shuffler` parked ticket is fully absorbed here (the library link
  is `gameUrl`); nothing of it remains elsewhere.
- The pointer-keyed policy created a recorded tension with the center-keyed generic
  `zoneAt()` hit-testing — the shape-mechanics owner's KB notes it for reconciliation
  when next touched; implementers of the portal should read that owner's context first.
- Owners to consult during implementation: `tabletop-shape-mechanics` (portal, removal,
  settle-time deletion), `two-faced-cards` (face fields, `backImageUrl` derivation,
  contract card/face payloads), `shuffler-looks-like-itself` (anything a player sees:
  vortex colors, library link affordance), `fleet-is-observable` (the new inbox route and
  outbound gateway are new places where something happens),
  `animations-*` (Shuffler-side, if the Reveal-zone arrival animates).
