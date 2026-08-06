# Cut the Linear pointers and re-point the dangling JES- references

Mountain: safe-harbor
Type: task
Status: needs-triage
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
