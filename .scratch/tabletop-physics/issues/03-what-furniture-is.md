# Decide what furniture is, and who owns zone membership

Mountain: tabletop-replaces-mural
Type: grilling
Status: resolved
Blocked by: 02

## Question

Jess, charting this map (2026-08-06): *"the furniture is custom (inheriting, whatever) shapes
too, so that they can recognize stuff."*

Today furniture is stock locked `geo` and `image` shapes tagged with `meta.zone`
(`tableFurniture.ts`), and zone membership is computed **card-side**: `onTranslateEnd` on the
card scans `editor.getCurrentPageShapes()` for anything with a `meta.zone` and tests
`Box.containsPoint`, first match wins. That was a deliberate choice — the
[zone-entry ticket](../../tabletop-card-shape/issues/01-zone-entry-events.md) picked it over
target-side hooks precisely because zones weren't custom shapes, and said giving them their own
`ShapeUtil` "felt like a bigger change than this ticket needed."

Decide:

- **Which furniture becomes a custom shape** — library, graveyard, exile, playmat, the Stack
  strip, the command zone, the seat name label. All of them, or only the ones that need to react?
- **Does the zone recognise the card, or does the card find the zone?** Target-side hooks
  (`onDragShapesOver`/`onDropShapesOver`) versus today's card-side scan. What does each buy —
  and does the library "changing appearance as a card comes over it" (map 3's parity item) force
  the target-side answer?
- **Overlap and precedence.** First-match-wins is currently an accident of shape order. With a
  command zone and a square layout coming, what should happen when zones overlap or a card's
  centre sits in two?
- **The Stack strip carries no `meta.zone` at all** (`ensureStackStripWidth` omits it), so
  dropping a card on the Stack detects nothing today. Is the Stack a zone like the others?
- **Locking and protection.** Furniture is protected only by `isLocked: true`, and the seat name
  label isn't locked, so a player can drag or delete it. What does a custom furniture shape do
  about that?

## Answer

Resolved 2026-08-07 by grilling with Jess. Prior input: the
[tldraw custom-shape research](01-tldraw-custom-shape-facts.md), the resolved
[what a card is](02-what-a-card-is.md), and the `shuffler-looks-like-itself` owner (consulted
mid-interview, before any recommendation was made).

### Furniture is one custom shape type, `mtg-zone`

A single registration covers **playmat, library, graveyard, exile, the Stack**, and the command
zone when map 2 creates it. Their *behaviour* is identical — a named rectangle that notices what
lands in it — and only appearance and label differ, so one type with a `zone` prop beats five
types that would each need their own schema entry, its own migration sequence kept in step, and
its own chance for the sync validator to disconnect somebody.

```ts
'mtg-zone': {
  w, h,                          // from BaseBoxShapeUtil
  zone: 'playmat' | 'library' | 'graveyard' | 'exile' | 'stack' | 'command',
  seatId: string | null,         // null = shared. The Stack is the only shared zone today.
  label: string,                 // '' for the playmat, which is unlabelled
}
```

**The seat name label is not a zone.** Nothing lands on a name, so it stays a stock `text`
shape — but it gets `isLocked: true`, which it lacks today (a live bug: any player can drag or
delete another player's name).

**`seatId` on a zone does not violate ticket 02's "no owner field."** That principle bans
*gating* — never design a gesture around "only the controller may…" — not *naming*. A zone-entry
occurrence has to say **which** graveyard, and "this is seat 2's graveyard" grants seat 2 no
rights that seat 1 doesn't have. Every player can still drag any card into any zone.

### The playmat picture stays a separate stock `image` shape

Rejected: collapsing the playmat's outline+image pair into one `mtg-zone` that renders its own
`<img>`. Keeping them separate is the smaller change and keeps the big background pictures inside
tldraw's asset machinery, so `toSvg` export and asset handling keep working for them. Same for the
library's card back.

**A cost that option had disappears under the decision below.** The layered `image` shape no
longer needs a `zone` tag at all — the scan now matches on `type === 'mtg-zone'` — so the
"two shapes both claim `playmat`, and first-match-wins picks between them by accident"
ambiguity is simply gone. `meta.zone` is deleted from furniture entirely.

### Furniture stays locked by default — and that decides the mechanism

Jess, mid-interview, and it overrode the answer that was forming:

> *"I explicitly want the furniture to be adjustable by the players if they want to move it, but
> locked by default because I don't want to move it by accident, as a player."*

So `isLocked: true` is **wanted**, and tldraw's own context-menu Lock/Unlock **is** the player's
affordance for "let me move the graveyard on purpose." No side-effect handler, no pinning, no
custom protection. Note this is consistent with the fleet's symmetry principle: unlock is
available to every player, not to an owner.

**The load-bearing discovery.** `Editor.getDraggingOverShape` (`Editor.ts:6571-6585`) filters
`!s.isLocked` **before** it ever checks whether a util defines `onDragShapesOver` /
`onDragShapesIn` / `onDragShapesOut` / `onDropShapesOver`. So **a locked shape can never be a
drag target**, and the target-side hooks are unavailable for as long as furniture is locked.
Jess's lock requirement wins: it's a player-facing behaviour, while the hooks were only ever an
implementation route.

Also established while looking: **there is no `canMove` / `canDrag` / `canTranslate` on
`ShapeUtil`** (grepped; absent from the whole class). `isLocked` is the only shape-level brake
tldraw has.

So the two jobs the ticket bundled together get **different homes**:

- **Zone entry stays card-side**, in the card's `onTranslateEnd` — but upgraded from a freeform
  `meta.zone` string-match to `type === 'mtg-zone'`, reading validated, migratable `props`. This
  is not inheriting the old choice: the [zone-entry
  ticket](../../tabletop-card-shape/issues/01-zone-entry-events.md) picked card-side *because
  zones weren't custom shapes*. That reason is now gone, and the choice is re-made on a new one —
  locked furniture cannot be a drop target.
- **The armed / drag-over highlight lives in the zone's own `component()`**, computed
  **reactively and derived** — `useValue` over the shapes currently being translated — never
  written to the store. Locking is irrelevant to a derived render. This is strictly better than
  the hook route would have been: `onDragShapesOver` fires *every frame while dragging*, so a
  hook writing `props.armed` would have meant per-frame writes to a synced document and a trail
  of undo entries. Nothing is persisted and nothing syncs; the highlight is pure local rendering.

**The armed highlight is seen only by the player dragging.** This is *not* a mechanism detail —
it's player-visible behaviour, and the design owner's `-review` was right to pull it out of the
mechanism paragraph and put it to Jess. Asked directly whether the others at the table should see
the library light up: *"honestly, whichever is easier"* — and local-only is easier by a wide
margin, since shared arming means per-frame writes to a synced document plus throttling plus undo
suppression. Others still see the card moving (tldraw syncs that live); they just don't see what
it's aimed at. The parity item at `notes/DESIGN-tabletop-replaces-mural.md:87` never said whose
screen, so nothing is lost.

**The door stays open at no cost.** tldraw sync already carries per-user cursors and selections
*outside* the undoable document. If a presence lane is ever exposed, shared arming becomes cheap
without ever touching the document store — so revisiting this is a later, additive question, not
a reversal. Recorded in the map's fog.

**This is what makes furniture "recognise stuff" in the sense Jess meant when charting the map.**
The zone is a real typed shape that draws itself and can light up. What it *doesn't* get is
tldraw's drop plumbing — and it doesn't need it.

### Zones notice; they do not hold

`canReceiveNewChildrenOfType` stays `false`. A card that comes to rest in the graveyard stays a
child of the page; the graveyard is not its parent and carries nothing about its contents.

Rejected: `BaseFrameLikeShapeUtil`, which would auto-reparent a card into the zone. It matches the
physical table best and would make "move the whole graveyard" free, but `getClipPath` **clips
children to the zone's bounds** and `kickoutOccludedShapes` auto-reparents anything nudged past
the edge — and it would make the playmat the parent of every permanent on the battlefield.

This also keeps the symmetry ticket 02 established: a card carries nothing about its passengers,
and a zone carries nothing about its contents. Nothing structural knows the graveyard holds
twelve cards; anyone who wants that count computes it from positions.

### Overlap: topmost wins, and index order becomes load-bearing

When a card's centre sits inside two zones, **the one with the highest index wins.** Chosen over
smallest-area-wins because it matches tldraw's own convention (`getDraggingOverShape` walks
`getShapesAtPoint` top-down and takes the first hit), so any future tldraw-native mechanism
agrees with us and there's no divergence to explain. The server controls draw order via
`nextIndex`, so precedence is fully determined at draw time.

**Two implementation constraints follow, and they are the price of this choice:**

1. **`nextIndex` stops being cosmetic.** Furniture must be drawn **least-specific first** — the
   playmat before the command zone that sits on it — because draw order now decides which zone
   claims a card. Today's `nextIndex` calls are incidental z-ordering; after this they are a
   precedence declaration and want a comment saying so.
2. **Re-putting a zone must preserve its index, not mint a fresh one.**
   `ensureStackStripWidth` currently calls `regionShape(..., nextIndex(entry.tableName))` on
   **every** seat join, so the Stack strip climbs above every player area each time. Harmless
   today because the strip doesn't overlap anything; under topmost-wins it's a latent precedence
   bug.

This replaces "first match in `getCurrentPageShapes()` order" — which happened to be index order
anyway, so behaviour is unchanged; it is now deliberate rather than accidental.

### The Stack is a zone

Yes, in the enum, with `seatId: null`. It's where every non-land play arrives and dragging a card
back onto it should be recognised like any other zone entry. Fixes the ticket's observation that
`ensureStackStripWidth` omits `meta.zone` entirely, so dropping a card on the Stack detects
nothing today.

### Appearance is deliberately NOT decided here

Split out on the `shuffler-looks-like-itself` owner's advice, and its reasoning is worth keeping:

- **Today's dashed-grey-serif look is scaffolding, not a decision.** It's stock tldraw `geo`
  styling — it appears in no design-history entry and no open choice. *"New UI pulls toward the
  standard, not toward what it sits next to"* — and what it sits next to here is tldraw's default,
  which is nobody's design decision at all.
- **The label wants Orbitron.** A zone name is chrome, and chrome is Orbitron. `serif` today
  isn't a choice, it's tldraw's `font` prop enum, which has no Orbitron in it. The owner calls
  this *"the single strongest design argument for your custom shape."*
- **The armed state has no token and no sanctioned pattern** — it's a genuinely new design
  decision. Two hard constraints on whoever makes it: don't build it from `--light-pink` (that's
  the global focus-ring colour, so it would read as "focused", not "armed"), and decorate with
  `border`/`box-shadow`, never `outline` (globally spoken for as the focus channel). And **do not
  port `.hand-drop-zone.drag-over`** from `game.css` — its `rgba(76,175,80,…)` is the last
  surviving raw Material green in the app and is already on the deletion list.
- **Stage it, don't argue it.** Twice now (design choices 5 and 7) a question unanswerable in
  prose was settled in one sentence once Jess could see both options rendered.

So the implementer reproduces today's stock `geo` look — but **loosely, and deliberately without
chasing fidelity.** The owner's `-review` caught that "verbatim" is unimplementable and therefore
dangerous: today's look comes from tldraw's prop *enums* (`dash: "dashed"`, `color: "grey"`,
`size: "s"`, `font: "serif"`), which tldraw renders through its own hand-drawn stroke geometry and
theme. A `component()` drawing `border: 1px dashed grey` is an approximation, and an implementer
told "verbatim" will approximate while believing they copied — at which point the next agent cites
it as precedent. So: approximate on purpose, comment that it is provisional scaffolding and not
the fleet's zone treatment, and note that **its literal values are a knowingly-untokenized
placeholder, exempt from the Layer-1 token rule** — otherwise a design-lint sweep will "fix" the
placeholder into a decision. Ticket 11 owns the real appearance.

**One thing the layering decision above costs ticket 11, and it belongs on the record here.** An
opaque picture layered over the box hides that box's border, interior tint, and inset shadow — so
for the **playmat and library specifically**, the armed treatment must read as an *outward* effect.
That rules out the interior-tint pattern (the app's only existing armed treatment) for exactly the
two zones the parity item names.

**Related: index order now serves two competing jobs.** Topmost-wins precedence wants
least-specific-first (playmat below the command zone); layering wants each picture above its own
box. Both are satisfiable — the picture and its box are the same zone, so their relative order
doesn't affect precedence between *different* zones — but it must be done knowingly, not by
`nextIndex` call order.

### Blast radius

Same three-place registration as `mtg-card`, and it should ride the **same** change — `useSync`
`shapeUtils`, `<Tldraw shapeUtils>`, and `rooms.ts`'s `createTLSchema`. Doing `mtg-zone` in a
separate deploy from `mtg-card` doubles the white-screen window for no gain (a browser on an old
bundle hits `assert(shapeUtil)` inside the shared rendering computation, killing the whole
canvas, not one shape).

Touched: `tableFurniture.ts` (`regionShape` becomes an `mtg-zone` builder; `Zone` gains `stack`
and `command`; the name label gains `isLocked: true`; `ensureStackStripWidth` stops minting a
fresh index), the card util's `zoneAt` (matches on type, returns zone + `seatId`), and a new
zone `ShapeUtil` in `src/client/shapes/`. Nothing is persisted, so there is no migration —
confirmed against `rooms.ts`, which says rooms are in-memory only and a redeploy wipes the board.
That's what makes "a later prop change is free" true, and it stops being true the day
`tabletop-survives-restart` lands.

**A self-rendering shape needs its own `toSvg`** or it vanishes from canvas exports. Zones don't
have one today because stock `geo` supplied it. Cheap for a box-and-label; it gets expensive in
proportion to whatever ticket 11 picks (gradients, shadows, a webfont), which is why that cost
belongs *inside* 11's option comparison rather than being discovered after.

**`label` as a stored prop** relocates one small thing: who authors the string. Content decisions
("Graveyard" vs "Seat 2 · Graveyard", casing) now land in `tableFurniture.ts` rather than in the
render. That's the right home — the server already knows the seat and the player name — and it's
cheap to move later.

### Not decided here

- **What the occurrence carries** once a zone entry is detected — the payload, and whether it
  names the `seatId` — is [ticket 10](10-what-a-shape-knows.md)'s, now unblocked. This ticket
  establishes only that the scan *can* name both zone and seat.
- **What a zone looks like** — new [ticket 11](11-what-a-zone-looks-like.md).
- **Where Tabletop CSS tokens live.** `apps/tabletop` has **no CSS source file at all**, only a
  built `dist/client/assets/*.css`, while the fleet's Layer-1 craft rule says "use `var(--…)`,
  not a literal" on the Tabletop. A self-rendering zone hits this the moment it draws its own
  box. That's a fleet design-plumbing decision, not physics — captured in the map's fog and as
  a `TODO.md` line.
