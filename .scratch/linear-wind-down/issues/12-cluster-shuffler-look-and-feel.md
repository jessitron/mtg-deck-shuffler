# Keep/kill: shuffler-look-and-feel

Mountain: safe-harbor
Type: grilling
Status: needs-triage

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
