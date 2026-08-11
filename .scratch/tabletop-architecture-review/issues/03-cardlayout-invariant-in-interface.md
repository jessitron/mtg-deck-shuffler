# 03 — Move cardLayout's disjointness invariant into the interface, not just the test

**Status:** ready-for-agent

**Files:** `src/server/cardLayout.ts` (242 lines, 9 commits), `test/cardLayout.test.ts`

**Problem:** "`COMMAND_ZONE_H` must equal `LIBRARY_H`" and "zones stay disjoint" are load-bearing
invariants documented only in comments and enforced only by a test — nothing in the interface
itself signals them. A prior graveyard-cascade bug silently walked a zone out of the box until
the test caught it.

**Solution:** encode the invariant as a runtime assertion inside the layout functions
themselves, so a violation surfaces where the constant changes, not three files away in a test
run.

- [ ] `playmatBounds`/`libraryBounds`/`graveyardBounds` (or whichever functions own the relevant
      constants) assert their own disjointness / stay-inside-box invariant at the point of
      computation.
- [ ] The assertion failure message names which constants/zones conflict, so a future edit that
      breaks it fails loudly and specifically, not just via a red test.
- [ ] `test/cardLayout.test.ts` keeps covering this — the runtime assertion and the test aren't
      redundant; the assertion catches it at the point of change, the test catches it in CI/local
      runs before that.
- [ ] No behavior change for any currently-valid configuration of the constants — this only adds
      a failure mode for an already-invalid one.
