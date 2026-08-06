# Keep/kill: shuffler-look-and-feel

Mountain: safe-harbor
Type: grilling
Status: resolved

## Question

Which of these 6 survive into `TODO.md`? **JES-132 was deferred here** by
[ticket 06](06-cluster-tabletop-custom-card-shape.md) so both halves of the sleeves idea get
decided in one place — see the last entry.

*Theme: making the Shuffler look deliberate, and letting a player make their space theirs.*

Consult the `shuffler-looks-like-itself` owner first — it now governs most of this cluster's
remit, and `open-choices.md` is the live checklist.

- **JES-155** — converge the Shuffler's design drift: resolve the six open choices. The single
  **Todo** issue and the only one arguably in flight. Groundwork landed (`970b08d` gallery,
  `0dc0237` owner, `b2a12fc` work list); the six decisions are unimplemented. ⚠️ **Choice 5 is the
  accessibility item** — two rules currently set `outline: none` and replace the focus ring with a
  border-colour change. That one shouldn't die quietly with the rest.
- **JES-80** — redesign the flip button (circle of two arrows, centered under card). ⚠️ **Likely
  absorbed** into the owner's remit rather than superseded — it isn't one of JES-155's six
  choices, but it's exactly the kind of one-off restyle that owner now governs. Check
  `open-choices.md` before walking it.
- **JES-79** — pick card sleeves (inner & outer colors) on the Shuffler's deck preview page. The
  Shuffler half of the sleeves idea; decide it with **JES-132** below, one call for both.
- **JES-86** — let people pick a playmat. ⚠️ Cross-reads with **JES-141** (cluster 7). The
  plumbing already exists: `port-tabletop/types.ts` carries `playmatImageUrl` in the
  `seat.joined` payload, with a comment that playmat selection in prep is deferred. So this is a
  picker on top of working plumbing, not a build.
- **JES-132** — "choose your sleeves": rectangular card frames and custom card backs on the
  *Tabletop*. Deferred here from cluster 6 (2026-08-06) because splitting it from JES-79 would
  split one idea across two calls. Rationale worth keeping if it survives: a sleeve image is
  exactly what a face-down card needs, and a sleeve edge gives cards the square corners the site's
  style wants. Its body says **don't accelerate** — pick it up when `tabletop-card-shape` happens,
  as a natural first exercise of a custom shape's rendering. If both survive, they are plausibly
  **one line**, not two: pick sleeves in the Shuffler, render them on the Tabletop.

- **JES-97** — game IDs as fun word combos instead of numbers. ✅ Not done:
  `SqlitePersistStateAdapter` uses an integer `nextGameId++`. Small — and the *privacy* argument
  (IDs stop being guessable) is stronger than the cosmetic one, which matters given "no
  login/auth yet" is an explicit non-goal in `SEAMAP.md`.

## Answer

**Nothing dies; six issues become four lines, all in `## Backlog`.** This is the youngest
cluster and the only one holding the single **Todo** issue, so there was no rot to cut — every
claim checked out against today's code. The compression came from *merging*, not killing:
three issues turned out to be one idea sharing one already-built plumbing seam, and one turned
out to be an unlisted instance of another's drift.

Jess delegated the keep/kill judgment (2026-08-06): *"dude I don't care, what will help you get
it done? My objective is to get this repo into a state where I can move forward without using
linear."* — so these are the agent's calls.

**Mountain markers: none.** The whole cluster is safe-harbor, including JES-132 — see below.

### The finding that shaped this cluster

`apps/shuffler/src/port-tabletop/types.ts` already carries **both halves of the personalization
plumbing** on the `seat.joined` event, hardcoded, each with a comment naming the missing picker:

- `cardBackImageUrl()` — *"The standard Magic card back **until sleeve selection exists**"*
- `defaultPlaymatImageUrl()` — *"The one hard-coded playmat (DESIGN.md — **playmat selection in
  prep is deferred**)"*

Both flow through `buildSeatJoinedEvent()` → `sendToTable.ts:65` → the Tabletop's
`seatJoined.ts` → `tableFurniture.ts`, which already renders the playmat as an image asset. So
JES-79, JES-86 and JES-132 are not three features. They are **one prep-screen picker feeding two
optional fields that already exist end to end** — the reason none of them is "a build" is that
the build already happened and nobody wrote the picker.

That is what made the three-into-one merge obvious rather than a judgment call, and it's the
sentence the surviving line has to carry.

### JES-79 + JES-86 + JES-132 — **keep, merged into one line**

`personal-play-space`. Ticket 06 deferred JES-132 here so the sleeves idea wouldn't be split
across two calls; walking it with JES-86 in view showed the seam is wider than sleeves — playmat
and sleeves are the *same* picker on the *same* event. Splitting them would have been the
near-duplicate that ticket 02 warns about, three times over.

**JES-132's Mountain marker: none, judged on merits.** It is Tabletop work, but the active
Mountain is *"the Tabletop replaces Mural… then card shapes and gestures (tap, counters, zone
areas) make common movements easy."* A sleeve is neither a gesture nor a common movement; the
Tabletop's own seamap files it under **Mountain 2, "The physics of Magic"**, which is not active,
and JES-132's body says outright *don't accelerate this*. So it sits in `## Backlog` with its two
Shuffler halves rather than being promoted into `## Next` by association. This keeps the line
whole, which was the point of deferring it here.

The one part that genuinely waits on `tabletop-card-shape` is JES-132's *rectangular sleeve
frame* — the square-corner rendering. The card-back image needs nothing new. That distinction is
on the line, because it's what lets the line be started before the spike lands.

### JES-155 — **keep, as a decision line, minus choice 5**

`shuffler-design-choices`. The implementation detail is **not** migrated: `open-choices.md` is a
live, accurate, `file:line`-precise work list, and copying it into `TODO.md` would create a
second copy that immediately drifts. The inbox line exists for the thing the checklist *can't*
supply — **four answers from Jess**. That's inbox-shaped: the blocker is a decision, not a build.

Verified today: choices 1 and 2 are DECIDED and implemented; 3, 4, 5 and 6 are still `_(pending)_`.
So it's **four** open choices now, not six.

> **On "belongs on the owner's checklist rather than the inbox":** it belongs on *both*, and
> they aren't duplicates. `open-choices.md` is the how; the inbox line is the *when*, and it's
> the only surface Jess actually reads to pick up work. Nothing in the owner's KB surfaces
> itself. The line is deliberately thin and points at the checklist — which is a **live** file,
> not the dying archive, so this doesn't violate ticket 02's stand-alone rule.

### JES-155 choice 5 — **keep, split out onto its own line**

`keyboard-focus-visible`. This ticket flagged that it shouldn't die quietly with the rest. It
isn't dying — but leaving it inside a line called "design choices" would have buried an
**accessibility regression inside a taste question**, which is the same disappearance by a
slower route. Two reasons it's a different kind of work:

1. **It doesn't need Jess.** Deleting `outline: none` is correct under all three ring options.
   Only the *replacement* ring (A/B/C) is a choice.
2. **It's a regression, not a gap.** `deck-selection.css:61` and `:88` actively remove the
   browser's focus ring and substitute a border-colour change — worse than never having styled
   it.

Verified today, and two corrections to the KB fell out (see the hand-off below): the second site
is line **61**, not 60; and no shipped stylesheet uses `:focus-visible` at all — the only
`:focus` rule in the app is `site.css:325` `.button-base:focus`, and `:focus-visible` exists only
in `design-candidates.css`, which nothing but `/design` loads.

### JES-80 — **keep, merged into `shuffler-design-choices` as a sub-bullet**

Not its own line. The flip button is not one of the six choices, but checking `open-choices.md`
(as this ticket instructed) showed it is a textbook instance of what that list is *for*:

- `.flip-button` is Material orange `#ff9800` / `#f57c00` — an off-brand hue on a single button,
  exactly the drift the owner exists to stop.
- It is **duplicated**: `prepare.css:246` (flat, `border-radius: 5px`) and `playmat.css:506`
  (already converted to the `.pushable-flat` box-shadow bevel from choice 1). The two have
  already diverged, which is the copy-paste trap `open-choices.md` names under its mechanical
  cleanups.
- Its `5px` radius is on choice 4's change list.

So "the flip button looks sad" isn't a separate restyle — it's three settled-or-pending choices
landing on one component, plus Jess's actual ask (a circle of two arrows, centered under the
card). As a sub-bullet it makes the drift concrete; as a standalone line it would have been a
thin cosmetic ticket competing with the checklist that already governs it.

### JES-97 — **keep, its own line**

`fun-game-ids`. Verified not done: `nextGameId++` in both `InMemoryPersistStateAdapter.ts:35`
and `SqlitePersistStateAdapter.ts:65`, the latter seeded from `MAX(id)`. Kept standalone because
it isn't look-and-feel despite living in this cluster — it's a **privacy** change wearing a
cosmetic hat, and it touches persistence and URLs, not CSS. Merging it into a design line would
have hidden a schema change inside a stylesheet job. The no-auth non-goal in `SEAMAP.md` is what
makes guessable sequential game URLs worth a line at all.

### Nothing merges into an existing inbox line

`personal-play-space` **depends on** `tabletop-card-shape` for the sleeve frame, but doesn't
overlap it — the dependency is a cross-reference, not a merge, so no `← was:` label is appended
to any existing line. `playmat-command-zone` is the *drawn geometry* of the player area, a
different job from choosing a playmat image. No existing line changes.

### Side effect: one more `JES-` site for ticket 05

`owners/shuffler-looks-like-itself/open-choices.md:4-5` says *"Tracked as
**[JES-155](https://linear.app/honeycombio/issue/JES-155)**"* — a live Linear URL in an owner KB.
`README.md` also names "JES-155 choice 1" and "choice 2" in prose (lines 53, 57, 112) and
`history.md` likely echoes them. Those prose mentions should become
`shuffler-design-choices`; the tracking pointer should point at `TODO.md`. Not touched here —
this ticket edits only itself.
