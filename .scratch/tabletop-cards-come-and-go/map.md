# Cards come and go — the table boundary is two-way

Mountain: tabletop-replaces-mural
Type: wayfinder:map

**Map 3 of six.** The chart above this one is
[The Tabletop replaces Mural](../../apps/tabletop/notes/DESIGN-tabletop-replaces-mural.md) — read it first
for the whole parity list, the other five maps, and why they're split this way.

## Destination

A **spec for two-way card transit between the Shuffler and the Tabletop, ready for
`/to-tickets`**. Every way a card crosses the table boundary is decided: onto the table
(play, discard, commanders at seating), off the table (drag into the library portal,
Shuffler-side undo of a play or discard), and what each crossing does to the card's
baggage and to the other side's state. Done when the decisions are made and written —
not built.

## Notes

- Skills every session should consult: `/grilling`, `/domain-modeling`. Read
  `docs/agents/issue-tracker.md` before writing into the tracker.
- **Ship: fleet.** This map is cross-ship by nature — Shuffler ↔ Tabletop, touching
  `contracts/`. Each ticket names the ships it actually reaches into.
- **Transport is decided** (see Decisions so far): direct Shuffler↔Tabletop through this
  mountain, but every new message conforms to the `contracts/` envelope so the Spine can
  interpose later without either end changing. Hold every vocabulary decision to that.
- The Shuffler's receiving machinery already exists: `GameState.ts` has the `Revealed`
  location and `CardMoveDestination = "Revealed" | "Hand" | "LibraryTop" | "LibraryBottom"`.
- Owners likely relevant: `tabletop-shape-mechanics` (portal drag/drop mechanics),
  `two-faced-cards` (event contract's card/face fields), `shuffler-looks-like-itself`
  (anything a player sees).
- The parked ticket `library-links-to-shuffler` (from the old
  `tabletop-card-physics-starter` map) was folded into
  [ticket 01](issues/01-return-channel.md) at charting — it's the same seat→game-URL
  mapping question.

## Decisions so far

Founding decisions from the charting session (Jess, 2026-08-08):

- **Transport stays direct through Mountain 1.** The end goal is that all events go via
  the Spine (which may translate), but the Spine has no clients yet and parity shouldn't
  wait on it. Every new message minted by this map conforms to the `contracts/` envelope
  (`name.vN`, validated payload) so "via the Spine" later is re-pointing a URL, not a
  redesign.
- **One portal off the table: the library furniture.** Drag a card over it, it changes
  appearance to show it's about to swallow the card, and the card lands in the Shuffler's
  **Reveal zone** — the in-between place where the player chooses hand, top, or bottom of
  library. No hand target on the table, no menu on the canvas.
- **"Undo: play" and "undo: discard" are their own event kinds** — informational, distinct
  from the opposite action. When the Tabletop receives one, the card poofs wherever people
  moved it; anything attached remains on the table, detached.
- **Entering the portal = entering graveyard or exile: the stuff falls off.** One rule,
  owned by the [Physics map](../tabletop-physics/map.md); this map points at it rather
  than minting a new one.
- **No hand or library counts on the table this mountain** (Mural doesn't show them, so
  they're not parity). Therefore the hidden-zone Shuffler actions (draw, shuffle,
  mulligan, put-on-top/bottom, …) leave this map entirely — they're Spine-vocabulary
  work for a Spine-side design effort (Mountain 2 / map 5 territory).
- **Restart/new game: the Tabletop does not clear itself.** Something *outside* the
  Tabletop is responsible for deleting that table and starting a new one under the same
  name. (Amended 2026-08-08, after ticket 03's research showed no shape-deletion path
  exists — Jess: that's correct, and it stays that way; the cleanup responsibility lives
  elsewhere.)
- **Tokens and duplicated cards are table-only.** Tokens appear from nowhere — people
  paste whatever they want and the table says "shape created, I guess." Duplicated cards
  are not cards. Both send events to the Spine eventually, **never** to the Shuffler.
- [Round-trip identity and today's actual boundary behavior](issues/03-round-trip-identity.md) (2026-08-08) — instanceId is minted once per card per game and never re-minted, so a returned card re-played is silently swallowed by the Tabletop's shape-presence dedup unless its shape was deleted from the board; restart today clears nothing (only seat.joined is re-sent, deduped as already-seated, and no code path deletes shapes — old cards linger); and charting missed a live out-of-Table transition: the card modal's "Return" button moves Table→Revealed via the unguarded `moveByGameCardIndex`, pushing nothing to the Tabletop.
- **The Shuffler's Return button is a table exit** (2026-08-08, from ticket 03's finding
  3): it must have the same effect as dragging the card onto the library portal — the
  card poofs from the table, the stuff falls off. Any Shuffler-side transition out of the
  `Table` location tells the table; the message shape belongs to
  [the vocabulary ticket](issues/02-event-vocabulary.md).
- **Commanders start on the table, in the command zone, as part of sitting down.** The
  commander info rides in the initial seating message (leaning that way — it's setup, not
  card traffic; final payload shape confirmed by the vocabulary ticket). Once seated, a
  commander is an ordinary card: it can return to hand or even the library through the
  same exits as anything else.

- [The return channel — how the Tabletop addresses the Shuffler](issues/01-return-channel.md)
  (2026-08-08) — `seat.joined` grows two Shuffler-minted URLs: `gameUrl` (public, the
  player-clickable library link) and `eventsUrl` (a generic contracts-enveloped event
  inbox the Tabletop server POSTs to — later re-pointed at the Spine without the Tabletop
  changing). No `gameId` crosses the boundary; the table name is the key. Send-then-commit:
  no 2xx, no poof. No guard on the inbox — nothing in this app has logins.

## Not yet specified

- **Edge gestures at the portal** — multi-select drags, dragging a card out of a
  graveyard/exile stack straight into the portal. May need decisions once the prototype
  shows the feel; can't be phrased sharper than that yet.
- **What the poof looks like** — the appearance of a card being un-played or swallowed.
  A design/feel question that the prototype and the `/design` gallery flow can carry;
  not sharp enough to ticket until the mechanics are decided.
- **Who deletes the table on restart** — decided to be something outside the Tabletop,
  but *which* component, triggered how, isn't specifiable yet; it touches map 6 (what
  survives a restart) and possibly the Spine. Revisit when those sharpen.

## Out of scope

- **The eleven hidden-zone Shuffler actions** (draw, shuffle, mulligan, flip-in-hand,
  put-on-top/bottom, …) — ruled out at charting (2026-08-08): no counts on the table
  this mountain, so these are Spine vocabulary for a Spine design effort, not table
  parity. The chart's map-3 row was updated to match.
- **Tokens and duplicated cards** — table-only physics; their events go to the Spine
  someday, never to the Shuffler. The dupe case ("dupes are not cards") is real but not
  parity.
- **The Tabletop's own undo** — map 4's "undo is a design question, not a wiring one."
- **The Spine transport itself** — map 5, The table reports.
- **Rules enforcement** — standing fleet non-goal.
