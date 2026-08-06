# Cluster the 40 live issues into themed groups

Mountain: overhead
Type: task
Status: resolved

## Question

What are the themed clusters that the 40 live issues (39 Backlog + 1 Todo in
`notes/linear-archive.md`) fall into, and which issues belong to each?

AFK. Read the archive, group the 40 by what they're *about* — not by Linear label or
priority. Aim for roughly 5–8 clusters, each small enough that Jess can walk it in one
sitting. Candidate seams visible from the titles alone: Tabletop custom card shape
(JES-143/144/149 + the double-click crop), playmat cosmetics and geometry
(JES-141/146/147/148/150), Tabletop↔Spine wiring (JES-151/154), library search
(JES-142/152/153), observability (JES-137/138/139), Shuffler design (JES-155). Verify
against the real bodies rather than trusting that list.

The answer is the cluster list itself: for each cluster, a name, a one-line theme, and its
`JES-` ids. Every one of the 40 lands in exactly one cluster; say so explicitly if any
resist grouping — a "miscellaneous" cluster is fine but should be small.

This ticket does **not** decide keep or kill for anything. It only carves the pile.

## Answer

Seven clusters. Read from the real bodies, not the titles — the candidate seams in the
Question mostly held, with three corrections: library search is only **two** live issues
(JES-153 is Done), JES-154 belongs with persistence rather than with the ShapeUtil work,
and the "Good play experience" pile splits cleanly into *acting on cards* vs *arranging
the page*.

Clusters 1–3 serve the active Mountain (**The Tabletop replaces Mural**) and are the ones
to walk first. They are ordered by the dependency JES-149 itself states: the custom
`ShapeUtil` (cluster 1) comes before the cosmetic furniture (cluster 2), and persistence
(cluster 3) waits on both.

Flags are **input to Jess's keep/kill call, not the call.** Codebase checks were done where
cheap; each is cited so it can be re-verified.

---

### 1. `tabletop-custom-card-shape` — 4 issues · **serves the active Mountain**

*Give Tabletop cards a custom `ShapeUtil` so they can be rotated, flipped, sleeved, and
know what zone they were dropped into. One client-side investment, four payoffs.*

- **JES-149** — Tabletop: card zone-entry events (dragged into graveyard/exile/library) — essential game mechanic
  - The architecture spike, and the keystone of this whole cluster. Body confirms
    `onDragShapesOver`/`onDropShapesOver`/`onTranslateEnd` exist in `tldraw@5.2.5`. Says
    explicitly: do this **before** the cluster-2 cosmetic tickets.
- **JES-144** — Tabletop: custom card context menu — rotate, flip, remove crop/download
  - Shares the same `ShapeUtil` investment as JES-149. Rotate is the essential half; menu
    curation and flip are the ride-alongs.
- **JES-143** — Tabletop: tap lands and rotate cards for summoning sickness
  - ⚠️ **SUPERSEDED by JES-144.** Same mechanism (card rotation); its own body says "worth
    scoping together rather than as two separate rotation features," and JES-144 is the one
    carrying the confirmed architecture. Real-user provenance (Jess's college kid, 2026-08-01)
    is the part worth preserving if it's killed as a duplicate.
- **JES-132** — "Choose your sleeves" — rectangular card frames and custom card backs on the Tabletop
  - Body says outright: don't accelerate, pick it up when CardShape happens. Pairs with
    **JES-79** in cluster 7 (sleeve colors on the Shuffler) — the two halves of one idea,
    landing in different clusters on purpose.

**Adjacent, not in Linear:** `TODO.md` already holds `no-doubleclick-crop` and `animate-tap`,
both of which want this same custom shape. Whatever survives here should merge with those.

---

### 2. `tabletop-table-furniture` — 6 issues · **serves the active Mountain**

*Geometry and cosmetics of the drawn player area: playmat, library, exile, Stack. Nearly all
prop tweaks in `cardLayout.ts` / `tableFurniture.ts`.*

- **JES-150** — Tabletop: lands should leave a gap between each other and the playmat edge
  - Smallest item here; a margin constant in `landPosition()`.
- **JES-147** — Tabletop: center cards landing on the Stack above the playmat
  - `stackCardPosition()` anchors at the strip's left edge today. Straight geometry fix.
- **JES-148** — Tabletop: exile box — distance from library, height, border, label
  - ⚠️ **PARTLY SUPERSEDED.** `TODO.md`'s newer `playmat-command-zone` (2026-08-06) redraws
    the player area and says "Move exile down to replace the bottom third of the Graveyard."
    Any exile geometry decided here is pre-empted by that redraw; the *library border + label*
    half survives it.
- **JES-146** — Tabletop: playmat cosmetics — rounded corners, thick black border, remove dotted outline
  - Two-in-one: the dash/border props are a one-liner; **rounded corners are not a prop** and
    the body suggests folding them into cluster 1's custom-shape work.
- **JES-141** — Grow the playmat taller when lands overflow the bottom half
  - Deliberate scope cut from JES-140 (Done). Biggest ripple in this cluster — resizing one
    seat's mat shifts every player area to its right. Also flagged against
    `playmat-command-zone` in `TODO.md`, which re-does the same geometry.
- **JES-145** — Tabletop: link the library back to the Shuffler
  - Quick win; the `url` prop is already there, hardcoded `""`. The open part is *which* URL
    (needs a seatId → Shuffler game URL mapping the Tabletop doesn't have).

---

### 3. `table-durability-and-the-event-log` — 4 issues · **serves the active Mountain**

*The table must survive a restart, and what happens on it must reach the Spine's log — which
is also what spectators consume.*

- **JES-151** — Tabletop: table state doesn't survive a restart (needs real persistence)
  - The live version of this problem. Carries the 2026-08-01 decision (event-sourced, blocked
    on JES-149/144 producing semantic events) and the confirmed current state
    (`rooms.ts`, in-memory `TLSocketRoom`, no snapshot anywhere).
- **JES-131** — Reconstruct a table after restart
  - ⚠️ **DUPLICATE of JES-151**, and the older, thinner one. Same problem, same file. The one
    thing JES-131 has that JES-151 doesn't: the observation that *freeform doodles* aren't in
    the event log and need a tldraw snapshot store regardless. Worth carrying that sentence
    over if this is killed.
- **JES-154** — Tabletop: wire card zone-entry events to the Spine
  - The follow-up JES-149 deliberately scoped itself out of. Needs a **new contract payload**
    (`card.moved`) and a **new direction of data flow** (Tabletop→Spine, which doesn't exist).
    Blocked on JES-149.
- **JES-92** — Spectator mode
  - Re-charted 2026-07-27 as "a consumer of the public projection of the table's event log."
    Note SEAMAP.md now calls spectator mode *a constraint on every mountain, not a mountain* —
    so this issue may be better expressed as a standing constraint than a ticket.

---

### 4. `knowing-the-fleet-works` — 8 issues

*Telemetry and CI: everything under Safe Harbor's "deployed and observable, tests green."
The largest cluster, and the one with the most staleness in it.*

- **JES-133** — Every ship gets a log pipeline (trace-participating logs)
  - ⚠️ **PARTIALLY DONE / superseded by its own children.** Phase 1 (JES-134) and Phase 3
    (JES-136) both landed. Its headline claim — "there is **no** OTel logs pipeline anywhere
    in the fleet" — is now false, and its stranded-work table is out of date. All remaining
    value lives in JES-135/137/138.
- **JES-135** — Phase 2: Shuffler — convert `console.*` to trace-participating logs
  - ✅ Still genuinely open. Verified: **56** `console.*` calls remain in `apps/shuffler/src`
    outside `src/scripts/` (the issue counted 54; 1 was converted in `dc2df7e`). The pattern
    to follow is written down in the issue body — this is grindable.
- **JES-137** — Phase 4: Spine — Ruby logs that participate in traces
  - ✅ Still open, and the fleet `CLAUDE.md` cites this very ticket ("The Spine has no logs
    pipeline yet (JES-137)"). Carries a real undecided fork (logs-sdk gem vs lograge+collector).
- **JES-138** — Phase 5: Close the loop in the owner docs
  - ⚠️ **PARTIALLY STALE.** Some of the doc corrections it asks for were already made by
    JES-136's follow-up (`a982366` corrected the owner README's wrong diagnosis). Needs a
    re-read against today's `owners/fleet-is-observable/` before it's walkable.
- **JES-139** — Every span says which build it came from (deployed version in telemetry)
  - Still open and self-contained: build sha → Docker build arg → OTel resource attribute, in
    all three ships. Good, well-argued body.
- **JES-130** — Downsample health-probe traces in the Spine
  - ✅ Still open, verified: `services/spine/config/initializers/opentelemetry.rb` sets **no
    sampler at all** — just `SDK.configure` + `use_all`. The Shuffler's probe-aware sampler is
    the pattern to copy.
- **JES-98** — Instrument crucial fields as span attributes + project tracing utils
  - ⚠️ **LARGELY ALREADY DONE.** `apps/shuffler/src/tracing_util.ts` exists and exports
    `setCommonSpanAttributes`, `stampRouteParamsOnSpan`, `markCurrentSpanAsError` — i.e. both
    asks ("crucial fields as attributes", "a library of tracing utils") have landed, and the
    fleet `CLAUDE.md` now treats attributes-on-spans as established practice. Whatever's left
    is a re-audit, not a build.
- **JES-119** — Set up CI
  - ✅ Still open, verified: there is **no `.github/` directory at all**. But its stated hazard
    is gone — the permanently-red test it warns about (JES-124) is Done. So the "red build on
    day one" argument no longer applies; decide on CI's own merits.

---

### 5. `card-actions-and-undo` — 6 issues

*Moving a card on the Shuffler's game screen, seeing it move, and taking it back.*

- **JES-85** — Track how cards got to the table; add discard/exile buttons
  - Strongest item in the cluster: real user feedback (2026-08-01) that players delete cards
    from the whiteboard to mean "discard." Cross-reads with cluster 1 — the Tabletop half of
    this same confusion is JES-149's zone-entry detection.
- **JES-84** — Animate card movement using HTMX position data
  - Has an owner (`animations`). Idea-shaped rather than spec-shaped, but the sketch is concrete.
- **JES-81** — Add a play counter to the command zone (commander tax)
  - Small, self-contained, genuinely useful in play.
- **JES-82** — Make cmd-Z trigger undo
  - 🛑 **ALREADY DONE.** `apps/shuffler/public/game.js:304–318` binds ctrl/cmd-Z to click the
    live undo button, guarded against text inputs and open modals, with a doc comment
    explaining why it clicks the button rather than posting directly. Nothing left here.
- **JES-83** — Notify what was undone on ctrl-Z (toast)
  - ✅ Still open — verified there is **no toast** anywhere in the Shuffler (no match for
    "toast" in `src/` or `public/`). Now the natural follow-on to the shipped JES-82.
- **JES-99** — Question: do we want redo?
  - ⚠️ **A question, not work** — a decision ticket by construction ("sea monster of the
    decision kind"). Note `GameEvents.ts:176` already throws "Cannot undo an undo, use redo
    instead", so the code anticipates redo without implementing it.

---

### 6. `game-screen-layout-and-finding-cards` — 7 issues

*How the Shuffler's game page is arranged and rendered, and how you find a card in it.*

- **JES-89** — Move the library to the right
  - ✅ Not done: `active-game-page.ts` renders the library section **first** in `.game-top-row`.
- **JES-88** — Remove the deck title section from the game page
  - ⚠️ **SUPERSEDED by `TODO.md`'s `deck-title-placement`** (2026-08-06), which asks to *move*
    the title (out of the command zone, above the table buttons, top-aligned with the hamburger)
    rather than remove it. Also the premise has drifted: there is no separate "deck title
    section" any more — the name lives inside the command zone
    (`src/view/common/shared-components.ts:118`) and in the page `<title>`.
- **JES-87** — Sort the opening hand by card type then mana value
  - ✅ Not done: no hand sorting anywhere in `GameState.ts`.
- **JES-78** — Migrate the active game page to EJS templates
  - ✅ Not done: the game page still renders from `src/view/play-game/*.ts` (7 files); there is
    no game view in `views/`. This is the rendering substrate every other item in this cluster
    edits, so its order relative to them matters.
- **JES-152** — Offer library-position order in the game's library search (for debugging)
  - **Now unblocked and coherent:** its premise (game search flips to alphabetical) shipped as
    JES-153 on 2026-08-03. This is the deliberate counterweight to that change.
- **JES-142** — Improve library search (needs more detail from reporters)
  - ⚠️ **TOO VAGUE TO ACT ON** — self-marked "blocked, needs more detail from reporters," with
    no specifics at all. And the one concrete complaint behind it (search wasn't alphabetical)
    was already fixed by JES-153. What's left is an unrepeated feeling, ten months stale by the
    time anyone walks it.
- **JES-96** — Offer English translations for other-language editions
  - Thin but concrete — it names a reproducing example (Adventurous Impulse, Archidekt
    23735063). ✅ Not done: no language handling in the deck-retrieval adapters.

---

### 7. `shuffler-look-and-feel` — 5 issues

*Making the Shuffler look deliberate, and letting a player make their space theirs.*

- **JES-155** — Converge the Shuffler's design drift: resolve the six open choices
  - The single **Todo** issue and the only one arguably in flight. Groundwork landed
    (`970b08d` gallery, `0dc0237` owner, `b2a12fc` work list); the six decisions are
    unimplemented. Has a live owner (`shuffler-looks-like-itself`) and a written checklist at
    `owners/shuffler-looks-like-itself/open-choices.md`. **Note choice 5 is the accessibility
    item** (two rules currently `outline: none`).
- **JES-80** — Redesign the flip button (circle of two arrows, centered under card)
  - ⚠️ **Likely absorbed** into the `shuffler-looks-like-itself` owner's remit rather than
    superseded outright — it isn't one of JES-155's six choices, but it's exactly the kind of
    one-off restyle that owner now governs. Check `open-choices.md` before walking it.
- **JES-79** — Pick card sleeves (inner & outer colors)
  - The Shuffler half of **JES-132** (cluster 1). Their bodies say to coordinate; a keep on one
    and a kill on the other should be deliberate, not accidental.
- **JES-86** — Let people pick a playmat
  - Cross-reads with **JES-141** (cluster 2) and with `port-tabletop/types.ts`, which already
    carries `playmatImageUrl` in the `seat.joined` payload with a comment that playmat
    selection in prep is deferred. So the plumbing exists and the picker doesn't.
- **JES-97** — Game IDs as fun word combos instead of numbers
  - ✅ Not done: `SqlitePersistStateAdapter` uses an integer `nextGameId++`. Small, and the
    privacy argument (IDs stop being guessable) is stronger than the cosmetic one — which
    matters given "No login/auth yet" is an explicit non-goal in SEAMAP.md.

---

### Count check

| # | Cluster | Count |
|---|---------|-------|
| 1 | `tabletop-custom-card-shape` | 4 |
| 2 | `tabletop-table-furniture` | 6 |
| 3 | `table-durability-and-the-event-log` | 4 |
| 4 | `knowing-the-fleet-works` | 8 |
| 5 | `card-actions-and-undo` | 6 |
| 6 | `game-screen-layout-and-finding-cards` | 7 |
| 7 | `shuffler-look-and-feel` | 5 |
| | **Total** | **40** |

All 40 accounted for, each in exactly one cluster. No miscellaneous cluster was needed.

Full roster, sorted, for a manual re-check against the archive:
78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 92, 96, 97, 98, 99, 119, 130, 131, 132, 133,
135, 137, 138, 139, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 154, 155.

The 28 excluded: Done — 90, 100, 124, 125, 126, 127, 128, 129, 134, 136, 140, 153 (12).
Canceled — 91, 93, 94, 95, 101, 102, 103, 104, 105, 113, 114, 115, 116, 117, 118, 120 (16).

### Flag summary

**Already done, or superseded (8):** JES-82 (done — cmd-Z ships), JES-98 (largely done —
`tracing_util.ts`), JES-88 (superseded by `TODO.md` `deck-title-placement`), JES-131
(duplicate of JES-151), JES-133 (umbrella, phases 1 & 3 landed; premise now false), JES-138
(partially stale — some doc fixes already made), JES-143 (superseded by JES-144), JES-148
(partly superseded by `TODO.md` `playmat-command-zone`).

**Too vague to act on (2):** JES-142 (explicitly blocked on detail that never arrived),
JES-99 (a question, not a task — though a legitimate one).

**Watch for cross-cluster pairs when calling keep/kill:** JES-132 ↔ JES-79 (sleeves),
JES-86 ↔ JES-141 (playmat), JES-85 ↔ JES-149 (discard/graveyard confusion, both halves),
JES-152 ↔ JES-142 (both descend from the same 2026-08-01 game session).

**Also worth knowing:** four `TODO.md` items already in the inbox (`deck-title-placement`,
`playmat-command-zone`, `no-doubleclick-crop`, `animate-tap`) overlap clusters 1, 2 and 6.
When survivors are written into `TODO.md`, they should merge with those lines rather than
sit beside them.
