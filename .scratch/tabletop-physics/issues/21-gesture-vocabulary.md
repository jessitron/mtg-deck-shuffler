# 21 — Announce physics gestures to Honeycomb

Mountain: tabletop-replaces-mural
Ship: tabletop
Type: task
Status: done

**What to build:** A fixed vocabulary names gestures physics has semantics for:
`card.tapped`/`card.untapped`, `counter.attached`, `card.attachedBelow`/`noteAttached`,
`card.zoneMoved`, `card.flipped`, `card.turnedFaceDown`. Everything else that constitutes a
completed motion — in-zone repositioning, freeform doodles, any custom shape physics has no name
for — announces as generic `shape.moved`/`shape.created`/`shape.changed`. The bar for inclusion
is "a completed motion happened," not "physics judges it interesting." Never announce per-frame
drag positions, only settled motions.

Only cards (`instanceId`) and zones (`zone`/`seatId`) carry identity in an announcement; counters
and notes carry their text as a plain attribute, with no identity tracked across time. A
duplicated card announces `shape.created` plus a `copiedFrom` attribute — no new named word.

Every announcement carries `actor` = tldraw's own ephemeral per-session sync id, a stand-in for
real seat/player identity, which doesn't exist on the client today.

**Mechanism**: detection stays exactly where each gesture's own hook already computes it (a
card's `onTranslateEnd` for zone crossings, `onClick` for tap, a drop handler for counter/note/
card attachment — tickets 12–13, 15–20). Separately, the *announcement* is centralized in one
`store.listen()` (sitting beside or extending `useCardArrivalSpans.ts`) that watches the whole
document store for the resulting mutations and translates each into the vocabulary above via
`inSpan()` — a short-lived span per occurrence, per the `fleet-is-observable` owner's guidance.
tldraw's store mutation source is only ever `'user'` or `'remote'` (never `'undo'`), so an
undo-caused change surfaces as an ordinary vocabulary event.

Destination is Honeycomb telemetry only (`local` environment). The `card.moved` contract
payload, a Tabletop→Spine sender, and `contracts/` validation are explicitly out of scope — a
later Mountain's job.

**Blocked by:** 12, 13, 15, 16, 17, 18, 19, 20 (translates gestures those tickets create) — 20 is
wontfix, so `card.attachedBelow` names a gesture that has no code path (no card-as-passenger
mechanism exists); only `counter.attached` and `noteAttached` fire in practice.

**Resolved** 2026-08-10: `apps/tabletop/src/client/usePhysicsAnnouncements.ts`, a sibling to
`useCardArrivalSpans.ts`, wired into `TablePage.tsx` alongside it. One `store.store.listen({
source: "user", scope: "document" })` reads the diffs each existing gesture hook already
produces (`mtg-card`'s prop/meta.zone changes from `onClick`/`onTranslateEnd`, `parentId`
changes from `onDragShapesIn`) and calls `inSpan()` with `actor: TAB_ID` (tldraw's own
per-session sync id). `source: "user"` only — a remote peer announces its own gestures locally
with its own `TAB_ID`, so no cross-client attribution logic was needed.

The generic fallback (`shape.moved`/`shape.changed`) is debounced 300ms per shape id, not
announced straight off the diff stream: the `tabletop-shape-mechanics` owner confirmed
`Translating.ts` writes fresh x/y to the document store on every pointer-move during a drag (no
batching to settle), which named gestures don't hit (their writes are already single-shot) but
a literal per-diff fallback would have spammed one span per frame.

The old `console.log('zone-entry ...')` in `MtgCardShapeUtil.onTranslateEnd` (ticket 01's
descoped stand-in) is gone — `card.zoneMoved` (via this same `meta.zone` write) replaces it.
`verify-zone-entry.spec.ts` no longer asserts on that console output; it now asserts the
behavior (the card visually lands in the target zone) since the notification-exactly-once claim
moved to a mechanism a Playwright spec can't cheaply decode (real OTLP protobuf, batched).

`copiedFrom`/duplicated-card semantics are **not** implemented — the map's own "Not yet
specified" section says that's undecided, so a duplicated card announces bare `shape.created`
with no `copiedFrom` attribute, same as any other newly-added shape.

- [x] A single `store.listen()` translates settled mutations into the named vocabulary above,
      plus a generic `shape.moved`/`created`/`changed` fallback for everything else
- [x] Each named occurrence and each fallback occurrence is recorded as a Honeycomb span via
      `inSpan()`, never a bare `console.log`
- [x] Each announcement carries `actor` = tldraw's ephemeral per-session sync id
- [x] Only cards and zones carry identity in an announcement; counters/notes carry text as an
      attribute only
- [x] An undo-caused change surfaces as an ordinary vocabulary event (no distinct "this was an
      undo" marker)
- [x] Verified in Honeycomb (`local` environment, dataset `mtg-tabletop-web`): a manual
      Playwright drive (tap, untap, drag), page held open past `BatchSpanProcessor`'s 5s export
      delay, produced exactly one `card.tapped`, one `card.untapped`, and one `shape.moved`,
      each carrying `actor: TLDRAW_INSTANCE_STATE_V1_...` and the right `card.instance_id`. (The
      first attempt at this looked like a build failure and briefly got misdiagnosed as one — a
      git-worktree-without-`node_modules` artifact, not a code bug; see map.md. `./verify.sh`'s
      own spec run still shows nothing in Honeycomb, because it closes each page faster than the
      batch exporter's flush interval — a real gap in that harness for asserting on browser
      telemetry, tracked separately, not a defect in this ticket's code.)
