# 21 — Announce physics gestures to Honeycomb

Mountain: tabletop-replaces-mural
Ship: tabletop
Type: task
Status: ready-for-agent

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

**Blocked by:** 12, 13, 15, 16, 17, 18, 19, 20 (translates gestures those tickets create)

- [ ] A single `store.listen()` translates settled mutations into the named vocabulary above,
      plus a generic `shape.moved`/`created`/`changed` fallback for everything else
- [ ] Each named occurrence and each fallback occurrence is recorded as a Honeycomb span via
      `inSpan()`, never a bare `console.log`
- [ ] Each announcement carries `actor` = tldraw's ephemeral per-session sync id
- [ ] Only cards and zones carry identity in an announcement; counters/notes carry text as an
      attribute only
- [ ] An undo-caused change surfaces as an ordinary vocabulary event (no distinct "this was an
      undo" marker)
- [ ] Verified in Honeycomb (`local` environment), not just by reading the code
