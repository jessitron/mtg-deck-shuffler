# 13 — Replace furniture with the `mtg-zone` custom shape

Mountain: tabletop-replaces-mural
Ship: tabletop
Type: task
Status: ready-for-agent

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

- [ ] Playmat/library/graveyard/exile/Stack are `mtg-zone` shapes with validated `zone`/`seatId`/
      `label` props
- [ ] Furniture is locked by default; unlocking is only via tldraw's own Lock/Unlock
- [ ] Card zone-entry detection matches `type === 'mtg-zone'` and reads validated props, not
      `meta.zone`
- [ ] A card overlapping two zones lands in the topmost-drawn one
- [ ] The Stack is a recognised zone (`zone: 'stack'`) and code that re-places it preserves index
- [ ] The seat name label is locked
- [ ] `mtg-zone` is registered in all three sync places
- [ ] Existing zone-entry Playwright spec passes against the new shape
