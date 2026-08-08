# 13 — Replace furniture with the `mtg-zone` custom shape

Mountain: tabletop-replaces-mural
Ship: tabletop
Type: task
Status: done

**What to build:** Furniture (playmat, library, graveyard, exile, the Stack) is today stock
locked `geo`/`image` shapes tagged with a freeform `meta.zone` string. Replace this with one
custom shape type, `mtg-zone`, covering all of them:

```ts
'mtg-zone': {
  w, h,
  zone: 'playmat' | 'library' | 'graveyard' | 'exile' | 'stack' | 'command',
  seatId: string | null,   // null = shared. The Stack is the only shared zone today.
  label: string,           // '' for the playmat
}
```

`canReceiveNewChildrenOfType` stays `false` — a zone notices what lands in it but never becomes
its parent. `isLocked: true` by default; tldraw's own context-menu Lock/Unlock is the sole
unlock affordance. The playmat's and library's background pictures stay separate stock `image`
shapes layered over the `mtg-zone` box, not folded into it. The seat name label is not a zone but
gains `isLocked: true` (fixes a live bug where any player can drag/delete another player's name).

Because `getDraggingOverShape` filters out locked shapes before checking for
`onDragShapesOver`/`onDropShapesOver`, zone-entry detection **stays card-side**, upgraded in the
card's own `onTranslateEnd` from matching `meta.zone` to matching `type === 'mtg-zone'` and
reading the validated `zone`/`seatId` props. When a card's centre sits inside more than one zone,
the topmost-drawn (highest `index`) zone wins — any code that re-places an existing zone (e.g.
`ensureStackStripWidth`) must preserve its existing index rather than minting a fresh one. The
Stack becomes a real zone value — dropping a card on it is recognised like any other zone entry.

Register `mtg-zone` alongside `mtg-card` in the same three sync places (`useSync` shapeUtils,
`<Tldraw shapeUtils>`, server `createTLSchema`) — they ship in the same deploy as ticket 12's
`mtg-card` to avoid a stale client disconnecting on either type.

**Blocked by:** 12 (card's zone-detection hook now needs `mtg-zone` to exist; both types must
ship in the same sync deploy)

- [x] Playmat/library/graveyard/exile/Stack are `mtg-zone` shapes with validated `zone`/`seatId`/
      `label` props
- [x] Furniture is locked by default; unlocking is only via tldraw's own Lock/Unlock
- [x] Card zone-entry detection matches `type === 'mtg-zone'` and reads validated props, not
      `meta.zone`
- [x] A card overlapping two zones lands in the topmost-drawn one
- [x] The Stack is a recognised zone (`zone: 'stack'`) and code that re-places it preserves index
- [x] The seat name label is locked
- [x] `mtg-zone` is registered in all three sync places
- [x] Existing zone-entry Playwright spec passes against the new shape

**Verified:** `tsc --noEmit` clean on both `tsconfig.json` and `tsconfig.server.json`;
`npx vitest run` 36/36 (added Stack-index-preservation coverage in `seatJoined.test.ts`);
`./verify.sh` 12/13 — `verify-card-drag-identity.spec.ts` fails identically against unmodified
`main` (confirmed by stashing this ticket's changes and re-running it), a pre-existing zoom-button
timeout unrelated to this change. `verify-seat-joined.spec.ts` was updated for the shape-type
rename (`geo`→`mtg-zone`) and the corrected shape count (furniture is 5 zone shapes per seat, not
4 — the library outline was always drawn but never counted; see ticket 12's own verification
note).

A `/code-review` pass (medium effort) caught and fixed a real regression before commit: the new
`zoneShape()` builder set `opacity: 1` on every zone instead of the old `regionShape()`'s `0.5`,
contradicting this ticket's "keep today's look" intent — fixed. Also tightened `zoneShape()`'s
10-positional-argument signature into an options object, and narrowed `ensureStackStripWidth`'s
`store.get()` read with a `typeName === "shape"` check instead of an unchecked cast.

**Owners consulted:** `tabletop-shape-mechanics` (-context, -review, -update — confirmed
`MtgZoneShapeUtil` needs no `onClick`/`onTranslateEnd`/`onDragShapesOver` at all since locked
shapes never reach `PointingShape` or `getDraggingOverShape`'s candidate list, and that plain
string comparison on `IndexKey` is the correct topmost-wins z-order check).
