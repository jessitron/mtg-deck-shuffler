# 02 — Give the furniture builders a domain-level interface, not a tldraw-record one

**Status:** ready-for-agent

**Files:** `src/server/cardArrival.ts`, `tableFurniture.ts`, `cardLayout.ts`, `rooms.ts`

**Problem:** "a card arrives" bounces across four files, and `tableFurniture.ts`'s shape-builder
still exposes tldraw's raw record shape to its callers — `typeName`, `parentId`, `meta`, and
three `as any` casts — instead of hiding it behind a domain-shaped constructor. `seatJoined.ts`
also has to know the same record fields independently.

**Solution:** a shape-record constructor that takes only domain values (position, image, owner,
sleeve, …) and never leaks tldraw's record fields to callers. Per the review's own deletion
test: inlining this today would visibly duplicate six fields across ~4 call sites, so the module
already has real depth — this is a leaky-interface fix, not a from-scratch design.

- [ ] `tableFurniture.ts` exposes a constructor whose parameters are domain values only (no
      `typeName`/`parentId`/`meta` visible to callers).
- [ ] The three `as any` casts currently in `cardArrival.ts`/`tableFurniture.ts` around record
      construction are gone — absorbed into the constructor's own implementation, not just moved.
- [ ] `seatJoined.ts` goes through the same constructor rather than independently knowing the
      tldraw record shape, if it currently duplicates that knowledge.
- [ ] Existing behavior is unchanged — this is a seam fix, not a feature change. Extend or add
      unit tests around the constructor rather than only covering it indirectly through
      `cardArrival.ts`'s integration tests.
- [ ] Consult `tabletop-shape-mechanics-review` before landing — this changes how every shape
      record on the table gets constructed.
- [ ] `tabletop-shape-mechanics-update` afterward.
