# Cut the Linear pointers and re-point the dangling JES- references

Mountain: safe-harbor
Type: task
Status: resolved
Blocked by: 02, and every cluster ticket whose issues are cited below

## Question

Make the docs stand on their own once Linear is abandoned and `notes/linear-archive.md` is
deleted. Found by [Find every remaining pointer at
Linear](04-find-remaining-linear-pointers.md); read its Answer for the full classified list.

### The rule (Jess, 2026-08-06)

A dangling `JES-` reference is a pointer to work. So resolve it by **following the work**, not
by rewriting prose:

- **Issue survives keep/kill** → re-point the reference at its new home (its `TODO.md` line or
  `.scratch/` ticket). The sentence keeps a working handle; only the address changes.
- **Issue is killed or already done** → the id points at nothing that will ever exist. Inline
  what the sentence needs to stand alone, drop the id.

This is why this ticket waits on the cluster sessions: you can't re-point until you know where
each one landed.

### Six misdirects

1. `owners/fleet-is-observable/README.md:246` — "put them in the commit message, **the Linear
   issue**, or here". The only standing instruction in the repo to *write* to Linear. Drop the
   middle option. **Not blocked — safe to do any time.**
2. `owners/shuffler-looks-like-itself/open-choices.md:5` — "Tracked as JES-155" (live; cluster 7)
3. `notes/DESIGN-event-contract-v0.md:3` — `Tracking: JES-128` header (JES-128 is Done → inline)
4. `apps/tabletop/DESIGN.md:8` — JES-141, undone (cluster 2)
5. `apps/tabletop/DESIGN.md:13` — "Tracked as JES-140" (Done → inline)
6. ~~`.claude/settings.local.json:77-79`~~ — **done**, the three `mcp__claude_ai_Linear__save_*`
   permissions are gone (Jess approved 2026-08-06).

### Ten dangling references, sorted by which branch of the rule they take

**Re-point — these cite live issues that will land somewhere:**

- `CLAUDE.md:112` — "The Spine has no logs pipeline yet (JES-137)" → cluster 4
- `owners/fleet-is-observable/README.md:111` — Invariant 5 "(FUTURE — not true yet; JES-139)"
  → cluster 4. The invariant's whole future hangs off this id; it must land somewhere real.
- `owners/fleet-is-observable/interactions.md:28` — "once JES-139 lands…" → cluster 4
- `apps/tabletop/CLAUDE.md:23` — JES-141 → cluster 2
- `owners/shuffler-looks-like-itself/open-choices.md:5` — JES-155 → cluster 7
- `TODO.md:49-50, 55` — JES-143/144/149 → cluster 1

**Inline — these cite Done issues, so no future home exists:**

- `notes/DESIGN-event-contract-v0.md:28` — "(Scoped into JES-129.)" JES-129 is **Done**. Worst of
  the set: a bare id with no gloss, so the sentence is unreadable without the body. Expand it
  from the archive *before* the archive is deleted.
- `owners/fleet-is-observable/README.md:80` — "Spine and the browser do **not** yet (JES-137,
  JES-136)". Mixed: JES-136 is Done, JES-137 is live. Split it.
- `owners/fleet-is-observable/README.md:139` — same mixed pair, same treatment.

**Leave alone:** the ~90 `JES-NNN` provenance comments in source and tests. Each sentence stands
on its own; nobody needs the issue body to read them.

### Amendments from the cluster sessions

- **Cluster 1 is discharged.** `TODO.md`'s JES-143/144/149 mentions were rewritten to slugs while
  [ticket 06](06-cluster-tabletop-custom-card-shape.md) merged those lines. Only `← was:` labels
  remain there, which are dated artifacts by design. Two fewer sites to visit.
- **Two exceptions to "leave alone"**, found by
  [ticket 08](08-cluster-table-durability-and-event-log.md) sweeping the Tabletop for *bare*,
  unlinked ids that ticket 04's linked-pointer search didn't see. The blanket rule still holds for
  the rest — these two name **live** work, so the follow-the-work rule applies:
  - `apps/tabletop/src/**/verify-card-rotate.spec.ts:4` — JES-144 → now split between
    `animate-tap` and `no-doubleclick-crop`
  - `apps/tabletop/CLAUDE.md:23` — JES-141 → now merged into `playmat-command-zone`
    (already listed above; ticket 08 confirms it from the other direction)
- **Do the `fleet-is-observable` edits in one pass, not two.** From
  [ticket 09](09-cluster-knowing-the-fleet-works.md): the paragraphs in that owner's `README.md` and
  `interactions.md` carrying JES-133/136/137/139 are the *same* stale "browser has no logger"
  paragraphs the surviving `logs-docs-catch-up` line will rewrite. Touching them twice is wasted
  work — and this ticket's re-pointing pass can't be done well without knowing the claims are false.
- **The slug map for re-pointing**, now that the clusters have landed:
  `JES-137` → `spine-logs-in-traces` (fleet `CLAUDE.md:112` and the owner docs) ·
  `JES-139` → `build-sha-on-every-span` (Invariant 5's FUTURE marker) ·
  `JES-133`, `JES-136` → **killed or done**, so inline and drop the id ·
  `JES-155` → cluster 12's call · `JES-141` → `playmat-command-zone`

### Ordering hazard

The inline expansions read from `notes/linear-archive.md`. Jess wants that file deleted — so
**this ticket runs before the deletion**, or the expansions come out of
`git show 944a111:notes/linear-archive.md` instead. Either works; don't discover it late.

## Answer

**Every `linear.app` URL is gone from the repo outside `notes/linear-archive.md` and this
effort's own working files.** Every remaining `JES-NNN` is either a `← was:` label in
`TODO.md` or a provenance mention of finished work that reads fine without a tracker.

### Misdirects (all five open ones cut)

1. `owners/fleet-is-observable/README.md` — "put them in the commit message, the Linear issue,
   or here" → "in the commit message or here". The last standing instruction to *write* to Linear.
2. `owners/shuffler-looks-like-itself/open-choices.md` — "Tracked as **[JES-155](url)**" →
   "Tracked as **`shuffler-design-choices`** in the repo-root `TODO.md`".
3. `notes/DESIGN-event-contract-v0.md` — dropped the `Tracking: [JES-128](url) · ` header prefix;
   the line below already says the contract becomes JSON Schema in `contracts/`.
4. `apps/tabletop/DESIGN.md` — "(deferred as [JES-141](url))" → "(deferred; it now rides along
   with the `playmat-command-zone` inbox line in the repo-root `TODO.md`)".
5. `apps/tabletop/DESIGN.md` — "Tracked as [JES-140](url)." deleted; JES-140 is Done and the
   paragraph already says "built (2026-08-01)".

### Re-pointed at TODO.md slugs

- `CLAUDE.md` — Spine logs → `spine-logs-in-traces`
- `owners/fleet-is-observable/README.md` — Invariant 5's FUTURE marker → `build-sha-on-every-span`;
  "Filed `JES-139` off the back of it" → "Filed `build-sha-on-every-span`"; both Spine-has-no-logger
  sentences → `spine-logs-in-traces`
- `owners/fleet-is-observable/interactions.md` — "once JES-139 lands" → `build-sha-on-every-span`;
  the Spine half of the no-logger pair → `spine-logs-in-traces`
- `apps/tabletop/CLAUDE.md` — playmat-grows-taller deferral → `playmat-command-zone`
- `apps/tabletop/test/verification/verify-card-rotate.spec.ts` — JES-144 → `animate-tap` and
  `no-doubleclick-crop` (one of the two named exceptions to the leave-alone ruling)
- `owners/two-faced-cards/tabletop.md` — two live citations ticket 04's search missed: the flip
  watch-point's "per JES-144's own scoping" → `no-doubleclick-crop`, and "the investment
  JES-144/JES-149 were built for" → `tabletop-card-shape`
- `owners/shuffler-looks-like-itself/{README,history}.md` and `apps/shuffler/CLAUDE.md` — every
  "JES-155 choice N" → "`shuffler-design-choices` choice N" (8 sites)

### Inlined (Done or killed, id dropped)

- `notes/DESIGN-event-contract-v0.md` — "(Scoped into JES-129.)" → "(Built with the Spine's
  walking skeleton; it lives at `/admin/tables`.)" Expanded from the archive before deletion;
  confirmed against `services/spine/config/routes.rb`.
- `owners/fleet-is-observable/README.md` — "fixed in `6f319a2` / JES-136" → "fixed in `6f319a2`";
  "Have, as of JES-134" → "as of `ca6553f`"; "no real callers (JES-136)" → "no real callers"
- `owners/fleet-is-observable/interactions.md` — "fixed in JES-136" → "fixed in `6f319a2`"
- `notes/DESIGN-the-table-vision.md`, `apps/tabletop/CLAUDE.md` — bare "(JES-140)" / "(JES-136)"
  provenance parentheses on done work, dropped where the sentence lost nothing

### The observability staleness tension

Ticket 09's warning held. The three "the browser has no logger" sentences are **false today** —
the browser *does* have `logError` — so re-pointing them at `spine-logs-in-traces` alone would
have asserted the falsehood in a new place. Each now names only the Spine as the real gap and
flags the browser clause as stale, pointing at `logs-docs-catch-up`. The substantive rewrite is
still that line's job; nothing here pre-empts it.

### Not done, on purpose

- The ~90 provenance comments in source and tests (JES-90/127/128/129/134/136/140) stand under
  the leave-alone ruling. That includes `verify-design-gallery.spec.ts`'s two "JES-155 choice 1"
  comments — a *test*, and choice 1 is decided, so no live tracker is needed to read it. If Jess
  wants label consistency there it's a one-line sed.
- `scripts/snapshot-linear.sh`, `CLAUDE.md` § Seamap's Linear paragraph, `SEAMAP.md:97`, and
  `TODO.md`'s `linear-wind-down` line all still say "Linear" — they *describe the wind-down*
  rather than direct anyone to the tracker. The CLAUDE.md paragraph names the archive, so it goes
  stale the moment `notes/linear-archive.md` is deleted; that belongs to the deletion ticket.
