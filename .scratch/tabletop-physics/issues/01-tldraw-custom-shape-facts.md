# What does tldraw 5.2.5 actually require of a custom shape type?

Mountain: tabletop-replaces-mural
Type: research
Status: resolved

## Question

Every other ticket on this map hangs on one architectural choice — keep extending
`ImageShapeUtil`, or declare genuine custom shape types for cards and furniture. That choice
can't be made on vibes; it needs the facts about what tldraw charges for it. Find them in
tldraw's own docs and source for the version this repo pins (`tldraw@5.2.5`), citing sources.

- **Declaring a custom shape type.** What's the minimum — `ShapeUtil` subclass, a props
  validator, a default-props function, registration in `shapeUtils`? What must be true for the
  editor to render, select, hit-test, and bind to it?
- **Sync.** This board runs `TLSocketRoom` (`apps/tabletop/src/server/rooms.ts`). Does a custom
  shape type need to be registered server-side too, or does the sync server stay schema-agnostic?
  What happens when a client with an unknown shape type joins?
- **Schema migrations.** If shape props change later, what does tldraw require? Is there a
  migration story, and what breaks without one? (Note: `SEAMAP.md` says everything persisted is
  versioned and there's no backwards-compatibility promise — failing loudly is acceptable. And
  today there's no persistence at all, so this may be nearly free *right now* and expensive later.)
- **What extending `ImageShapeUtil` costs.** Which stock behaviours come along that we may not
  want (crop on double-click, resize handles, free rotation, aspect locking)? Which of those can
  be suppressed on a subclass, and which only go away with a genuine custom type?
- **Custom props vs `meta`.** tldraw's own guidance on when data belongs in `props` (part of the
  shape's schema, validated, migratable) versus `meta` (freeform, untyped). Today everything
  card-ish lives in `meta`.
- **Attachment mechanisms.** Grouping, parenting/binding, and frames-reparent-children — what
  each actually is in 5.2.5, and which ones survive a drag of the parent. This is the fact base
  for the counters, post-its, and cards-behind-cards tickets.
- **Custom shapes and the toolbar.** Does declaring a custom type force UI work (a tool, an
  icon), or can a shape exist that only ever arrives programmatically?

## Answer

Full findings, with a file:line or URL on every claim:
[research/tldraw-custom-shapes.md](../research/tldraw-custom-shapes.md). Verified against the
installed source (`tldraw@5.2.5` confirmed) and tldraw.dev.

- **A custom shape is cheap to declare.** Four abstract methods (`getDefaultProps`, `getGeometry`,
  `component`, `getIndicatorPath`) plus `static type = '…' as const`. `static props` and
  `static migrations` are both *optional*. `BaseBoxShapeUtil` supplies `getGeometry` + `onResize`,
  cutting it to three. **No tool and no toolbar entry is required** — programmatic
  `editor.createShape` is a first-class path, which is exactly how cards and furniture arrive.
- **The real cost is sync, and it's a three-place change.** `TLSocketRoom` is *not*
  schema-agnostic: it defaults to `createTLSchema()` (stock shapes only) and **disconnects any
  client that pushes an unknown shape type, with `INVALID_RECORD`** — it does not drop the record.
  So a custom type needs `useSync({ …, shapeUtils })` (we pass none today —
  `TablePage.tsx:65`), `<Tldraw shapeUtils>` (already), *and* `new TLSocketRoom({ schema })`
  (`rooms.ts:49`). Server-side, `myShape: {}` is a documented valid minimum. Worse, the failure is
  *delayed*: an unknown migration sequence connects fine and only blows up on first push.
- **Migrations are free today and expensive later.** Rooms are in-memory, so there is nothing to
  migrate — but omitting them means clients on two different deploys **cannot share a room**, and
  that bites before persistence does. Without a migration, a changed prop surfaces as
  `ValidationError: At shape.props.X: Expected …, got undefined`, rethrown, not swallowed.
- **The sharp cost of subclassing `ImageShapeUtil` is UI keyed on the literal `'image'`, not
  crop-the-capability.** `DefaultImageToolbar` shows on every selected card, its crop button is
  gated only on `!isReadonly` (never on `canCrop`), and its aspect-ratio dropdown writes
  `props.crop` directly. Flip actions apply too. `override canCrop = () => false` does not remove
  any of it. Cards also inherit nine required image props including `crop`/`flipX`/`flipY`.
- **One util instance serves *every* `image` shape** — a same-`type` util *replaces* the stock one
  outright. Cards, the locked playmat/library furniture, and stray dropped JPEGs all route through
  `MtgCardImageShapeUtil`, insulated only by `if (!meta.instanceId) return` inside each handler.
  That "one util, three meanings" is the strongest structural argument for a real type.
- **Tap is free either way** — `canRotate` does not exist in 5.2.5; rotation is a base field.
  Don't let it argue for a custom type.
- **Attachment**: *parenting* is the cheap one (children move via the parent transform, no custom
  type, no per-child writes). *Grouping* is parenting plus a shape that **auto-dissolves at one
  child** — so it can't hold a single counter. *Bindings* move nothing themselves and cost the
  same three-place registration as a shape. Only a **custom container** (`BaseFrameLikeShapeUtil`
  / `onDragShapesIn`) gives furniture the target-side hooks ticket 01-zone-entry-events wanted.
- **`props` vs `meta`**: the documented line is "does tldraw read it?". `meta` syncs and merges
  exactly like `props` but is **validated only as JSON and never migrated** — a `static meta`
  member doesn't exist, so today `instanceId`, `scryfallId`, `cardName`, and `zone` are entirely
  unchecked.
- **⚠️ v5 broke the tutorials.** `indicator()` → `getIndicatorPath()` (v5.0.0) and
  `TLBaseShape<>` → `TLGlobalShapePropsMap` augmentation (v4.3.0). Implement from the 5.x docs,
  not from any example found by search.
