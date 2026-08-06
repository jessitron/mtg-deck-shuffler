# What does tldraw 5.2.5 actually require of a custom shape type?

Mountain: tabletop-replaces-mural
Type: research
Status: open

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

<!-- resolved by a /research subagent; findings land on a research/ branch and are linked here -->
