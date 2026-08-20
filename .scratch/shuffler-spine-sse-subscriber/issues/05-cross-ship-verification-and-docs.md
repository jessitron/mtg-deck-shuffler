# 05 — Cross-ship verification + docs

**What to build:** Proof that the whole path works end to end with real processes, and
both ships' documentation caught up to match. Extend
`apps/shuffler/test/verification/verify-tabletop-integration.spec.ts` (already spawning a
real Tabletop and a real Spine) to exercise a card return — via ticket 12's drag gesture if
it has landed by then, or a direct call to ticket 02's send function as a lower-level
stand-in otherwise — and assert the card lands in the Shuffler's Revealed zone, with no
direct Tabletop→Shuffler HTTP call anywhere in the code.

`apps/shuffler/CLAUDE.md` gets a new section describing the subscriber, the in-memory
registry, and the browser-facing SSE route. `apps/tabletop/CLAUDE.md` gets the new
send-function documented alongside the existing `card.played`/`seat.joined` send
precedents.

**Blocked by:** 02, 04

**Status:** ready-for-agent

- [ ] `verify-tabletop-integration.spec.ts` covers a card return through a real Tabletop and
      real Spine, asserting the card appears in the Shuffler's Revealed zone
- [ ] The test (or a code-level assertion) confirms no direct Tabletop→Shuffler HTTP call
      exists anywhere in the send/receive path
- [ ] Each ship's existing unit suite passes (`npm test` for the Shuffler and the Tabletop;
      `bin/test` for the Spine) alongside the extended verification spec
- [ ] `apps/shuffler/CLAUDE.md` documents the new subscriber, registry, and SSE route
- [ ] `apps/tabletop/CLAUDE.md` documents the new send function alongside existing send
      precedents
