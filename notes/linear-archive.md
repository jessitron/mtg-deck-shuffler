# Linear archive — MTG Deck Shuffler

Point-in-time snapshot of every issue in team "jessitron", project "MTG Deck Shuffler" or no project, taken 2026-08-06 by `scripts/snapshot-linear.sh`.

This is an **archive, not a tracker** — nothing here is live and nothing here is worked.
It exists so the content survives archiving the Linear project, greppable offline and on
every machine. Live work is in `TODO.md` (inbox) and the tracker named in `SEAMAP.md`.

68 issues.

---

## JES-155 — Converge the Shuffler's design drift: resolve the six open choices

- **URL:** https://linear.app/honeycombio/issue/JES-155
- **State:** Todo (unstarted)
- **Project:** MTG Deck Shuffler
- **Priority:** Medium
- **Created:** 2026-08-02

The Shuffler has a real design language (Orbitron/Ovo/Risque, the purple-pink tokens, outset bevels, square corners on chrome, the 200px card unit) plus significant drift — 57 distinct hex values, mostly Material and Bootstrap defaults that arrived one button at a time.

The gallery at `/design` now stages six decisions with their options side by side. Jess has answers; this issue is implementing them.

**Start here:** `owners/shuffler-looks-like-itself/open-choices.md` — each choice with its options, exact `file:line` implementation sites, and a resolve checklist.

The six:

1. Canonical button press behaviour — today's lift-and-shadow · Comeau `.pushable` (faithful, needs 3 nested spans across 82 `<button>` tags in 17 files) · `.pushable-flat` (same feel, drop-in, no markup change)
2. Secondary-button gray — `#6c757d` · `#607d8b` · `--deep-space`
3. Card-modal action buttons — keep seven color-coded hues · collapse to primary/secondary
4. Corner radius on chrome — truly `0` · a single `4px`
5. Focus ring — dark-pink flush · light-pink offset · light-on-dark-halo. Note this is the accessibility item: two rules currently set `outline: none` and replace it with a border-colour change
6. Text input treatment — precon-search · join-table · tokenized proposal

Mechanical cleanups that fall out once these are settled: tokenize the surviving orphan hexes, de-duplicate the three copy-pasted CSS blocks (modal, flip, library-list), collapse the second `:root` in `docs.css`, delete the `border: 0px solid red` debug leftover, adopt a spacing scale.

One choice per commit. Consult the `shuffler-looks-like-itself` owner (`-context` before, `-review` on the plan, `-update` after).

Landed so far: `970b08d` (the gallery), `0dc0237` (the owner), `b2a12fc` (the work list).

---

## JES-154 — Tabletop: wire card zone-entry events to the Spine

- **URL:** https://linear.app/honeycombio/issue/JES-154
- **State:** Backlog (backlog)
- **Project:** (none)
- **Priority:** No priority
- **Relations:** inverse blocks ← JES-149
- **Created:** 2026-08-01

Follow-up to [JES-149](https://linear.app/honeycombio/issue/JES-149) (Tabletop card zone-entry events, custom ShapeUtil for graveyard/exile/library drag detection). [JES-149](https://linear.app/honeycombio/issue/JES-149) deliberately scopes itself to telemetry only — see the comment on that ticket (2026-08-01):

> the real target for zone-entry events is the Spine, but wiring that up is a separate, larger design question — there's no existing contract payload for a zone-move event (`contracts/payloads/` currently only has `card.played`, `seat.taken`, `table.created`), and today's Spine dataflow is one-directional (Shuffler→Spine, Spine→Tabletop); reporting zone-entry would be a *new* Tabletop→Spine direction plus a new contract payload (e.g. `card.moved`) and event-log semantics.

This ticket is that follow-up. Scope:

1. A new contract payload (e.g. `contracts/payloads/card.moved.v1.json`, or similarly named) describing a card's zone-entry — instanceId, from-zone, to-zone, occurredAt, initiator.
2. A Tabletop→Spine sender: today only Shuffler→Spine and Spine→Tabletop exist (SCAFFOLDING endpoints), so this is a new direction of data flow entirely.
3. A Spine endpoint (or subscription mechanism) to receive it and an event-log entry.

Depends on [JES-149](https://linear.app/honeycombio/issue/JES-149) landing first (the client-side detection mechanism this event reports on).

---

## JES-153 — Sort the game screen's Library Search and Cards on Table alphabetically

- **URL:** https://linear.app/honeycombio/issue/JES-153
- **State:** Done (completed)
- **Project:** MTG Deck Shuffler
- **Priority:** High
- **Relations:** related → JES-142, related → JES-152
- **Created:** 2026-08-01
- **Completed:** 2026-08-03

**What surfaced it:** Jess played a real game on 2026-08-01 and found the game-screen Library Search modal wasn't alphabetical. Investigation: it never was — position order is the documented, intended behavior, and the alphabetical impression came from the **prep** screen, which sorts its deck by name (`src/app.ts` ~line 341, "Sort cards alphabetically for the prep review screen"). Same modal template, two different orders.

**Decision (from game experience):** the game screen should be **alphabetical** too. When a card says "search your library for a Forest," you are *finding*, not reading positions — and you shuffle afterward anyway. Position order gets a way back in via [JES-152](https://linear.app/honeycombio/issue/JES-152).

Cards on Table should be alphabetical for the same reason.

## Scope

**1. Library Search on the game page → alphabetical**

* `apps/shuffler/views/partials/library-modal.ejs` — the ungrouped list, and the card order *within* each type group when grouped.
* `apps/shuffler/src/app.ts` — `/library-modal/:gameId` (~501–541), where library cards are mapped for the template.
* ⚠️ **Do not change** `GameState.listLibrary()` **to sort by name.** It returns position order and that is load-bearing: draw, Put on Top, and Put on Bottom all depend on `location.position`. Sort for **display only**, at the route or template.
* The prep route (`/prep-library-modal/:prepId`) is already alphabetical — this makes the two consistent rather than changing prep.

**2. Cards on Table → alphabetical**

* `apps/shuffler/src/view/play-game/game-modals.ts` — `formatTableCardListHtmlFragment()` / `formatTableModalHtmlFragment()`.
* Note: `listTable()` filters `gameCards`, and `GameState.validateInvariants()` enforces that `gameCards` stays sorted by card name — so this list is **already alphabetical, incidentally**. Verify that in the running app; if it holds, make the ordering **explicit** and pin it with a test rather than leaving it as a side effect of an unrelated invariant.

**3. Documentation — the bulk of the work.** Position order is asserted in a lot of places:

* `notes/DESIGN-interface.md` lines 31, 63, and the mockup at 129 ("ordered by position", "99 cards in library, ordered by position")
* `owners/library-search/README.md` — Design Philosophy (line ~29, "shows card positions (top to bottom)") and the Feature Summary row "Cards shown … sorted by position"
* `owners/library-search/architecture.md` — data-flow comment "renders flat list in library order" (~line 24) and the GameState Integration section
* `notes/FEATURE-card-type-grouping.md` line 26 — "Clicking again returns to library order"
* Run the `library-search-update` skill afterward so `history.md` records the reversal and *why* (game experience), not just the change.

**4. Tests**

* E2E (Playwright) asserting alphabetical order in the game library modal, ungrouped and within a type group, plus the Cards on Table modal.
* Existing `test/verification/verify-library-grouping.spec.ts` may assert the old ordering — check it.

**Sort key — decided:** the **canonical card name**, always — never the currently-shown face. Cards have names, faces have names, and the library contains *cards*, not faces; the canonical name already contains both face names (`Front // Back`). So a flipped card does not move in the list. This is now written down in `notes/GLOSSARY.md` under "Card vs Face".

**Consult:** the `library-search` owner (both `-review` and `-update`), and `two-faced-cards`.

**Why it matters:** this is the actual "search your library" flow, and it's the one piece of the app real players ([JES-142](https://linear.app/honeycombio/issue/JES-142)) have complained about.

---

## JES-152 — Offer library-position order in the game's library search (for debugging)

- **URL:** https://linear.app/honeycombio/issue/JES-152
- **State:** Backlog (backlog)
- **Project:** MTG Deck Shuffler
- **Priority:** Low
- **Relations:** related → JES-142, inverse related ← JES-153
- **Created:** 2026-08-01

**What surfaced it:** Playing a real game on 2026-08-01, Jess noticed the game-screen Library Search modal isn't alphabetical and expected it to be. It turns out position order is the documented, intended behavior — but for the actual task ("search your library for a Forest") alphabetical is far more useful. We're changing the game screen to alphabetical (see the related issue).

**The ask:** Don't lose position order entirely. Seeing the library in true top-to-bottom order was genuinely useful for **debugging** — confirming a shuffle happened, checking what Put on Top / Put on Bottom actually did, verifying draw order.

**Shape (not decided):** most likely a sort toggle in the library modal, sitting alongside the existing "Group by Type" toggle — e.g. `?sortBy=position` as a peer of `?groupBy=type`. Whether it's player-facing or tucked behind the debug menu is open.

**Files it would touch:**

* `apps/shuffler/views/partials/library-modal.ejs` — the toggle and the list ordering
* `apps/shuffler/src/app.ts` — `/library-modal/:gameId` route (passes the sort choice through)
* `apps/shuffler/src/GameState.ts` — `listLibrary()` already returns position order; that stays the source of truth, display order is layered on top

**Why it matters:** Position order is the only window into library ordering the app has. Once the default flips to alphabetical, there's no way to see what a shuffle or a Put on Top actually did — which makes a whole class of bugs invisible.

---

## JES-151 — Tabletop: table state doesn't survive a restart (needs real persistence)

- **URL:** https://linear.app/honeycombio/issue/JES-151
- **State:** Backlog (backlog)
- **Project:** (none)
- **Priority:** Low
- **Relations:** related → JES-140, inverse blocks ← JES-149, inverse blocks ← JES-144
- **Created:** 2026-08-01

From todo.md: "persistence. Right now, shutting down the app and starting it up, the table is gone."

**Decided (2026-08-01): persistence will be built on top of events, and it depends on [JES-149](<https://linear.app/honeycombio/issue/JES-149>)/[JES-144](<https://linear.app/honeycombio/issue/JES-144>) landing first.** Jess wants event-sourced persistence — but there's no semantic game event to source from yet. Today's only events are raw tldraw sync-protocol diffs (shape moved to x,y) flowing through `TLSocketRoom`; that's not "card was exiled" or "card was rotated," it's shape-level noise. [JES-149](https://linear.app/honeycombio/issue/JES-149)/144's custom `ShapeUtil`s (`onDropShapesOver`, `onRotateEnd`, `onTranslateEnd`) are what turn drags into named domain events, the same shape as the existing `seat.joined`/`card.played` SCAFFOLDING events. Once those exist, persistence means logging them (likely to the Spine's event log, per [JES-140](https://linear.app/honeycombio/issue/JES-140)'s design vision) and replaying on room startup — not snapshotting raw tldraw state, which would be a different, throwaway approach.

Also matters for **testing** (Jess: "persistence is gonna wind up mattering for testing") — worth keeping that in mind when the event shapes get designed: they should be replayable/fixturable for tests, not just live-only.

**Current state (confirmed):** `apps/tabletop/src/server/rooms.ts` holds each table as a `TLSocketRoom` — in-memory only, no snapshot/load-on-boot anywhere in the server.

---

## JES-150 — Tabletop: lands should leave a gap between each other and the playmat edge

- **URL:** https://linear.app/honeycombio/issue/JES-150
- **State:** Backlog (backlog)
- **Project:** (none)
- **Priority:** Low
- **Created:** 2026-08-01

From todo.md: "lands should leave a space between each other and the side of the playmat"

**Current state:** `landPosition()` in `apps/tabletop/src/server/cardLayout.ts` (lines ~92-97) fills the playmat's bottom half left-to-right with wrapping, per DESIGN.md's spec — but per this note it currently butts lands up against each other and the playmat edge with no gap. Small geometry fix: add a margin constant to the left-to-right fill and to the wrap.

---

## JES-149 — Tabletop: card zone-entry events (dragged into graveyard/exile/library) — essential game mechanic

- **URL:** https://linear.app/honeycombio/issue/JES-149
- **State:** Backlog (backlog)
- **Project:** (none)
- **Priority:** High
- **Relations:** blocks → JES-154, blocks → JES-151
- **Created:** 2026-08-01

From todo.md, reframed: "card was dragged into the graveyard" / "card was dragged from here to here" are essential game events (Jess: this is not cosmetic, it's core to whether this architecture works at all).

**Architecture question answered — yes, tldraw supports this.** Confirmed by reading the installed `tldraw@5.2.5` type declarations directly (`node_modules/@tldraw/editor/dist-cjs/*.d.ts`):

* `ShapeUtil.onDragShapesOver(shape, shapes, info)` / `onDropShapesOver(...)` fire on a *target* shape when another shape is dragged over / dropped onto it — this is the same mechanism tldraw's own frame shape uses to reparent shapes dropped into it. This is the primitive for "card dragged into the graveyard/exile/library."
* `ShapeUtil.onTranslate(initial, current)` / `onTranslateEnd(initial, current)` fire on the moving shape — gives "card moved from here to here."

**The catch:** none of this fires today because cards and the zone regions (graveyard/exile/library/playmat) are stock tldraw `image`/`geo` shapes with no custom `ShapeUtil` at all (`apps/tabletop/src/server/cardArrival.ts`, `tableFurniture.ts` build them server-side as plain shape records; `TablePage.tsx` renders a bare `<Tldraw store={...}>` with no `shapeUtils` registered). Getting these events means:

1. A custom `ShapeUtil` for cards (to hook `onTranslateEnd`), registered client-side via `<Tldraw shapeUtils={[...]}>`.
2. A custom `ShapeUtil` for the zone regions (to hook `onDragShapesOver`/`onDropShapesOver`), or at minimum giving them a distinguishable shape type so drop detection can target them.
3. Wiring detected zone-entry to whatever downstream needs to know (Spine event, in-memory game state, etc. — TBD).

This is the architecture spike. Do this before investing further in cosmetic tickets ([JES-145](https://linear.app/honeycombio/issue/JES-145)/146/147/148/150) — see [AGENT-NOTES.md](<https://github.com/jessitron/mtg-deck-shuffler>) "Tabletop gotchas" for the full finding.

---

## JES-148 — Tabletop: exile box — distance from library, height, border, label

- **URL:** https://linear.app/honeycombio/issue/JES-148
- **State:** Backlog (backlog)
- **Project:** (none)
- **Priority:** Low
- **Created:** 2026-08-01

From todo.md: "Exile needs to be a little distance from the library. It also needs to be taller than a card. So the library probably needs a border around it and a label."

**Current state:** per DESIGN.md, exile is already specced as a ~240×238 box beside the library in the right-hand column (`apps/tabletop/src/server/cardLayout.ts` / `tableFurniture.ts`). This ticket is about refining that: adding a gap between library and exile, making exile taller than one card, and giving the library its own border + label (today the library is just a card-back image or bare box, per `tableFurniture.ts:67-82,150-156` — no label, no border). All prop/geometry tweaks to `regionShape()`/`imageShape()` calls and the column layout math, not new shape types.

---

## JES-147 — Tabletop: center cards landing on the Stack above the playmat

- **URL:** https://linear.app/honeycombio/issue/JES-147
- **State:** Backlog (backlog)
- **Project:** (none)
- **Priority:** Low
- **Created:** 2026-08-01

From todo.md: "the card should land in the stack centered above the player's playmat"

**Current state:** `stackCardPosition()` in `apps/tabletop/src/server/cardLayout.ts:81-83` piles cards from the Stack strip's top-left corner, cascading by `stackCount * 36px` horizontally / `stackCount * 14px` vertically. Not centered at all today. Straightforward geometry fix — center the pile horizontally over that seat's playmat width instead of anchoring at the strip's left edge.

---

## JES-146 — Tabletop: playmat cosmetics — rounded corners, thick black border, remove dotted outline

- **URL:** https://linear.app/honeycombio/issue/JES-146
- **State:** Backlog (backlog)
- **Project:** (none)
- **Priority:** Low
- **Created:** 2026-08-01

From todo.md (bundled, same shape):

* Playmat needs rounded corners and a thick black border.
* The gray dotted line currently visible around the playmat shouldn't be there.

**Current state:** the playmat is a tldraw `geo` rectangle built by `regionShape()` in `apps/tabletop/src/server/tableFurniture.ts`, which already parameterizes `dash`, `fill`, `color`, `opacity` etc. — the dotted line is very likely today's `dash: "dashed"` default and is a one-line prop fix. The border-color/weight is similarly a prop tweak.

**Rounded corners are not a prop tweak** — tldraw's `geo` shape doesn't expose a corner-radius option. Getting actual rounded corners means either a custom shape (SVG/custom `ShapeUtil`) or faking it with an image asset for the playmat background. Worth deciding which before starting; may want to fold this into the same custom-shape work as the card context-menu ticket if a custom `ShapeUtil` ends up being built anyway.

---

## JES-145 — Tabletop: link the library back to the Shuffler

- **URL:** https://linear.app/honeycombio/issue/JES-145
- **State:** Backlog (backlog)
- **Project:** (none)
- **Priority:** Low
- **Created:** 2026-08-01

From todo.md: "Can we make the library link back to Deck Shuffler?"

Quick win — the library shape's `url` prop is already a first-class tldraw field, currently hardcoded to `""` in both code paths in `apps/tabletop/src/server/tableFurniture.ts` (the image variant and the `regionShape` fallback). Setting it to the Shuffler's game URL for that seat should be enough for tldraw's stock click-to-open behavior to work. Need to figure out what URL to point at (per-seat game screen? needs seatId→Shuffler game URL mapping) since the Tabletop doesn't currently know the Shuffler's URL for a given seat.

---

## JES-144 — Tabletop: custom card context menu — rotate, flip, remove crop/download

- **URL:** https://linear.app/honeycombio/issue/JES-144
- **State:** Backlog (backlog)
- **Project:** (none)
- **Priority:** High
- **Relations:** blocks → JES-151
- **Created:** 2026-08-01

From apps/tabletop/notes/todo.md — rotation is essential (Jess: "so is rotating"), the menu cleanup and flip are secondary and can ride along once the custom shape work exists:

* Rotate a card 90° by clicking it. **Essential.**
* The card's popup menu should drop "crop" and "download", keep "alt" and "replace media", and add "rotate". (secondary, cosmetic-ish)
* Add a way to flip cards (MDFC front/back), ideally from the same submenu. (secondary — worth keeping bundled since it's the same `ShapeUtil` investment, but not the priority driver)

**Current state (confirmed by code read):** cards in the Tabletop are stock tldraw `image` shapes (`apps/tabletop/src/server/cardArrival.ts`) with no custom `ShapeUtil` and no context-menu override — `TablePage.tsx` renders a bare `<Tldraw store={...} />`.

**Architecture confirmed:** `ShapeUtil.onRotateStart(shape)` / `onRotate(initial, current)` / `onRotateEnd(initial, current)` exist exactly for this (verified against the installed `tldraw@5.2.5` `.d.ts`, same investigation as [JES-149](https://linear.app/honeycombio/issue/JES-149)). Rotation is a real, supported hook — not a dead end. It needs the same custom card `ShapeUtil` that [JES-149](https://linear.app/honeycombio/issue/JES-149)'s zone-entry detection needs (`onTranslateEnd`), so these two tickets share one client-side investment: give cards a custom `ShapeUtil`, registered via `<Tldraw shapeUtils={[...]}>` in `TablePage.tsx`.

Menu curation (crop/download/rotate) and flip are lower priority than the rotate mechanic itself and than [JES-149](https://linear.app/honeycombio/issue/JES-149) — do them once the card `ShapeUtil` exists for other reasons, not as the reason to build it.

---

## JES-143 — Tabletop: tap lands and rotate cards for summoning sickness

- **URL:** https://linear.app/honeycombio/issue/JES-143
- **State:** Backlog (backlog)
- **Project:** MTG Deck Shuffler
- **Priority:** No priority
- **Relations:** related → JES-140
- **Created:** 2026-08-01

**What surfaced it:** Real user feedback (2026-08-01) from Jess's college kid and their friends, playing on the Tabletop.\n\n**Request:** An easy way to (1) tap a land (typically: rotate 90° to show it's spent for mana) and (2) turn a creature card upside-down/sideways to represent summoning sickness. Both are common MTG table conventions communicated via card orientation.\n\n**Why it matters:** These are core, frequent actions in any real MTG game — without an easy in-app way to do them, players have to track tapped/sick state out-of-band, which defeats the point of a shared visual table.\n\n**Related context:** `apps/tabletop/notes/todo.md` already has an untriaged note from Jess: "We must be able to rotate cards. Ideally, clicking on a card turns it 90 degrees" — plus a request for a 'rotate' option in the card's popup menu. That's likely the same underlying mechanism (card rotation) that would serve both tapping lands and summoning sickness. Worth scoping together rather than as two separate rotation features.\n\n**Depends on:** the player-area/table rework ([JES-140](https://linear.app/honeycombio/issue/JES-140), done) being in place, since this is about interacting with cards once they're on the table.

---

## JES-142 — Improve library search (needs more detail from reporters)

- **URL:** https://linear.app/honeycombio/issue/JES-142
- **State:** Backlog (backlog)
- **Project:** MTG Deck Shuffler
- **Priority:** No priority
- **Relations:** inverse related ← JES-153, inverse related ← JES-152
- **Created:** 2026-08-01

**What surfaced it:** Real user feedback (2026-08-01) from Jess's college kid and their friends, who are actively using the Shuffler/Tabletop to play.\n\n**Request:** "Improve library search." No specifics yet on what's wrong with it — slow, hard to find cards, missing filters, bad matching, etc. are all still open questions.\n\n**Status: blocked** — Jess needs to get more concrete detail from the reporters (what they searched for, what they expected vs. got) before this can be scoped or estimated. Don't start implementation until that detail lands; update this issue with specifics once gathered.\n\n**Why it matters:** Real external users (not just Jess) are hitting friction here, which is a good signal this is worth prioritizing once scoped.

---

## JES-141 — Grow the playmat taller when lands overflow the bottom half

- **URL:** https://linear.app/honeycombio/issue/JES-141
- **State:** Backlog (backlog)
- **Project:** MTG Deck Shuffler
- **Priority:** Low
- **Relations:** related → JES-140, related → JES-86
- **Created:** 2026-08-01

**Surfaced by:** [JES-140](https://linear.app/honeycombio/issue/JES-140) ("The player area as a real table"), 2026-08-01. `apps/tabletop/DESIGN.md`'s land-placement rule says:

> lands go in the bottom half and line up left or right... if there's not room on the play mat for another land, the play mat just gets taller.

[JES-140](https://linear.app/honeycombio/issue/JES-140) implemented the common case — lands fill the bottom half left to right, wrapping to a new row — but deliberately deferred the "grows taller" part as a scope cut (decided with Jess during planning). Today, `apps/tabletop/src/server/cardLayout.ts`'s `landPosition()` wraps lands within a **fixed-height** bottom half; enough lands (more than fit in the available rows) will visually overflow past the playmat's bottom edge rather than the mat growing to make room.

**Why it matters:** DESIGN.md calls this "impossible in real life, fine here" — a nice-to-have, not core — which is why it was cut from [JES-140](https://linear.app/honeycombio/issue/JES-140)'s scope. But a long game with many lands in play will eventually hit the overflow, and the playmat's bottom edge (and the graveyard/exile column beside it, and the next seat's player area to the right) won't visually reflect it.

**What it'd take:** `ensurePlayerArea`/`landPosition` in `apps/tabletop/src/server/tableFurniture.ts` and `cardLayout.ts` would need to detect when a seat's land count exceeds the bottom half's fixed capacity, then **resize** the playmat's geo shape (and re-derive the library/graveyard/exile/name-label positions, which are currently fixed offsets from the playmat's bounds) via `room.updateStore` — not just create-once at seat-joined time. If there are multiple seats, growing one seat's playmat taller would also need to shift every player area to its right, since they're laid out in a row with fixed x offsets based on join order — a bigger ripple than a single shape resize.

**Related:** [JES-86](https://linear.app/honeycombio/issue/JES-86) (playmat selection in prep) — not the same gap, but both are deferred [DESIGN.md/FEATURE-playmat.md](<http://DESIGN.md/FEATURE-playmat.md>) pieces of the player-area work.

---

## JES-140 — The player area as a real table: playmat, library, graveyard, exile, Stack (DESIGN.md)

- **URL:** https://linear.app/honeycombio/issue/JES-140
- **State:** Done (completed)
- **Project:** MTG Deck Shuffler
- **Milestone:** The Tabletop replaces Mural
- **Priority:** High
- **Relations:** inverse related ← JES-151, inverse related ← JES-143, inverse related ← JES-141
- **Created:** 2026-08-01
- **Completed:** 2026-08-01

Build `apps/tabletop/DESIGN.md` — "DESIGN — the table, as a table." Status there is currently **design, not yet built**; this issue is the next landing toward Mountain 2 ("the physics of Magic").

## The goal

When a table is set up and a player opens it, they should see their playmat, library, graveyard, exile, and the shared Stack — before a single card is played. Today's canvas (`src/server/cardLayout.ts` + `cardArrival.ts`) only gives a bare "battlefield row" per seat, allocated lazily on the seat's first card.

## Scope (see DESIGN.md for full detail — geometry, picture, open questions already answered)

* New `seat.joined` event (SCAFFOLDING, envelope-lite like `card.played`) carrying `seatId`, `playerName`, `playmatImageUrl` — sent when a player Shuffles Up, not merely on typing a table name.
* Player area drawn up front at shuffle-up: playmat (pure battlefield, image background), library (card back + shadow), graveyard box (fills space under library to playmat's bottom edge), exile box (above graveyard, right of library), name label.
* Player areas in a row, left to right, in join order; Stack strip above, widening as each seat joins.
* Real proportions derived from a 24"×14" playmat at 68 canvas units/inch (170×238 card).
* Lands auto-place on the playmat's bottom half and wrap; everything else arrives on the Stack for a human to drag — no other auto-arrangement.
* Broken/missing `playmatImageUrl` degrades to a plain empty mat, never a broken player area.

## Reference

* Design doc: [https://github.com/jessitron/mtg-deck-shuffler/blob/main/apps/tabletop/DESIGN.md](<https://github.com/jessitron/mtg-deck-shuffler/blob/main/apps/tabletop/DESIGN.md>)
* Vision doc: `notes/DESIGN-the-table-vision.md`
* Delta table at the bottom of DESIGN.md spells out exactly what changes vs. today's `cardLayout.ts`/`cardArrival.ts`.

---

## JES-139 — Every span says which build it came from (deployed version in telemetry)

- **URL:** https://linear.app/honeycombio/issue/JES-139
- **State:** Backlog (backlog)
- **Project:** MTG Deck Shuffler
- **Priority:** Medium
- **Relations:** related → JES-133
- **Created:** 2026-08-01

All three ships should carry the currently deployed git version in their telemetry, so a span or log identifies the build that produced it.

## What surfaced it

Dropped 2026-08-01, right after adding Honeycomb deploy markers to all three `deploy.sh` (commit `4dbebbd`, `scripts/deploy-marker.sh`).

Markers were a real improvement — before them, deploys left no trace in Honeycomb at all. But they only mark a **moment on the time axis**. Nothing on an individual span says which build emitted it. So "is this error only on the new build?" is still answered by eyeballing whether events fall left or right of a marker line, which breaks down as soon as two deploys are close together, a rollout is gradual, or old and new pods overlap.

The session that prompted this was the `/proxy-image` 400 fix: prod had been failing 100% for a week, and confirming the fix meant querying a time window *after* the rollout and trusting that all traffic came from the new pod. A `deployment.sha` breakdown would have shown old-vs-new directly.

## The idea

Bake the build identity into the image at build time and surface it as an OTel **resource attribute** — so it lands on every span *and* every log, for free, with no per-call-site work:

`deploy.sh` computes the short sha (it already does, for the image tag) → Docker build arg → env var in the image → resource attribute (`service.version`, and/or `deployment.sha`) at SDK init.

Notes per ship:

* **Shuffler** — `src/tracing.ts` builds the resource; add it there.
* **Tabletop** — has precedent: the client bundle already takes `TLDRAW_LICENSE_KEY` as a Docker build arg, so build-time value injection is a solved problem here. Worth doing for **both** server and browser telemetry — a browser span knowing its bundle version is arguably the more valuable half, since users hold stale bundles after a deploy.
* **Spine** — Rails, no `package.json` version to read; it needs the sha passed in the same way rather than derived from a manifest.

## Why it matters

* Turns "did the deploy fix it / break it?" from timestamp archaeology into a `deployment.sha` breakdown.
* Survives overlapping pods and gradual rollouts, which markers cannot express.
* Makes a stale browser bundle visible instead of invisible.
* The local `deploy-<ship>-<timestamp>` git tags are never pushed, so today the only durable record of what shipped is the Honeycomb marker. Putting the sha on the telemetry itself makes the data self-describing.

## Related

`scripts/deploy-marker.sh` and the marker wiring are the prerequisite context (already landed). Once this lands, the **fleet-is-observable** owner should hold it as an invariant: *new ships, and new telemetry init paths, must carry the deployed version* — otherwise a fourth ship silently ships without it, the same way `/proxy-image` was the one Scryfall call site that missed the required User-Agent.

---

## JES-138 — Phase 5: Close the loop in the owner docs

- **URL:** https://linear.app/honeycombio/issue/JES-138
- **State:** Backlog (backlog)
- **Project:** MTG Deck Shuffler
- **Priority:** Medium
- **Parent:** JES-133
- **Created:** 2026-07-30

The paperwork that turns "we built a log pipeline" into "the next agent uses it correctly." Run the `fleet-is-observable-update` skill, and:

## `owners/fleet-is-observable/README.md`

* **Rewrite the "Caveat an implementer must know" paragraph.** It currently says there is no logs pipeline anywhere and that "create logs instead" is a direction, not a paved road. Once Phase 1 lands, that sentence is actively misleading — it reads as license to reach for `addEvent`.
* **Delete the violation inventory table** (the 4 sites) as they get fixed. Keep the `rooms.ts` worked example as *history* — it is the single best argument for the invariant and shouldn't be lost just because it's fixed.
* **Add the log-sampling trap** to Invariants: logs don't inherit the span's sampling decision, hence `SampledOnlyLogProcessor`. This belongs beside invariant #4 (head-sample health checks).
* **Update the per-ship wiring table** with the new files.
* **Record the per-ship duplication as a deliberate choice**, not drift — and note that the "wrapper module around OpenTelemetry libraries" want is still open (the logging want is now closed).

## `owners/fleet-is-observable/interactions.md`

The "Recording that something happened" watch point currently ends with "(see README for the caveat: no logs pipeline exists yet)". Fix it.

## Elsewhere

* `notes/AGENT-NOTES.md` — the sampling trap as a gotcha. Nothing in AGENT-NOTES currently mentions logging at all.
* `notes/add-opentelemetry.md` — the runbook for a new TS service. Extend it so a new ship gets logs from its first commit, same as tracing. Right now a fourth ship would arrive with no logs.
* Each ship's `CLAUDE.md` — the `log.ts` surface, and the deliberate-duplication note.
* `apps/shuffler/CLAUDE.md` — `src/scripts/*` keeps `console.*` on purpose (from Phase 2).

## Done when

An agent who reads only the owner KB would build the next feature's logging correctly, and would not try to extract the duplication into a shared package.

---

## JES-137 — Phase 4: Spine — Ruby logs that participate in traces

- **URL:** https://linear.app/honeycombio/issue/JES-137
- **State:** Backlog (backlog)
- **Project:** MTG Deck Shuffler
- **Priority:** Medium
- **Parent:** JES-133
- **Created:** 2026-07-30

Deliberately last: OTel Ruby's logs SDK is still alpha, so this is the least paved path. Do it once the TS shape is proven (Phases 1–3).

## Today

`services/spine/config/environments/production.rb:38-40` — `ActiveSupport::TaggedLogging` to STDOUT, tagged with `:request_id`, level from `RAILS_LOG_LEVEL`. Health checks are already filtered out. There is **no** OTel logs gem in the Gemfile and **zero** explicit app-level logging in `app/`, `lib/`, or `interpreter/`. So Rails' own request logs exist but never correlate with the trace — even though `opentelemetry-instrumentation-rack` already extracts the inbound W3C context, so a Shuffler-initiated trace does continue into the Spine.

## The fork (decide before building)

**(a)** `opentelemetry-logs-sdk` **gem + an OTLP log appender.** In-process, same shape as the TS ships, trace correlation for free from the current context. Cost: the gem is alpha; we'd be pinning something that may churn.

**(b) lograge → JSON on STDOUT → collector** `filelog` **receiver.** Stable, and the cluster already runs a collector we understand (`apps/tabletop/k8s/collector.yaml`). Cost: a second collector deployment or a shared one, plus we must inject `trace_id`/`span_id` into the JSON ourselves (readable from `OpenTelemetry::Trace.current_span.context`) since the filelog receiver can't know them.

My lean is (b) — stable, and it makes the existing Rails request log useful rather than adding a parallel channel. But this is a genuine choice; make it explicitly and record the reasoning.

## Also worth deciding

Whether the interpreter (`services/spine/interpreter/`) needs anything beyond what Rails gives it — see `services/spine/interpreter/docs/journeys/guide/15-listeners-and-telemetry.md`.

## Done when

A request that flows Shuffler → Spine shows the Spine's log lines on the same Honeycomb trace as the Shuffler's spans, and `/admin/tables`' per-event trace links land somewhere that explains what happened.

---

## JES-136 — Phase 3: Tabletop — kill the addEvent violations, add browser logs

- **URL:** https://linear.app/honeycombio/issue/JES-136
- **State:** Done (completed)
- **Project:** MTG Deck Shuffler
- **Priority:** High
- **Parent:** JES-133
- **Relations:** inverse blocks ← JES-134
- **Created:** 2026-07-30
- **Completed:** 2026-07-31

Blocked by Phase 1.

## Part A — the 4 `addEvent` violations (server)

The owner's invariant #2 exists because of these. Two of them **error in production right now**:

```
Cannot execute the operation on ended Span ... Error: Operation attempted on ended Span
  at Object.onSessionRemoved (rooms.js:15:40)
```

| Site | Event | Ambient span? |
| -- | -- | -- |
| `src/server/rooms.ts:49` | `room.session_removed` | **No** — throttled `pruneSessions` timer callback. Erroring in prod; event silently dropped. |
| `src/server/rooms.ts:54` | `room.emptied` | **No** — same callback. |
| `src/server/rooms.ts:66` | `room.created` | Sometimes — depends whether `getOrCreateRoom` was called from a request, a ws connect, or nothing. |
| `src/server/cardArrival.ts:128` | `row.allocated` | Usually yes (inside a request) — still a violation. Best fixed as **attributes on the request span**, not a log. |

The `rooms.ts` three become logs (that's exactly the no-ambient-span case logs exist for). `cardArrival.ts` should probably become attributes instead — decide per site, don't convert mechanically.

`apps/tabletop/test/rooms.test.ts` already exists; extend it so the room-lifecycle records are actually asserted rather than silently dropped again.

## Part B — browser logs pipeline

The Tabletop browser wrapper (`src/client/observability/index.ts`) is the fleet's only real OTel wrapper. Extend it with logs, following the same collector-not-a-key discipline (invariant #3):

* `logs` pipeline in `apps/tabletop/k8s/collector.yaml` (the ConfigMap currently declares `traces` only)
* `logs` pipeline in `apps/tabletop/otel-collector-local.yaml`
* `- path: /v1/logs` in `apps/tabletop/k8s/ingress.yaml` (only `/v1/traces` is routed today)
* `BROWSER_OTLP_LOGS_URL` in `apps/tabletop/k8s/configmap.yaml`
* `logsUrl` in the `/otel-config.json` payload the page fetches; `initTracing()` keeps working when it's absent (tracing/logging off is a valid local mode)
* convert the 3 client `console.*` calls

**Volume:** browser logs are the easiest place to accidentally spend money. Whatever guard we land, put it in the collector too, so it holds regardless of what the page ships.

## Done when

No `addEvent` call remains anywhere in the fleet; the "operation on ended Span" error is gone from prod logs; and a browser-side failure is visible in Honeycomb on the same trace as the server work it triggered.

---

## Landed — 6f319a2 (part A), a982366 (owner docs), 88fe617 (part B)

### Part A: no `span.addEvent` remains anywhere in the fleet

Split by whether a **live** span was available:

| Was | Became | Why |
| -- | -- | -- |
| `rooms.ts` `room.created` | span attributes | Both callers are inside a live span |
| `cardArrival.ts` `row.allocated` | span attributes | Always inside `handleCardArrival`'s request span |
| `rooms.ts` `room.session_removed` | log | Throttled timer; span already ended |
| `rooms.ts` `room.emptied` | log | Same callback |

**This issue's diagnosis was wrong, and so was the owner KB's.** Both said the `pruneSessions` callback has *no ambient span*. It has one — AsyncLocalStorage carries the context into the timer, so `trace.getActiveSpan()` returns the span that opened the room, **already ended**. That is exactly why `addEvent` *threw* instead of quietly no-op'ing through `?.`: with no span at all you'd have seen silence, not an error. The message said "ended Span" all along.

Measured in env `local`: a **2.4 ms** `ws connect` span, both logs emitted **\~13 s later**, and they still arrive carrying `trace.parent_id` = that span — so the log lands on the trace anyway, which is strictly better than the dropped span event. Owner README corrected in a982366.

`rooms.test.ts` covers the callback. It deliberately does **not** assert on `spanContext`: undefined under test (no SDK), the ended span in production, and neither is the guarantee.

### Part B: browser logs

`logError()` in the browser wrapper, plus automatic reporting of `window` `error` and `unhandledrejection`. Collector `logs` pipeline (both configs), `/v1/logs` on the ALB, `BROWSER_OTLP_LOGS_URL` in the configmap, `logsUrl` in `/otel-config.json`.

**Scope deviation:** this issue asked to convert the 3 client `console.log` calls. Left alone on purpose — all three report *whether telemetry is on*, so routing them through the telemetry pipeline would be circular. With those excluded the browser had **no log callers at all**, so building the pipeline alone would have shipped infrastructure nothing used. The global error handlers are the genuine no-span case that justifies it, and they close a real hole: uncaught page errors previously went nowhere.

Verified with real Chromium against the direct-to-Honeycomb fallback — both records in `mtg-tabletop-web` with `browser.url`, `table.name` (global attrs flow to logs too), and full exception detail: [https://ui.honeycomb.io/modernity/environments/local/datasets/mtg-tabletop-web/result/pwNAbTcgp5H](<https://ui.honeycomb.io/modernity/environments/local/datasets/mtg-tabletop-web/result/pwNAbTcgp5H>)

Server-side room lifecycle: [https://ui.honeycomb.io/modernity/environments/local/datasets/mtg-tabletop/result/rX5o35UKuPS](<https://ui.honeycomb.io/modernity/environments/local/datasets/mtg-tabletop/result/rX5o35UKuPS>)

### ⚠️ Not deployed

The k8s manifests (ingress `/v1/logs`, configmap, collector `logs` pipeline) are committed but **not applied**. Prod has no `/v1/logs` route until someone runs `./deploy.sh`, so browser logs from the deployed Tabletop will fail to export until then.

---

## JES-135 — Phase 2: Shuffler — convert console.* to trace-participating logs

- **URL:** https://linear.app/honeycombio/issue/JES-135
- **State:** Backlog (backlog)
- **Project:** MTG Deck Shuffler
- **Priority:** High
- **Parent:** JES-133
- **Relations:** inverse blocks ← JES-134
- **Created:** 2026-07-30

Blocked by Phase 1.

The Shuffler has **106** `console.*` **calls**, none of which reach Honeycomb. Today the Shuffler creates **zero manual spans** — it lives entirely off auto-instrumentation plus attribute stamping — so these catch blocks are the only record of most failures, and they go nowhere.

## Scope: 54 server-side calls

| File | Count |
| -- | -- |
| `src/app.ts` | 41 |
| `src/server.ts` | 8 |
| `src/GameState.ts` | 2 |
| `src/view/debug/state-copy.ts` | 1 |
| `src/port-persist-state/SqlitePersistStateAdapter.ts` | 1 |
| `src/port-deck-retrieval/archidektAdapter/ArchidektDeckToDeckAdapter.ts` | 1 |

## Out of scope, deliberately: 52 calls in `src/scripts/*`

`fetch-mtgjson-precons.ts` (33), `download-deck.ts` (7), `backfill-set-names.ts` (6), `inspect-archidekt-card.ts` (3), `backfill-deck-images.ts` (3). These are CLI tools, not the server — `console.*` is the right output there. **Write that down** in `apps/shuffler/CLAUDE.md` so the next sweep doesn't "finish the job".

## Notes

* Most of the 41 in `app.ts` are `console.error("Error loading X:", error)` in catch blocks. They pair naturally with the existing `markCurrentSpanAsError()` in `src/tracing_util.ts` — the log carries the message and the exception, the span carries the error status. Check which catch blocks already call it; add it where missing.
* Prefer attributes over prose: `log.error("deck fetch failed", { deck.source, deck.archidektId })` beats interpolating into the message. Invariant #1 — attributes are free and they correlate.

## Done when

Every server-side failure path in the Shuffler shows up in Honeycomb attached to the trace that caused it, and a deliberately-broken deck fetch can be diagnosed from Honeycomb alone.

---

## 1 of 54 done — dc2df7e

`POST /deck`'s catch block (`app.ts`) converted as a working demonstration of the pipeline. Chosen because it had **no** `markCurrentSpanAsError` beside its `console.error`, so the failure was entirely invisible in Honeycomb — a bare 500 with no error status, no deck id, no reason.

Pattern to follow for the remaining 53:

1. **Attributes first.** `markCurrentSpanAsError(message, {...})` with the failure kind, the inputs, and the reason. This is the part that answers "what broke and for which deck."
2. **Then the log, for the stack.** `log.error("deck retrieval failed", { "deck.source": deckSource }, error)` — the third argument becomes `exception.type`/`.message`/`.stacktrace`. Don't duplicate onto the log what's already on the span.

Verified in env `local` with a real Archidekt 404: root `POST /deck` span is ERROR/500 carrying `deck.retrieval.failure`, `deck.source`, `deck.archidektId`, `error.message`; the log rides on `request handler - /deck` as a `span_event` with a stacktrace pointing at `ArchidektGateway.fetchDeck`.

Note many of the 41 sites in `app.ts` **already** call `markCurrentSpanAsError` with good attributes (e.g. the game-loading middleware). For those, step 1 is already done and the conversion is only step 2 — don't re-stamp what's there.

---

## JES-134 — Phase 1: TS log pipeline in both Node ships

- **URL:** https://linear.app/honeycombio/issue/JES-134
- **State:** Done (completed)
- **Project:** MTG Deck Shuffler
- **Priority:** High
- **Parent:** JES-133
- **Relations:** blocks → JES-136, blocks → JES-135
- **Created:** 2026-07-30
- **Completed:** 2026-07-30

Stand up OTel logs in the Shuffler and the Tabletop server. **Duplicated per-ship on purpose** (see parent [JES-133](https://linear.app/honeycombio/issue/JES-133)).

## Files (mirroring how `tracing.ts` is already duplicated)

* `apps/shuffler/src/telemetry-logs.ts` + `apps/shuffler/src/log.ts`
* `apps/tabletop/src/server/telemetry-logs.ts` + `apps/tabletop/src/server/log.ts`

`telemetry-logs.ts` builds the `LoggerProvider`; it is called **from that ship's** `tracing.ts`, before the app's imports resolve (both ships launch via `node --import ./dist/.../tracing.js`).

`log.ts` is the surface the app touches: `log.info/warn/error(message, attrs)`, writing to **stdout and OTLP** — stdout stays valuable for local dev and for `./run`'s prefixed logs.

## Deps

`@opentelemetry/api-logs`, `@opentelemetry/sdk-logs`, `@opentelemetry/exporter-logs-otlp-http`. Match each ship's existing OTel version line — Shuffler is on `0.219.0`, Tabletop on `0.221.0`. They are allowed to differ; do not "align" them as a side quest.

## No sampling filter — decided against (2026-07-30)

The first draft of this issue called for a `SampledOnlyLogProcessor` dropping records under unsampled spans. **Dropped after review. Do not build it.** Two reasons:

1. **The flood it guarded against has no source.** Nothing in the fleet logs on a sampled-down path. All 8 `console.log`s in the Shuffler's `server.ts` are startup lines; `/health` (`app.ts:228`) doesn't log; static assets are `express.static`. All 54 server-side call sites are error paths, and error paths live in traces the sampler keeps at 100%.
2. **It would discard the evidence that matters most.** `telemetry-sampler.ts` keeps 1% of chatter rather than 0% deliberately — its comment says "we want to be able to look in Honeycomb and see that the health check is passing." If the health check starts *failing*, trace-based log filtering throws away 99% of the logs explaining why.

The OTel spec defaults `traceBased` to `false` for this reason: logs are independent of trace sampling.

**The volume guard is review discipline, not code:** don't log on the hot path. Invariant #1 (attributes over logs) already produces that, since a log is the exception for when there's no span to hang it on. If per-request logging is ever added, revisit — `createLoggerConfigurator([{pattern: '*', config: {traceBased: true}}])` is how, though it's flagged `@experimental`.

## Landmine found during review (worth keeping)

A *sibling* filtering processor cannot work at all: `MultiLogRecordProcessor.onEmit` forwards to every processor unconditionally and `LogRecordProcessor.onEmit` returns `void` — there is no drop channel. `logRecordProcessors: [filter, batch]` would export everything while looking correct. Same fail-open-invisibly shape as the 2024 sampler incident. Filtering, if ever needed, must be a decorator wrapping the batch processor — or the built-in `traceBased` config. Belongs in `notes/AGENT-NOTES.md`.

## Environment findings

* `OTEL_EXPORTER_OTLP_ENDPOINT` is generic (`https://api.honeycomb.io:443`) in all ships — not signal-specific — so the logs exporter derives `/v1/logs` with no config change. Logs land in the same datasets as spans, by `service.name`.
* `OTEL_LOGS_EXPORTER` **asymmetry:** the Spine sets it to `none` in `.env` and `k8s/configmap.yaml`; the Shuffler and Tabletop set it nowhere. Set it explicitly in both Node ships so the behavior is declared, not inherited.
* `OTEL_LOG_LEVEL="info"` **is a decoy** — OTel diagnostic verbosity, not an app log level. Don't repurpose it.
* `@opentelemetry/{api-logs,sdk-logs}` 0.219.0 are already in `node_modules` transitively via `sdk-node`. Only `exporter-logs-otlp-http` is a genuinely new direct dep.

## Done when

* Both ships export logs to Honeycomb with `trace_id`/`span_id` populated, verified in env `local` (source `.be` **then** `.env` — wrong order silently 401s).
* A log emitted with an active span carries that span's `trace_id`/`span_id`.
* A log emitted with **no** active span still emits — this is the `rooms.ts` timer-callback case Phase 3 depends on.
* Tests cover both, green in both ships.
* Spans still carry `http.route` after the `tracing.ts` edit (ESM patching breaks silently).

---

## Landed — ca6553f (code), b897f63 (owner docs)

Both Node ships emit trace-participating logs, verified end-to-end in Honeycomb env `local`.

**Deviation from the plan above:** no `telemetry-logs.ts`. `NodeSDK` accepts `logRecordProcessors` directly, so that file would have been a three-line re-export; the wiring lives in each ship's `tracing.ts` beside the trace exporter instead.

**Verified:**

* Shuffler + Tabletop each emitted an in-span log — arrives with `trace.trace_id`/`trace.parent_id` and `meta.annotation_type=span_event`, i.e. Honeycomb puts it on the trace exactly like a span event. That's the evidence that banning `addEvent` costs no fidelity.
* Each also emitted a no-span log — arrives untethered. This is the `rooms.ts` case [JES-136](https://linear.app/honeycombio/issue/JES-136) needs.
* `http.route` still on spans after the `tracing.ts` edits (ESM patching intact, still 1 span for `GET /`).
* 215 jest tests green (Shuffler), 17 vitest green (Tabletop).

**The duplication earned its keep immediately.** `BatchLogRecordProcessor` takes a positional exporter on 0.219 and an options object on 0.221. The Tabletop got the 0.219 shape, leaving `options.exporter` undefined — the export threw inside a promise into the global error handler and nothing reached Honeycomb, while the code read as correct. Only the second ship's test caught it. Recorded in `notes/AGENT-NOTES.md` and the owner README's History.

**Also found:** `logRecordProcessors` makes NodeSDK skip its `OTEL_LOGS_EXPORTER` branch entirely (`sdk.js:144-156`), so that env var would be dead config here. Not added — noted in a comment in both `tracing.ts` files so nobody adds it later thinking it's load-bearing.

---

## JES-133 — Every ship gets a log pipeline (trace-participating logs)

- **URL:** https://linear.app/honeycombio/issue/JES-133
- **State:** Backlog (backlog)
- **Project:** MTG Deck Shuffler
- **Priority:** High
- **Relations:** inverse related ← JES-139
- **Created:** 2026-07-30

Umbrella for the `fleet-is-observable` owner's biggest outstanding gap.

## The gap

There is **no OTel logs pipeline anywhere in the fleet**. No `@opentelemetry/api-logs`, no `sdk-logs`, no logs exporter, no Ruby logs gem, no `/v1/logs` route (verified in all three `package.json`s, the Gemfile, both collector configs, and `apps/tabletop/k8s/ingress.yaml`).

The owner's invariant #2 — *"Never add events to spans. Create trace-participating logs instead"* — is therefore a direction, not a paved road. See `owners/fleet-is-observable/README.md`.

What's stranded today:

| Ship | Stranded |
| -- | -- |
| Shuffler | 106 `console.*` calls (41 in `src/app.ts`), nearly all `console.error("Error loading X:", error)` in catch blocks. Invisible in Honeycomb. |
| Tabletop server | 4 `addEvent` violations; `rooms.ts:49,54` **actively error in prod** (thrown from a throttled timer callback with no ambient span). Plus 1 `console.*`. |
| Tabletop browser | 3 `console.*`; needs a `/v1/logs` collector pipeline + ALB path, neither of which exists. |
| Spine | Rails `TaggedLogging` → STDOUT (`config/environments/production.rb:38-40`), no OTel bridge, so request logs never correlate to their trace. |

## Two traps to handle up front

1. **Logs do not inherit the sampling decision.** A LogRecord picks up `trace_id`/`span_id` from active context but exports regardless of whether the span was sampled. The Shuffler drops 99% of health-check traces and the Tabletop drops 99.9% of kube-probe traces — adding request logging brings all that chatter back as orphaned log records pointing at spans that were never sent. This is the same failure mode as the 2024 sampler incident (README → History) and gets the same treatment: own module, own test.
2. **Init order.** The logger provider must be built inside `tracing.ts`, before the app's imports resolve, or a `logger` module imported by the app binds to a no-op provider.

## Decision: duplicate per-ship, do not extract a package

Jess chose per-ship duplication over a shared `packages/telemetry` workspace. Rationale: root `package.json` workspaces globs only `apps/*` and `services/*`; a shared package is a new build-and-deploy surface for two Dockerfiles. Tracing is already duplicated this way.

**This duplication is deliberate.** It must be written down in each ship's `CLAUDE.md` and in the owner README, or the next agent will "helpfully" extract it.

Note this defers two standing wants in the owner README: *"logging libraries that participate in traces"* (this umbrella delivers it) and *"a wrapper module around OpenTelemetry libraries, especially in JavaScript"* (explicitly not delivered).

## Sub-issues

1. TS log pipeline in both Node ships
2. Shuffler: convert `console.*` to trace-participating logs
3. Tabletop: kill the `addEvent` violations + browser logs pipeline
4. Spine: Ruby logs → Honeycomb
5. Close the loop in the owner docs

---

## JES-132 — "Choose your sleeves" — rectangular card frames and custom card backs on the Tabletop

- **URL:** https://linear.app/honeycombio/issue/JES-132
- **State:** Backlog (backlog)
- **Project:** MTG Deck Shuffler
- **Priority:** Low
- **Relations:** related → JES-127, related → JES-79
- **Created:** 2026-07-27

Let players pick sleeves for their deck as it appears on the Tabletop: a rectangular card frame (sleeve) around each card, and a custom sleeve image for card backs.

**Why it fits together:**

* A sleeve image is exactly what a face-down card needs — the back of a sleeved card *is* the sleeve.
* Sleeves / rectangular frames give cards square-legal corners, matching the site's square-corners style (physical cards stay rounded, but a sleeve edge is square).

**When to do it:** Lands naturally with the custom CardShape work at Tabletop Mountain 2 (see `apps/tabletop/SEAMAP.md`). Don't accelerate this — pick it up when CardShape happens; a sleeve is a natural first exercise of a custom shape's rendering.

**What surfaced it:** Buoy dropped during Tabletop v0 work ([JES-127](https://linear.app/honeycombio/issue/JES-127)); listed under "Buoys to drop" in `notes/PLAN-tabletop-v0.md`.

**Related:** [JES-79](https://linear.app/honeycombio/issue/JES-79) covers choosing sleeve colors (inner & outer) on the Shuffler's deck preview page — same "personalize your play space" idea; this issue is the Tabletop-rendering half. Coordinate the two so the chosen sleeve shows up in both places.

---

## JES-131 — Reconstruct a table after restart

- **URL:** https://linear.app/honeycombio/issue/JES-131
- **State:** Backlog (backlog)
- **Project:** MTG Deck Shuffler
- **Priority:** Low
- **Relations:** related → JES-127
- **Created:** 2026-07-27

The Tabletop's tldraw rooms are in-memory only (`apps/tabletop/src/server/rooms.ts`, marked SCAFFOLDING) — a server restart or redeploy (Recreate strategy, 1 replica) wipes every board. **Accepted for v0.**

**What surfaced it:** building Tabletop v0 ([JES-127](https://linear.app/honeycombio/issue/JES-127)); noted in `notes/PLAN-tabletop-v0.md` under "Buoys to drop".

**Why it matters:** any redeploy mid-game destroys the table everyone is playing on. Fine while the Tabletop is scaffolding; not fine once games run on it for real.

**Future direction:**

* Card locations become **replayable from the Spine's event log** once the Tabletop subscribes to the table's public feed — no separate persistence needed for cards.
* Freeform doodles (the Mural joy) are not in the event log; they need a **tldraw snapshot store**.

---

## JES-130 — Downsample health-probe traces in the Spine

- **URL:** https://linear.app/honeycombio/issue/JES-130
- **State:** Backlog (backlog)
- **Project:** MTG Deck Shuffler
- **Priority:** Low
- **Relations:** related → JES-129
- **Created:** 2026-07-27

The Spine traces every kube/ALB health probe at full rate: `GET /up` is roughly half of all spine spans in Honeycomb (environment `mtg-deck-shuffler`, dataset `spine`). That's noise drowning signal, and wasted event volume.

**What surfaced it:** noticed while verifying [JES-129](https://linear.app/honeycombio/issue/JES-129)'s telemetry after the ingest-key fix.

**What to do:** the Shuffler already downsamples kube-probe requests in `apps/shuffler/src/tracing.ts` (probe-aware sampler keyed on the user-agent/path). Apply the same probe-aware sampling pattern in `services/spine/config/initializers/opentelemetry.rb` — keep a trickle of probe spans (so we can still see probes are happening and healthy) rather than dropping them entirely, matching the Shuffler's behavior.

**Why it matters:** half the dataset is probe noise; queries and BubbleUp on spine traffic skew toward `/up` instead of real table/seat activity, and it burns event quota for no insight.

---

## JES-129 — Spine walking skeleton: Tables and Seats, deployed and observable

- **URL:** https://linear.app/honeycombio/issue/JES-129
- **State:** Done (completed)
- **Project:** MTG Deck Shuffler
- **Milestone:** The Spine tells the story
- **Priority:** Medium
- **Relations:** related → JES-128, related → JES-126, inverse related ← JES-130
- **Created:** 2026-07-27
- **Completed:** 2026-07-27

Greenfield Ruby service in `services/spine/`. Plain domain code — the Journeys pattern belongs to the Interpreter component ([JES-126](https://linear.app/honeycombio/issue/JES-126)), so nothing here waits on it.

Scope:

* A table you can create and join by name (the trust model is table names shared over Discord — no auth). The Spine mints the `tableId` GUID at creation; the name is a lookup alias, unique only among active tables (per the event contract draft, [JES-128](https://linear.app/honeycombio/issue/JES-128))
* Seats for 1–4 players; spectators welcome without one
* An append-only event log per table, ingesting at least one event kind via the contract ([JES-128](https://linear.app/honeycombio/issue/JES-128))
* **An admin screen** (a webapp component in the Spine is fine): shows a table's event log human-readably so the developer can follow along, with each event linking to its trace in Honeycomb
* OTel to Honeycomb **from the first commit** (env `mtg-deck-shuffler` in prod, `local` for tests), trace context propagated in
* Deployed alongside the fleet (orion cluster); event schemas versioned, old data fails loudly

This lane has zero file overlap with the Tabletop (`apps/tabletop/`) or Shuffler, so it can run as a parallel agent session. Much of the value is the yak-shaving: Ruby toolchain in the monorepo, deploy, telemetry plumbing.

Start once the contract sketch ([JES-128](https://linear.app/honeycombio/issue/JES-128)) exists — related, not strictly blocked. See services/spine/SEAMAP.md (Mountains 1–2), notes/DESIGN-event-contract-v0.md, and notes/DESIGN-the-table-vision.md.

---

## JES-128 — Event contract v0: the fleet's published language

- **URL:** https://linear.app/honeycombio/issue/JES-128
- **State:** Done (completed)
- **Project:** MTG Deck Shuffler
- **Milestone:** The Spine tells the story
- **Priority:** High
- **Relations:** inverse related ← JES-129
- **Created:** 2026-07-27
- **Completed:** 2026-07-27

Design the language-neutral event contract — JSON Schema in `contracts/` at the repo root — that the Spine publishes and both TS apps validate against. This is the one real coupling point between the Tabletop and Spine lanes; a small v0 lets them build toward each other in parallel.

Scope for v0 (minimal, versioned):

* A couple of **table events** (table created, seat taken) and **physical events** (e.g. card arrived at table)
* **Visibility** on every event; private events cast public shadows
* **Provenance** fields (who/what asserted this, trace context per the observability constraint)
* **Versioning** from the start; old data fails loudly
* Validated on both sides: Ruby (Spine) and TypeScript (Tabletop/Shuffler)

Designed interactively with Claude (not agent-grindable — small in code, heavy in decisions). See SEAMAP.md enabling constraints and notes/DESIGN-the-table-vision.md.

---

## JES-127 — Tabletop v0: synced tldraw canvas; Play sends the card to the table

- **URL:** https://linear.app/honeycombio/issue/JES-127
- **State:** Done (completed)
- **Project:** MTG Deck Shuffler
- **Milestone:** The Tabletop replaces Mural
- **Priority:** No priority
- **Relations:** inverse related ← JES-132, inverse related ← JES-131, inverse blocks ← JES-125
- **Created:** 2026-07-27
- **Completed:** 2026-07-27

apps/tabletop: React + tldraw + tldraw sync. A table page at /t/:tableName. The Shuffler's Prep screen gains "type a table name to join"; Play/Discard send the card to that table instead of the clipboard (clipboard survives as solo mode). Temporary room registry lives in the tabletop sync server, explicitly marked as scaffolding the Spine absorbs later. Observability from the first commit: OTel to Honeycomb, trace context propagated across the websocket. Blocked by the Phase 0 restructure issue.

---

## JES-126 — Journeys tour: learn and document the pattern before designing Spine internals

- **URL:** https://linear.app/honeycombio/issue/JES-126
- **State:** Done (completed)
- **Project:** MTG Deck Shuffler
- **Milestone:** The Spine tells the story
- **Priority:** No priority
- **Relations:** inverse related ← JES-129
- **Created:** 2026-07-27
- **Completed:** 2026-07-27

The tour arrived (2026-07-27). The Journeys framework docs — README, guide, ADRs, glossary, roadmap — are committed at `services/spine/interpreter/docs/journeys/`.

Resolution: **Journeys is the architectural direction for the Interpreter component**, not the whole Spine. Journeys implement an actor model, which resonates with modeling cards on the table as actors. The rest of the Spine (tables, seats, the event log) is plain domain code that journeys read from and append to. SEAMAP.md, services/spine/SEAMAP.md, and notes/DESIGN-the-table-vision.md all say so now.

This no longer gates the "Spine walking skeleton" phase — the walking skeleton is plain domain code; Journeys enters with the Interpreter.

Original ask: The Spine (Ruby) will use the Journeys architecture pattern, which Avdi is inventing. Before any Spine internals get designed, Claude needs the tour — a writeup, a repo, or Jess explaining it. Document what's learned in the repo (services/spine/ or notes/) so future sessions have it.

---

## JES-125 — Phase 0: restructure into a monorepo (apps/shuffler, workspaces)

- **URL:** https://linear.app/honeycombio/issue/JES-125
- **State:** Done (completed)
- **Project:** MTG Deck Shuffler
- **Milestone:** The Tabletop replaces Mural
- **Priority:** High
- **Relations:** blocks → JES-127
- **Created:** 2026-07-27
- **Completed:** 2026-08-01

Move the Shuffler into apps/shuffler/ with npm workspaces; root becomes fleet-level. The app must keep building, testing, verifying (Playwright), running locally, Docker-building, and EKS-deploying at every commit.

The complete handoff plan is in the repo: `notes/PLAN-monorepo-restructure.md` (grounded in the actual Dockerfile, [deploy.sh](<http://deploy.sh>), [verify.sh](<http://verify.sh>), run script). Vision: `notes/DESIGN-the-table-vision.md`.

---

## JES-124 — Fix the red verify-game-menu test: asserts a button, menu renders an anchor

- **URL:** https://linear.app/honeycombio/issue/JES-124
- **State:** Done (completed)
- **Project:** MTG Deck Shuffler
- **Priority:** Medium
- **Relations:** related → JES-78, related → JES-119
- **Created:** 2026-07-27
- **Completed:** 2026-07-27

`test/verification/verify-game-menu.spec.ts:69` asserts:

```
await expect(panel.locator('button:has-text("Choose Another Deck")')).toBeVisible();
```

but `src/view/play-game/game-menu.ts:60` renders that control as an anchor, not a button:

```
<a href="/choose-any-deck">Choose Another Deck</a>
```

So the selector never matches and the test fails.

**What surfaced it:** ran the full Playwright suite while removing the Mulligan Advisor (2026-07-26). It was the only failure — 36 of 37 Playwright specs pass, and all 154 Jest tests pass. Pre-existing and unrelated to that change: both files are untouched by it. The control appears to have become an anchor around `fbd0c6b` "Move game controls into a hamburger menu", and the assertion was never updated.

**Why it matters:** Safe Harbor says tests are green. One permanently-red test trains us to ignore the suite, and it will fail every CI run the moment CI exists ([JES-119](https://linear.app/honeycombio/issue/JES-119)) — a red build on day one is the worst possible start.

**Needs a decision on which side is wrong:**

1. **The test** — update the selector to match the anchor (`panel.locator('a:has-text("Choose Another Deck")')`). Cheapest, if an anchor is what we want; it *is* a navigation, so an anchor is arguably correct.
2. **The menu** — render a real `<button>` so it matches its siblings. The other menu entries ("Action History", "Restart Game") are buttons, so this one is visually and semantically inconsistent with them.

Worth a quick look at the menu's markup before picking — consistency with the sibling controls may matter more than the selector.

**Note:** `./verify.sh` currently aborts before running any tests, because `.be` has a syntax error on line 7 (`k: command not found`) and the script runs under `set -e`. That's a separate local-environment problem, but it means the red test is invisible unless you work around it.

---

## JES-120 — Re-copy INTERFACE.md from the Trainer Agent (upgrade your snapshot to the latest)

- **URL:** https://linear.app/honeycombio/issue/JES-120
- **State:** Canceled (canceled)
- **Project:** MTG Deck Shuffler
- **Priority:** Medium
- **Created:** 2026-06-29

Your copy of `INTERFACE.md` is an older snapshot. The canonical spec has moved ahead and now (a) names the canonical GitHub source and marks copies as **read-only** (don't edit the copy to change the contract — file a development request instead), and (b) documents an **"Upgrading your copy"** procedure. The doc also bumped to **2.1**.

**Why:** so this repo's agent doesn't think it can change the contract by editing its local copy, and so there's a clear, recorded procedure for staying current. Your git history of `INTERFACE.md` is the record of which version you integrated against.

**What to do** (this is the documented upgrade procedure):

1. **Compare** the canonical `INTERFACE.md` against your copy; read its Changelog to see what moved.
   * Canonical: [https://github.com/jessitron/small-coding-agent/blob/main/INTERFACE.md](<https://github.com/jessitron/small-coding-agent/blob/main/INTERFACE.md>)
2. **Re-copy the whole file** over your snapshot — don't hand-merge. The doc is the unit of versioning.
3. **Update what you send:** set the `X-Trainer-Agent-Interface-Version` request header to the new version (2.1) and adopt any new request fields / consumer obligations the Changelog calls out.
4. **Commit the upgraded copy** so your repo records the new pinned version.

Mismatch is a warning, not an error (it's surfaced in Honeycomb, not rejected at runtime), so there's no rush — but please pull the latest so this repo carries the read-only-copy guidance and the upgrade instructions.

(- claude from small-coding-agent)

---

## JES-119 — Set up CI

- **URL:** https://linear.app/honeycombio/issue/JES-119
- **State:** Backlog (backlog)
- **Project:** MTG Deck Shuffler
- **Priority:** No priority
- **Relations:** inverse related ← JES-124
- **Created:** 2026-06-29

github actions, so tests run on every PR.

(Originally written as "so it can run on the Trainer's PRs" — the Trainer is gone as of 2026-07-26, but CI is worth having on its own. See [JES-124](https://linear.app/honeycombio/issue/JES-124): there's currently one permanently-red Playwright test that would fail the first CI run.)

---

## JES-118 — My input should move immediately to the chat history on send.

- **URL:** https://linear.app/honeycombio/issue/JES-118
- **State:** Canceled (canceled)
- **Project:** MTG Deck Shuffler
- **Priority:** No priority
- **Created:** 2026-06-29

Right now it doesn't show up until after the reply comes, and it disappears on the 1m timer update!

---

## JES-117 — Trainer Chat needs multiline input box

- **URL:** https://linear.app/honeycombio/issue/JES-117
- **State:** Canceled (canceled)
- **Project:** MTG Deck Shuffler
- **Priority:** No priority
- **Created:** 2026-06-29

_No description._

---

## JES-116 — The chat should submit when I press Enter

- **URL:** https://linear.app/honeycombio/issue/JES-116
- **State:** Canceled (canceled)
- **Project:** MTG Deck Shuffler
- **Priority:** No priority
- **Created:** 2026-06-28

_No description._

---

## JES-115 — Trainer Chat needs a loading indicator

- **URL:** https://linear.app/honeycombio/issue/JES-115
- **State:** Canceled (canceled)
- **Project:** MTG Deck Shuffler
- **Priority:** High
- **Created:** 2026-06-26

I can't tell that it sent the message and is thinking! This UI needs to be responsive

---

## JES-114 — Trainer chat window - when it opens, put my cursor in the typey place

- **URL:** https://linear.app/honeycombio/issue/JES-114
- **State:** Canceled (canceled)
- **Project:** MTG Deck Shuffler
- **Priority:** Low
- **Created:** 2026-06-26

_No description._

---

## JES-113 — Trainer chat window doesn't scroll on new messages

- **URL:** https://linear.app/honeycombio/issue/JES-113
- **State:** Canceled (canceled)
- **Project:** MTG Deck Shuffler
- **Priority:** Low
- **Created:** 2026-06-26

_No description._

---

## JES-105 — Trainer CLI tool for card lookup

- **URL:** https://linear.app/honeycombio/issue/JES-105
- **State:** Canceled (canceled)
- **Project:** MTG Deck Shuffler
- **Priority:** Low
- **Relations:** related → JES-94, inverse blocks ← JES-95
- **Created:** 2026-06-25

The Trainer's half of "query once, expose twice."

A named CLI tool (e.g. `card:lookup -- <name>`, plus richer queries) over the **same card query layer** as the Advisor function-call (sibling issue) — so the AgentCore Trainer can pull card detail mid-chat instead of being fed the whole deck inline. Keeps the Trainer's context lean and its token cost down.

Depends on the build ([JES-95](https://linear.app/honeycombio/issue/JES-95)) and shares the query layer with the `CardDatabasePort` issue — wrap the one query layer as both an in-process port and a CLI. Feeds the Trainer-on-AgentCore work ([JES-94](https://linear.app/honeycombio/issue/JES-94)).

---

## JES-104 — Card query layer + Advisor function-call (CardDatabasePort)

- **URL:** https://linear.app/honeycombio/issue/JES-104
- **State:** Canceled (canceled)
- **Project:** MTG Deck Shuffler
- **Priority:** Low
- **Relations:** blocks → JES-93, inverse blocks ← JES-95
- **Created:** 2026-06-25

The Advisor's half of "query once, expose twice."

Build a **card query layer** over the augmented card database, then expose it to the Advisor as a **function call** — define `CardDatabasePort` (lookup by name/scryfallId → selected augmented fields) and inject it into `recommendMulligan`, keeping the recommender pure (do I/O at the call site, not inside). This is the deferred design already written in `notes/DESIGN-mulligan-advisor.md`.

Why a lookup instead of inlining: the Advisor's input becomes the Trainer's input, so handing it a pile of per-card data is paid for twice in tokens. Let it pull what it wants on demand.

Shares the same query layer as the Trainer CLI tool (sibling issue) — build the query once, wrap it twice. Unblocks the grown mulligan heuristics ([JES-93](https://linear.app/honeycombio/issue/JES-93): ramp/draw/creature detection all need card data).

---

## JES-103 — Compute augmented card classifications

- **URL:** https://linear.app/honeycombio/issue/JES-103
- **State:** Canceled (canceled)
- **Project:** MTG Deck Shuffler
- **Priority:** Low
- **Relations:** inverse blocks ← JES-95, inverse blocks ← JES-102
- **Created:** 2026-06-25

Populate the *augmented* classifications on top of the raw card database — the roles/tags the recommender and Trainer reason about: mana rock, ramp (gets you more land/mana), card draw, removal/interaction, board wipe, tutor, win condition, protection, etc.

Mechanism is decided by the classification research ([JES-102](https://linear.app/honeycombio/issue/JES-102)), per classification:

* **Deterministic** — sourced directly (e.g. EDHREC/Scryfall tags) or derived by rules over oracle text/type line.
* **LLM-built** — a classification pass for fuzzy categories no source provides.

Kept separate from the build ([JES-95](https://linear.app/honeycombio/issue/JES-95)) because it's a distinct step and the classification vocabulary will keep evolving. Must also be **reproducible** for new cards, like the underlying ingestion.

---

## JES-102 — Research: card classification schemes (existing vs. build our own)

- **URL:** https://linear.app/honeycombio/issue/JES-102
- **State:** Canceled (canceled)
- **Project:** MTG Deck Shuffler
- **Priority:** Medium
- **Relations:** blocks → JES-103
- **Created:** 2026-06-25

Second of two research spikes. Answers **"how do we classify cards for recommendation?"** — separate from **"how do we get them?"** (the sibling spike).

The recommendation heuristics and the Trainer need *augmented* classifications, not just raw fields — e.g. "is this a mana rock?", "does this card get you more land/mana (ramp)?", "is this card draw?", "removal?", "a win condition?".

Investigate what classification data already exists vs. what we'd have to build:

* **In the source** — does MTGJSON/Scryfall carry useful tags (keywords, `produced_mana`, type subtypes)?
* **Elsewhere** — EDHREC tags, Commander Spellbook, Scryfall's tagger/oracle-tag data, Moxfield/Archidekt categories. What's available, licensed, and machine-readable?
* **Build our own** — for classifications no source provides, decide the mechanism: **deterministic** rules over oracle text/type line, or an **LLM** classification pass. (This is the fork that shapes the "compute augmented classifications" task.)

Output: design section in `notes/DESIGN-card-database.md` (classification half) — the target classification vocabulary and, per classification, where it comes from (source vs. derived deterministically vs. LLM).

---

## JES-101 — Research: card database source & reproducible ingestion

- **URL:** https://linear.app/honeycombio/issue/JES-101
- **State:** Canceled (canceled)
- **Project:** MTG Deck Shuffler
- **Priority:** High
- **Relations:** blocks → JES-95
- **Created:** 2026-06-25

First of two research spikes for the card-database work. Answers **"how do we get the cards?"** — separate from **"how do we classify them?"** (the sibling spike).

Investigate how to pull down a full card database and keep it current. Likely MTGJSON (we already use it for precons), but compare against Scryfall bulk data.

Decide and document:

* **Source**: MTGJSON (AllPrintings / oracle-level file?) vs. Scryfall bulk "oracle cards". Which carries the raw fields we want (mana cost, CMC, type line, oracle text, keywords, produced mana, color identity)?
* **Reproducibility** — cards drop regularly, so ingestion must run two ways:
  * **From scratch** — full rebuild
  * **New-cards-only** — incremental addition without rewriting existing rows (clean diff, like `precons:fetch-mtgjson --skip-existing`)
* **Storage shape** — extend the existing SQLite `data.db` or a separate cards DB? What's the raw-card schema?
* **Cadence** — manual script vs. scheduled.

Output: design section in `notes/DESIGN-card-database.md` (raw-ingestion half). Gates the build task (rescoped [JES-95](https://linear.app/honeycombio/issue/JES-95)).

---

## JES-100 — Upgrade Trainer Agent integration to INTERFACE.md v2.0 + wire the chat client to the live front door

- **URL:** https://linear.app/honeycombio/issue/JES-100
- **State:** Done (completed)
- **Project:** MTG Deck Shuffler
- **Priority:** High
- **Relations:** related → JES-94, inverse related ← JES-107, inverse related ← JES-109
- **Created:** 2026-06-25
- **Completed:** 2026-06-26

The Trainer Agent (`small-coding-agent`) has a single canonical integration spec — `INTERFACE.md` — and a live public front door. This app is its one consumer. The spec has since moved **1.0 → 2.0** (breaking), so adopt **2.0**, not the 1.0 this ticket was originally written against.

**Why:** close the chat→PR loop from inside this app — a person chats, the Trainer codes on a branch of this repo and opens a PR.

**What to do:**

* **Copy the current** `INTERFACE.md` **(v2.0) into this repo.** Consumers pin by *copying the doc*; this repo's git history then records the interface version it built against. Source: [https://github.com/jessitron/small-coding-agent/blob/main/INTERFACE.md](<https://github.com/jessitron/small-coding-agent/blob/main/INTERFACE.md>)
* **Point the chat client** (e.g. `askMulliganAdvisorAgent()`) at the front door per the contract: `POST` `{message, session_id, seq, state}`, `Authorization: Bearer <token>`, **read timeout ≥ 300s** (coding turns take minutes). Render `{reply, status, pr_url?}` in the chat UI.
* **Send** `X-Trainer-Agent-Interface-Version: 2.0` on each request, and **propagate** `traceparent` so the app, front door, and agent share one Honeycomb trace.
* **Token:** fetch from the trainer-agent sandbox account's Secrets Manager (command in that repo's `notes/infrastructure.md`); store as a secret/env var, don't commit it.

**New in 2.0 (the breaking deltas to handle):**

* `seq` — a 1-based per-message counter (`1` for the first message of a session, incrementing each turn). The agent rejects a mismatched `seq` as a *lost session* (`status: error`); when that happens, mint a new `session_id` and reset `seq` to `1`.
* `state` — your app-defined game state, sent **fresh each turn** (the agent persists only its own conversation, not your game). Its shape is defined by *your* `trainer-agent/instructions.md`.
* `trainer-agent/instructions.md` — **you must add this file to this repo.** It's the agent's standing brief (what to do each turn, conventions, helper scripts). Missing/empty → `status: error`.
* The agent may **open a GitHub issue on this repo** when it needs better inputs — treat those as requests to improve the brief or the `state` you send.

**Testing — use the front-door stub** (now fully documented in `INTERFACE.md` §"Local testing — the stub"):

* Image (private ECR): `414852377253.dkr.ecr.us-west-2.amazonaws.com/trainer-agent-frontdoor-stub:latest` — pull with the same AWS access used to fetch the token.
* Run: `docker run -p 8080:8080 -e STUB_BEARER=test-token <image>`; hit `http://localhost:8080/` exactly as prod, health at `GET /ping`. Same request contract (bearer/JSON/`session_id` ≥ 33 / version header / `seq` **lost-session check**), canned replies driven by message text.
* The stub is **OTel-instrumented** and joins your `traceparent` trace. To see its spans, set the standard `OTEL_*` env vars on the container (`OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`, `OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf`, `OTEL_EXPORTER_OTLP_HEADERS`); no endpoint = no-op tracer, so it still runs without a collector.

**If you need the contract to change:** don't edit your copy — file a development request in the `small-coding-agent` Linear project (the collaboration interface, described in `INTERFACE.md`).

Relates to [JES-94](https://linear.app/honeycombio/issue/JES-94) (build the Trainer agent) — that side is built and deployed; this is the app-side integration against the published interface.

(- claude from small-coding-agent)

---

## JES-99 — Question: do we want redo?

- **URL:** https://linear.app/honeycombio/issue/JES-99
- **State:** Backlog (backlog)
- **Project:** MTG Deck Shuffler
- **Priority:** Low
- **Created:** 2026-06-25

Open question (sea monster of the decision kind): now that undo exists, do we want redo too? Decide before building.

---

## JES-98 — Instrument crucial fields as span attributes + project tracing utils

- **URL:** https://linear.app/honeycombio/issue/JES-98
- **State:** Backlog (backlog)
- **Project:** MTG Deck Shuffler
- **Priority:** No priority
- **Created:** 2026-06-25

Tracing is initialized with autoinstrumentation (done). Remaining:

* Identify the crucial fields to add as span attributes.
* Create a library of tracing utility functions specific to this project.

Goal: traces in Honeycomb that answer "what did the app do?" without ad-hoc logging. See `notes/instrument-essential-fields.md`.

---

## JES-97 — Game IDs as fun word combos instead of numbers

- **URL:** https://linear.app/honeycombio/issue/JES-97
- **State:** Backlog (backlog)
- **Project:** MTG Deck Shuffler
- **Priority:** No priority
- **Created:** 2026-06-25

Make game IDs fun word combinations instead of numbers. That makes them not derivable (a small privacy win) and still looks pretty.

---

## JES-96 — Offer English translations for other-language editions

- **URL:** https://linear.app/honeycombio/issue/JES-96
- **State:** Backlog (backlog)
- **Project:** MTG Deck Shuffler
- **Priority:** No priority
- **Created:** 2026-06-25

Some cards come in other-language editions. Offer English translations. Example: Adventurous Impulse in the Squirrel Girl deck (Archidekt 23735063).

---

## JES-95 — Build the card database (reproducible ingestion)

- **URL:** https://linear.app/honeycombio/issue/JES-95
- **State:** Canceled (canceled)
- **Project:** MTG Deck Shuffler
- **Priority:** Low
- **Relations:** blocks → JES-105, blocks → JES-104, blocks → JES-103, inverse blocks ← JES-101
- **Created:** 2026-06-25

Rescoped (was "Add a card database for heuristics (via a port)") — that bundled *build + port*; now split. **This issue = the build only.** The port/function-call lives in its own issue, and there are upstream research spikes + a separate classification-compute step.

Build the raw card database per the source/ingestion research ([JES-101](https://linear.app/honeycombio/issue/JES-101)):

* Download from the chosen source (likely MTGJSON; maybe Scryfall bulk) and load the raw fields the heuristics need — mana cost, CMC, type line, oracle text, keywords, produced mana, color identity — **without** bloating `CardDefinition` (per the two-faced-cards directive; see `notes/DESIGN-mulligan-advisor.md`).
* **Reproducible ingestion, two modes** (cards drop regularly):
  * **From scratch** — full rebuild
  * **New-cards-only** — incremental, clean diff (cf. `precons:fetch-mtgjson --skip-existing`)
* A named fetch script (Jess prefers scripts over herefiles).
* Storage per research — extend `data.db` or a separate cards DB.

Raw fields only here; *augmented* classifications are computed in a separate issue.

---

## JES-94 — Build the Trainer agent on AgentCore

- **URL:** https://linear.app/honeycombio/issue/JES-94
- **State:** Canceled (canceled)
- **Project:** MTG Deck Shuffler
- **Priority:** No priority
- **Relations:** inverse related ← JES-105, inverse related ← JES-100
- **Created:** 2026-06-25

Build the Trainer agent on AgentCore in a separate repo (see `notes/agentcore-advisor-agent-prompt.md`), then point `askMulliganAdvisorAgent()` at it. Paused on user request as of 2026-06-23.

This is the path toward the loop where you can ask the Trainer for improvements and get a PR back to this repo.

---

## JES-93 — Grow mulligan advisor heuristics

- **URL:** https://linear.app/honeycombio/issue/JES-93
- **State:** Canceled (canceled)
- **Project:** MTG Deck Shuffler
- **Priority:** No priority
- **Relations:** inverse blocks ← JES-104
- **Created:** 2026-06-25

The Mulligan Advisor (`recommendMulligan`) + dev-mode Trainer chat exist; phases 1 & 2 are done and the land-count heuristic is the first idea. Grow the rest:

* With the lands in hand, what can be played?
* Do any of those get you more land or mana (ramp)?
* With only these cards, can you play a creature (could be your commander)?
* If not, do any of them get you more cards (draw)?

See `notes/DESIGN-mulligan-advisor.md`.

---

## JES-92 — Spectator mode

- **URL:** https://linear.app/honeycombio/issue/JES-92
- **State:** Backlog (backlog)
- **Project:** MTG Deck Shuffler
- **Milestone:** The Spine tells the story
- **Priority:** No priority
- **Created:** 2026-06-25

It would be cool if Charlotte could watch our game — see what's happening — without worrying about messing up our game state. A read-only spectator view.

Re-charted 2026-07-27: in the Table Vision, a spectator is a consumer of the public projection of the table's event log — they see public events, the commentary, and hand counts but never hands (public shadows only; shadow logic lives in the Shuffler). In some modes spectators can comment in chat. Long-goal: a spectator's own private chat with the agent, for learning to play. See notes/DESIGN-the-table-vision.md.

---

## JES-91 — Bug: commander can end up in library or hand

- **URL:** https://linear.app/honeycombio/issue/JES-91
- **State:** Canceled (canceled)
- **Project:** MTG Deck Shuffler
- **Milestone:** Good play experience
- **Priority:** No priority
- **Created:** 2026-06-25

It is physically possible for your commander to be shuffled into your library or drawn into your hand. That shouldn't be possible — the commander belongs in the command zone.

---

## JES-90 — Bug: Flip is broken on the Prepare screen (commander)

- **URL:** https://linear.app/honeycombio/issue/JES-90
- **State:** Done (completed)
- **Project:** MTG Deck Shuffler
- **Milestone:** Good play experience
- **Priority:** Low
- **Created:** 2026-06-25
- **Completed:** 2026-07-27

The Flip functionality on the Prepare screen (for the commander) is broken. Coordinate with the two-faced-cards feature owner.

**Fixed 2026-07-27** — commit `e7e59f1` (docs `d908926`).

**Root cause:** `renderPrepCommanderCard()` passed `prep.prepId` as `formatCardContainer`'s `gameId`, so a two-faced commander's inline flip button rendered `hx-post="/flip-card/<prepId>/<index>"` — a *game* route. That 404s ("Game N not found"), and HTMX doesn't swap non-2xx responses, so clicking Flip did nothing at all.

**The scarier half:** `prepId` (`game_preps`) and `gameId` (`game_states`) are independent auto-increment sequences, and `validateStateVersion` treats a missing `expected-version` as valid. On a numeric collision, Flip on the prepare screen would have flipped a card in an unrelated game and persisted it, with nothing in the optimistic lock catching it.

**Fix:** new stateless route `GET /prep-flip-card/:prepId/:cardIndex?face=front|back`, mirroring the `?face=` idiom and card indexing `/prep-card-modal` already used. `formatFlippingContainer` now takes an explicit `FlipRequest` (`{page:"game"; gameId; expectedVersion?} | {page:"prep"; prepId}`) instead of inferring the page from a bare number; game call sites are unchanged (rendered HTML verified byte-identical).

No persistence or version changes — prep flip is still stateless. Regression guard: `test/verification/verify-prep-commander-flip.spec.ts`. All tests green (154 unit, 38 Playwright). Deployed to [https://mtg.jessitron.honeydemo.io](<https://mtg.jessitron.honeydemo.io>).

---

## JES-89 — Move the library to the right

- **URL:** https://linear.app/honeycombio/issue/JES-89
- **State:** Backlog (backlog)
- **Project:** MTG Deck Shuffler
- **Milestone:** Good play experience
- **Priority:** No priority
- **Created:** 2026-06-25

Move the library to the right side of the game screen — that's where it sits in a real game.

---

## JES-88 — Remove the deck title section from the game page

- **URL:** https://linear.app/honeycombio/issue/JES-88
- **State:** Backlog (backlog)
- **Project:** MTG Deck Shuffler
- **Milestone:** Good play experience
- **Priority:** No priority
- **Created:** 2026-06-25

Remove the deck title section from the game page entirely — it's clutter during play.

---

## JES-87 — Sort the opening hand by card type then mana value

- **URL:** https://linear.app/honeycombio/issue/JES-87
- **State:** Backlog (backlog)
- **Project:** MTG Deck Shuffler
- **Milestone:** Good play experience
- **Priority:** No priority
- **Created:** 2026-06-25

The game already auto-draws 7 cards on start/restart. Still TODO: sort that hand by card type and then by mana value — lands first, then creatures, then everything else.

---

## JES-86 — Let people pick a playmat

- **URL:** https://linear.app/honeycombio/issue/JES-86
- **State:** Backlog (backlog)
- **Project:** MTG Deck Shuffler
- **Milestone:** Good play experience
- **Priority:** No priority
- **Relations:** inverse related ← JES-141
- **Created:** 2026-06-25

Let the player choose a playmat for the game. See the playmat feature notes (`notes/FEATURE-playmat.md`).

---

## JES-85 — Track how cards got to the table; add discard/exile buttons

- **URL:** https://linear.app/honeycombio/issue/JES-85
- **State:** Backlog (backlog)
- **Project:** MTG Deck Shuffler
- **Milestone:** Good play experience
- **Priority:** No priority
- **Created:** 2026-06-25

For cards on the table, track how they got there. Give players 'discard' and 'exile' buttons that move a card to the table, and display how it got there in the list of cards on the table.

**Real user feedback (2026-08-01):** Jess's college kid and friends, using the app, confirmed this pain point directly: they absentmindedly delete cards from the tldraw whiteboard to represent "discarding" them, and forget to actually move the card to a visual graveyard area. A clearer visual distinction between the table (in-play) and the graveyard (discarded) — and dedicated discard/exile buttons/actions as described above — would prevent this.

---

## JES-84 — Animate card movement using HTMX position data

- **URL:** https://linear.app/honeycombio/issue/JES-84
- **State:** Backlog (backlog)
- **Project:** MTG Deck Shuffler
- **Milestone:** Good play experience
- **Priority:** No priority
- **Created:** 2026-06-25

Idea: HTMX requests can include the card's current position; the server calculates the destination position (e.g. where the table is) and styles the card with a CSS transition that moves it from current to destination.

Example sketch:

```
<img id="image"
     data-current-x="100"
     data-current-y="50"
     hx-post="/update-position"
     hx-vals="js:{currentX: ..., currentY: ...}">
```

Coordinate with the animations feature owner.

---

## JES-83 — Notify what was undone on ctrl-Z (toast)

- **URL:** https://linear.app/honeycombio/issue/JES-83
- **State:** Backlog (backlog)
- **Project:** MTG Deck Shuffler
- **Milestone:** Good play experience
- **Priority:** No priority
- **Created:** 2026-06-25

When the player undoes with ctrl-Z, surface what was undone somehow — a toast, maybe. Builds on the state-history / event-sourcing architecture.

---

## JES-82 — Make cmd-Z trigger undo

- **URL:** https://linear.app/honeycombio/issue/JES-82
- **State:** Backlog (backlog)
- **Project:** MTG Deck Shuffler
- **Milestone:** Good play experience
- **Priority:** No priority
- **Created:** 2026-06-25

Wire the keyboard shortcut cmd-Z (and presumably ctrl-Z) to the existing undo functionality.

---

## JES-81 — Add a play counter to the command zone

- **URL:** https://linear.app/honeycombio/issue/JES-81
- **State:** Backlog (backlog)
- **Project:** MTG Deck Shuffler
- **Milestone:** Good play experience
- **Priority:** No priority
- **Created:** 2026-06-25

Track how many times the commander has been cast (commander tax). Display a play counter in the command zone.

---

## JES-80 — Redesign the flip button (circle of two arrows, centered under card)

- **URL:** https://linear.app/honeycombio/issue/JES-80
- **State:** Backlog (backlog)
- **Project:** MTG Deck Shuffler
- **Milestone:** Good play experience
- **Priority:** No priority
- **Created:** 2026-06-25

The flip button looks sad right now. Make it look like a circle of two arrows, centered under the card.

---

## JES-79 — Pick card sleeves (inner & outer colors)

- **URL:** https://linear.app/honeycombio/issue/JES-79
- **State:** Backlog (backlog)
- **Project:** MTG Deck Shuffler
- **Milestone:** Good play experience
- **Priority:** No priority
- **Relations:** inverse related ← JES-132
- **Created:** 2026-06-25

On the deck preview page, let the player choose inner and outer sleeve colors for their deck. Part of making the table feel like a real, personal play space.

---

## JES-78 — Migrate the active game page to EJS templates

- **URL:** https://linear.app/honeycombio/issue/JES-78
- **State:** Backlog (backlog)
- **Project:** MTG Deck Shuffler
- **Milestone:** Good play experience
- **Priority:** No priority
- **Relations:** inverse related ← JES-124
- **Created:** 2026-06-25

The active game page currently renders via TypeScript view functions (`src/view/play-game/`), a historical accident rather than an intention. Migrate it to EJS templates like the rest of the pages.

Sub-task: make `head.ejs` take a list of extra `.js` files, so we don't load `game.js` on pages that don't need it (e.g. the homepage).

---

