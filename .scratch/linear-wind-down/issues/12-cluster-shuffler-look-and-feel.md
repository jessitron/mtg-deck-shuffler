# Keep/kill: shuffler-look-and-feel

Mountain: safe-harbor
Type: grilling
Status: needs-triage

## Question

Which of these 5 survive into `TODO.md`?

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
- **JES-79** — pick card sleeves (inner & outer colors). ⚠️ The Shuffler half of **JES-132**
  (cluster 6). Their bodies say to coordinate; keeping one and killing the other should be
  deliberate, not accidental.
- **JES-86** — let people pick a playmat. ⚠️ Cross-reads with **JES-141** (cluster 7). The
  plumbing already exists: `port-tabletop/types.ts` carries `playmatImageUrl` in the
  `seat.joined` payload, with a comment that playmat selection in prep is deferred. So this is a
  picker on top of working plumbing, not a build.
- **JES-97** — game IDs as fun word combos instead of numbers. ✅ Not done:
  `SqlitePersistStateAdapter` uses an integer `nextGameId++`. Small — and the *privacy* argument
  (IDs stop being guessable) is stronger than the cosmetic one, which matters given "no
  login/auth yet" is an explicit non-goal in `SEAMAP.md`.
