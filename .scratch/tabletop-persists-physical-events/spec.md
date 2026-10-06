# Tabletop persists physical events and owns the log-to-state projection

Mountain: spine-gathers-data
Ship: fleet
Status: ready-for-agent

Synthesized from a design discussion motivated by the unsolved `cards-jump-to-entry-position`
bug — see `apps/tabletop/notes/RESEARCH-cards-jump-to-entry-position.md`. Two decisions came
out of that discussion, folded in below as Implementation Decisions: the Tabletop (not the
Spine) owns the log-to-state projection, and a card's arrival gets two events
(`card.played` + `card.arrived`) because two different origins are involved.

## Problem Statement

Right now the Tabletop's card moves, taps, flips, and freeform shape edits are pure local
canvas mutations. None of them reach the Spine's event log. There is also no way to trigger
a check when the bug is suspected in the moment — a player who notices it has no button to
push and no record is kept of the fact that they noticed. That means Mountain 2's
promise — "every physical event a real game produces... crosses the Spine's one
append-only log per table" — is only half true today: `card.played`/`card.returned`
cross it, but everything a player's hands do to a card *after* it lands does not.

The concrete pain this causes: a player's cards on the Tabletop sometimes spatially snap
back to their entry position with no discernible cause (`cards-jump-to-entry-position`).
There's no record to consult — the live canvas state is the only state that ever existed,
so a discrepancy between what the table shows and what "really happened" is invisible.
There's nothing to diff against.

## Solution

Every physical thing a player does on the Tabletop — move a card, tap/untap, flip, turn
face down/up, and generic create/move/remove for any other canvas shape — becomes an
event in the Spine's log, the same way `card.played` and `card.returned` already do. The
Tabletop also gains a pure, headless projection from that log to a `TableState`, plus a
pure snapshot of the live canvas into that same `TableState` shape, so the two can be
diffed to answer "does the live table match its own history?" — turning an invisible
discrepancy into a visible, attributable one.

A player triggers that diagnostic directly: a small button floating over the canvas
(an angry-face 😠, spinning briefly to confirm the click registered, nothing more shown
on screen) runs the diff and reports it as telemetry — the full projected `TableState`,
the full live `TableState`, and the full discrepancy list, dumped as large JSON payloads
rather than summarized, since this is a targeted diagnostic tool, not routine
instrumentation.

## User Stories

1. As a player, I want every card move I make on the Tabletop recorded in the Spine's
   log, so that a later "why did my card move?" question has an answer.
2. As a player, I want tapping and untapping a card recorded, so that tap state survives
   a reload and is part of the game's history.
3. As a player, I want flipping a two-faced card recorded, so that which face is up is
   never just a rendering accident.
4. As a player, I want turning a card face down (and back up) recorded, so that
   concealment changes are auditable the same way everything else is.
5. As a player, I want freeform shapes I draw or move on the canvas (arrows, notes,
   tokens not yet modeled as their own type) recorded generically, so that the Mural-joy
   freeform layer isn't a blind spot in the log.
6. As Jess debugging a "cards snapped back" report, I want to replay a table's log into
   a `TableState` and compare it against the live canvas, so I can see exactly where and
   when the two diverged instead of guessing.
7. As a developer, I want the log-to-state projection to be a pure function with no
   dependency on a live Spine connection or a live tldraw canvas, so I can unit-test it
   with nothing but a list of events.
8. As a developer, I want the live-canvas-to-state snapshot to be a pure function too, so
   the diagnostic diff never needs a real Spine round-trip to run in a test.
9. As a developer building the later "load an existing table by replaying the log"
   feature, I want to reuse the same log-to-state projection this diagnostic uses, so the
   two never drift into disagreeing about what an event sequence means.
10. As a developer, I want the Spine to stay a pure, honest log — validating, storing, and
    replaying events, never computing a Table State of its own — so there's exactly one
    place (the Tabletop) that knows how to turn events into state.
11. As a developer, I want `card.played`'s existing shape untouched (still carrying no
    canvas position, since the Shuffler doesn't have one), and a new `card.arrived`
    (Tabletop-originated) event to carry the position a card actually landed at, so the
    two origins (domain decision vs. physical placement) stay two events instead of one
    event straddling two authors.
12. As a developer, I want every other new physical event (`card.moved`,
    `card.tapped`/`card.untapped`, `card.transformed`, `card.turnedFaceDown` — including the
    "back up" case, `shape.created`/`shape.moved`/`shape.removed`) to carry its position
    directly on the one event, since for these there's only one origin deciding it.
13. As a developer, I want the generic `shape.*` fallback to fire for any tldraw shape
    type that doesn't have its own dedicated event yet (untooled shapes: freeform arrows,
    notes, future token piles), so nothing on the canvas is invisible to the log by
    default.
14. As a developer, I want `card.moved`'s `significance` field left as a simple default
    (not yet distinguishing "moved within a zone" from "moved to a new zone") because
    "designated zone" isn't pinned down yet (see `notes/GLOSSARY.md`), and because
    `significance` doesn't affect Table State reconstruction — only interpretation, which
    is out of scope here.
15. As a developer, I want each new event's payload schema published under
    `contracts/payloads/`, contract-validated on both the Tabletop (send side) and the
    Spine (ingest side), following the existing `card.played.v1.json` shape for card
    identity (`scryfallId` + `instanceId`).
16. As a player whose Tabletop session drops and reconnects, I want physical events to
    replay through the same dedup-by-event-id path `card.played` already uses
    (`spineEventDispatch.ts`), so a reconnect never double-applies a tap or a move.
17. As a developer, I want every new Tabletop-originated event kind to skip itself when the
    Spine broadcasts it back over the Tabletop's own SSE subscription (the same
    `occurredIn === "tabletop"` self-echo skip the `card.returned` fix already uses), so the
    Tabletop never re-applies its own move/tap/flip/shape events to itself.
18. As Evelyn (a player, not a developer — the whole app is dev/admin-facing right now), I
    want a button on the Tabletop canvas I can push the moment I notice cards have piled up,
    so the diagnostic runs at the exact moment the bug is visible instead of after the fact.
    It's a floating button over the canvas (not a toolbar tool — a one-shot action, not a
    drawing tool), labeled with an angry-face emoji, available to any player with no gating.
    Clicking it spins the icon briefly as the only feedback — it doesn't show me the
    diagnosis, just confirms the click registered.
19. As Jess investigating a report Evelyn just filed, I want that button's click to run the
    full diagnostic (`projectEvents` + `snapshotCanvas` + diff) and record the result as
    telemetry: a span with summary attributes (shape count, discrepancy count, a match
    boolean, and a short list of discrepancy kinds), plus — when there is a discrepancy —
    the complete projected `TableState`, the complete live `TableState`, and the complete
    discrepancy list, each logged in full (not summarized down to fit a span; Honeycomb
    accepts up to ~1MB per event, and each of these three gets its own log entry so each
    can use that budget independently).
20. As a developer, I want `card.tapped`/`card.untapped`, `card.transformed`, and
    `card.turnedFaceDown` to carry `significance: "domain"` — these are always
    game-significant (it's *why* the menu actions to trigger them exist) — while
    `card.arrived`, `card.moved`, and the generic `shape.*` events default to
    `significance: "physical"` (per story 14's deferred zone-based refinement for
    `card.moved` specifically).
21. As a developer, I want every move-type event (`card.moved`, `shape.moved`) to carry
    both the prior and the new position (and zone, where the shape type has one) — not just
    the destination — so the diagnostic can also catch a gap (a logged move whose "from"
    doesn't match the end of the previous logged move for that shape), not only a final
    mismatch.

## Implementation Decisions

- **New `TableState` type**, owned by the Tabletop (`apps/tabletop`), independent of any
  tldraw or Spine dependency. It models what the log-to-state projection needs to
  reconstruct and what a canvas snapshot needs to produce: per-shape identity, kind,
  position, and kind-specific state (a card's tapped/faceDown/face; a generic shape's
  raw props). Exact field shape is an implementation detail of the projection module, not
  fixed by this spec — the requirement is that projection and snapshot produce values in
  the *same* shape so they can be diffed.
- **`projectEvents(events) -> TableState`**: a pure function, no I/O, no tldraw editor
  instance, no Spine client. Takes an ordered list of envelope+payload events (the shape
  already flowing through `spineEventDispatch.ts`) and folds them into a `TableState`.
  This is the log-to-state projection assigned to the Tabletop. It is the seam
  this spec's tests are written against, and it is the module the future "load table by
  replay" feature reuses — built once, so it never drifts from itself in two languages.
- **`snapshotCanvas(editor) -> TableState`**: a pure(-ish, in the sense of no network
  calls) function reading a live tldraw editor's shape records into the same
  `TableState` shape as `projectEvents`. This is new work beyond the original design
  discussion's text, needed to make the diagnostic check ("does the live table match the
  log?") concrete — both inputs to the diff must exist for it to run.
- **The diagnostic check** replays a table's full event history through
  `projectEvents`, snapshots the live canvas through `snapshotCanvas`, and diffs the two
  `TableState` values. Headless: no new Spine endpoint, no wire format for shipping
  `TableState` between ships.
  - **Not built in this pass**: a `TableState -> tldraw shape records` renderer. That
    direction is needed for the later "load an existing table by replaying the log"
    feature (including its planned animated catch-up), not for this diagnostic, and is
    explicitly out of scope below.
- **The diagnostic's trigger is a floating button over the canvas**, wired via tldraw's
  `InFrontOfTheCanvas` component slot (the same slot `LibraryPortalOverlay.tsx` already
  uses — a plain React element in viewport space, not a tldraw shape, not a toolbar tool,
  so it never touches shape selection/drag machinery). Labeled with a 😠 emoji (no custom
  icon asset for v1), rendered unconditionally for any player (no dev/admin gating — the
  whole app is currently dev/admin-facing), and spins briefly on click as the only visible
  feedback. Consulted `owners/fleet-design-language` and `owners/tabletop-shape-mechanics`
  during design; both confirmed this placement and that a player-facing affordance gets no
  special "debug" visual treatment.
- **The diagnostic's telemetry** wraps the run in a manual span (the Tabletop's `inSpan()`
  helper, per `owners/fleet-is-observable`), with summary attributes
  (`diagnostic.shape_count`, `diagnostic.discrepancy_count`, `diagnostic.match`,
  `diagnostic.discrepancy_kinds`). When `diagnostic.match` is false, additionally log (via
  the Tabletop's logger, one log call each) the full projected `TableState`, the full live
  `TableState`, and the full discrepancy list — deliberately as complete JSON dumps rather
  than the fleet's usual "cheap summary" span discipline, since this is a one-shot
  diagnostic tool (not routine instrumentation) and Honeycomb accepts up to ~1MB per
  event, with each log call getting its own budget.
- **Self-echo**: every new Tabletop-originated event kind reuses the `occurredIn ===
  "tabletop"` skip that the `card.returned` self-echo fix established
  (`apps/shuffler/src/port-spine/cardReturnedDispatch.ts`'s pattern, mirrored on the
  Tabletop's own dispatch) — an event the Tabletop just sent must not be re-applied when
  the Spine broadcasts it back over the same SSE subscription.
- **New contract payloads** under `contracts/payloads/`, each versioned independently per
  `contracts/README.md`'s policy, `occurredIn: "tabletop"`:
  - `card.arrived.v1.json` — Tabletop-originated; carries the landing position,
    `significance: "physical"`. Sibling to `card.played`, not a replacement for it.
  - `card.moved.v1.json` — carries both the prior and the new position (and zone),
    `significance: "physical"` defaulted per user story 14/20.
  - `card.tapped.v1.json` / `card.untapped.v1.json` (or one event with a boolean — match
    whichever precedent `card.played`/`card.played-face-down`'s sibling-events pattern
    favors) — `significance: "domain"` (story 20: these are always game-significant).
  - `card.transformed.v1.json` — records the resulting face, `significance: "domain"`.
  - `card.turnedFaceDown.v1.json` — covers both directions (down and back up); the
    resulting concealment state rides on the payload, `significance: "domain"`.
  - `shape.created.v1.json` / `shape.moved.v1.json` / `shape.removed.v1.json` — the
    generic fallback for any tldraw shape type without its own dedicated event; carries
    shape id, tldraw shape type, and raw position/props (`shape.moved` carries both prior
    and new position), `significance: "physical"`.
  - All card-identity fields follow `card.played.v1.json`'s precedent
    (`scryfallId` + `instanceId`), per `contracts/README.md`'s "Card Identity" section.
- **Emission seam**: extend the existing send-then-commit pattern
  (`sendCardReturnedToSpineBestEffort` in `src/server/sendCardReturned.ts`) rather than
  inventing a new one — one send function per new event kind, POSTing to the Spine's
  generic `POST /tables/:tableId/events`. On the client side, wire these into the
  *existing* hook points that already exist for tap (`cardTapClick.ts`) and move
  (`MtgCardShapeUtil.onTranslateEnd` / `handleTranslateEnd` in `cardZoneEntry.ts`) rather
  than adding new hooks — flip and turn-face-down need new UI affordances (there is none
  today) but should land on the same send path once triggered. The generic `shape.*`
  fallback needs its own hook(s), scoped to shape types with no dedicated event.
- **The Spine makes no code change to compute state.** It only needs the new payload
  schemas registered for contract validation (`services/spine/lib/event_contract.rb`)
  and to store/replay/broadcast the new event kinds like any other — no new endpoint, no
  new Ruby logic beyond schema registration.

## Testing Decisions

- **`projectEvents` is tested with nothing but hand-built event lists** — no server, no
  live Spine, no tldraw editor. Assert the resulting `TableState` for sequences covering:
  a card arriving, moving, tapping/untapping, flipping, turning face down and back up;
  interleaved events for multiple cards and multiple shapes; and a generic
  `shape.created`/`moved`/`removed` sequence for an untooled shape type. This is the
  highest-value seam in this spec — the same seam the later `TableState -> tldraw` and
  comparison work will also exercise, so get its shape right.
- **`snapshotCanvas` is tested against a real (in-memory) tldraw editor instance** —
  create shapes via the editor's own API, snapshot, assert the resulting `TableState`
  matches. No fakes for tldraw itself; this repo's "no mocks, fakes only" rule points at
  not faking tldraw's editor when a real in-memory one is cheap to construct, matching
  existing shape-util tests under `src/client/shapes/*.test.ts`.
- **The diagnostic (`projectEvents` + `snapshotCanvas` + diff)** gets an integration-style
  test: seed a known event list, apply the *same* events to a real editor via the
  existing dispatch path, snapshot, diff, and assert no discrepancy — plus a case that
  deliberately desyncs the canvas (mutate a shape without a corresponding event) and
  asserts the diff catches it. This is the test that proves the diagnostic actually
  detects `cards-jump-to-entry-position`-shaped bugs.
- **New send functions** (`card.arrived`, `card.moved`, etc.) follow
  `sendCardReturned.test.ts`'s existing pattern (a fake HTTP endpoint / captured fetch,
  no real Spine) — assert the right payload shape is POSTed on the right trigger.
- **Contract schemas** are validated the same way `card.played.v1.json` already is —
  ajv against example payloads — no new validation approach needed.
- **The diagnostic button and its telemetry** are tested by invoking the click handler
  directly (no real click simulation needed) against a captured span/log recorder, for
  both outcomes: a matching `TableState` pair (span only, `diagnostic.match: true`, no
  logs) and a deliberately desynced pair (span plus all three full-JSON log calls,
  `diagnostic.match: false`). Assert the spin animation is triggered on click regardless
  of outcome — it's the only feedback a player gets.
- **Self-echo skip** is tested the same way `card.returned`'s self-echo fix is: dispatch
  an event with `occurredIn: "tabletop"` back through the Tabletop's own event handling
  and assert it's a no-op, for each new event kind.

## Out of Scope

- **`TableState -> tldraw shape records`** (rendering a projected state onto a live
  canvas) and the "load an existing table by replaying the log" feature it enables,
  including any animated catch-up. This spec builds the projection those depend on but
  not the renderer itself.
- **Refining `significance` on `card.moved`** to distinguish physical vs. domain
  significance (e.g. "moved within a zone" vs. "moved to a new zone"). Blocked on
  "designated zone" being pinned down (`notes/GLOSSARY.md`), and doesn't affect Table
  State reconstruction — interpretation only.
- **The Interpreter reading these new events.** Mountain 3's territory; this spec only
  ensures the events exist and are correctly reconstructable.
- **Any change to how `card.played` or `card.returned` are shaped or sent.** Untouched;
  `card.arrived` is additive.

## Further Notes

- `Mountain: spine-gathers-data` per the tracker's table (Mountain 2, active) — this is
  squarely "every physical event... crosses the Spine's one append-only log."
  `Ship: fleet` because it touches `contracts/` (both ships validate against it),
  `apps/tabletop` (all the new code), and `services/spine` (schema registration only) —
  no single ship's `CLAUDE.md` covers the whole thing.
- Card identity conventions, and the "definition vs. instance" split, are documented in
  `contracts/README.md`'s "Card Identity" section — every new payload here should be
  consistent with it, not reinvent it.
