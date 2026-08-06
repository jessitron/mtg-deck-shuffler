# What tldraw 5.2.5 requires of a custom shape type

Research for [`.scratch/tabletop-physics/issues/01-tldraw-custom-shape-facts.md`](../issues/01-tldraw-custom-shape-facts.md).
Mountain: tabletop-replaces-mural.

**Version verified.** `apps/tabletop/package.json:27-32` pins `tldraw`, `@tldraw/sync`, and
`@tldraw/sync-core` all at `5.2.5`; confirmed installed at
`node_modules/tldraw/package.json:4` (`"version": "5.2.5"`) and
`node_modules/@tldraw/editor/package.json`. **Full TypeScript source ships in the packages**
(`node_modules/@tldraw/*/src/`), so every source claim below is against the exact installed code.

**Sources.** tldraw's own docs (`https://tldraw.dev`; the whole corpus is published as plain
text at `https://tldraw.dev/llms-full.txt`) and the installed source. All paths below are
absolute-from-repo-root; `node_modules/…` means
`/Users/jessitron/code/jessitron/mtg-deck-shuffler/node_modules/…`.

**Two docs traps found up front, both of which invalidate most tutorials you'd find:**
v5.0.0 replaced `ShapeUtil.indicator()` with `getIndicatorPath()`, and v4.3.0 replaced
`TLBaseShape<...>` with `TLGlobalShapePropsMap` module augmentation. See
[v5 breaking changes](#appendix-v5-breaking-changes-that-invalidate-older-tutorials).

---

## Declaring a custom shape type

### The minimum

**Six members. Five compiler-enforced, one (`static type`) runtime-enforced only.**

Abstract members of `ShapeUtil` — the complete set
(`node_modules/@tldraw/editor/src/lib/editor/shapes/ShapeUtil.ts`, class declared `:109`):

| Member | Line | Signature |
|---|---|---|
| `getDefaultProps` | `:189` | `abstract getDefaultProps(): Shape['props']` |
| `getGeometry` | `:210` | `abstract getGeometry(shape, opts?): Geometry2d` |
| `component` | `:218` | `abstract component(shape): any` |
| `getIndicatorPath` | `:232` | `abstract getIndicatorPath(shape): TLIndicatorPath \| undefined` |

Nothing else in the class is abstract. The docs agree exactly —
`https://tldraw.dev/sdk-features/shapes`:

> "Every ShapeUtil must implement four methods: `getDefaultProps` returns default property
> values for new shapes, `getGeometry` returns a mathematical representation for hit testing
> and bounds calculation, `component` returns a React component that renders the shape, and
> `getIndicatorPath` returns paths for the selection outline."

Statics (`ShapeUtil.ts:158-182`; constructor contract mirrored at `:31-37`):

| Static | Line | Type | Required? |
|---|---|---|---|
| `props` | `:158` | `static props?: RecordProps<TLUnknownShape>` | **Optional** |
| `migrations` | `:165` | `static migrations?: LegacyMigrations \| TLPropsMigrations \| MigrationSequence` | **Optional** |
| `type` | `:172` | `static type: string` | **De facto required, not TS-enforced** |
| `handledAssetTypes` | `:182` | `static handledAssetTypes?: readonly string[]` | Optional |

`static type` has no initializer and `strictPropertyInitialization` doesn't apply to statics, so
omitting it type-checks; at runtime the util registers under the key `"undefined"`
(`node_modules/@tldraw/editor/src/lib/editor/Editor.ts:441`). Use
`static override type = 'mtg-card' as const` — the `as const` is required per
`https://tldraw.dev/releases/v4.3.0`:

> "**Use `as const` on the static `type` field.** TypeScript may widen
> `static override type = 'my-shape'` to `string`, which fails the new constraint."

A verbatim minimal example exists in tldraw's own test suite:
`node_modules/tldraw/src/test/notVisibleShapes.test.ts:35-62`.

### What `props` and `migrations` buy, and what omitting them costs

**Omitting `props`** does not throw. `createShapeValidator`
(`node_modules/@tldraw/tlschema/src/shapes/TLBaseShape.ts:158-181`), line `:178`:

```ts
props: props ? T.object(props) : (T.jsonValue as any),
```

So the shape's `props` are validated only as arbitrary JSON. Base fields (`id`, `x`, `y`,
`rotation`, `index`, `parentId`, `type`, `isLocked`, `opacity`) are still validated (`:168-177`).
Second consequence: `getShapePropKeysByStyle(Util.props ?? {})` (`Editor.ts:443`) yields an empty
map, so the shape participates in no shared `StyleProp` (color, size, …). The docs are blunt about
the cost (`https://tldraw.dev/docs/sync`):

> "Both `props` and `migrations` are optional. If you omit `props`, you won't have any
> server-side validation for your shape, which could result in bad data being stored. If you
> omit `migrations`, clients on different versions won't be able to collaborate without errors."

**Omitting `migrations`** is handled explicitly —
`node_modules/@tldraw/tlschema/src/recordsWithProps.ts:160-172`:

```ts
if (!migrations) {
  // provide empty migrations sequence to allow for future migrations
  result.push(createMigrationSequence({ sequenceId, retroactive: true, sequence: [] }))
}
```

**Trap:** if you *do* supply a full `MigrationSequence` (an object carrying its own `sequenceId`),
`recordsWithProps.ts:174-178` asserts `sequenceId === 'com.tldraw.shape.' + subType`. Use the
`{ sequence: [...] }` (`TLPropsMigrations`) form via `createShapePropsMigrationSequence`
(`node_modules/@tldraw/tlschema/src/records/TLShape.ts:506-510` — a pass-through, typing only).

### How a ShapeUtil becomes a schema record

The chain, in order:

1. `createTLSchemaFromUtils` — `node_modules/@tldraw/editor/src/lib/config/createTLStore.ts:116-137`.
   Returns `opts.schema` verbatim if given; otherwise `createTLSchema({ shapes: utilsToMap(checkShapesAndAddCore(opts.shapeUtils)) })`.
2. `checkShapesAndAddCore` — `node_modules/@tldraw/editor/src/lib/config/defaultShapes.ts:15-31`.
   Prepends `GroupShapeUtil`; throws `Shape type "X" is a core shapes type and cannot be
   overridden` and `Shape type "X" is defined more than once`. **You cannot register a card util
   alongside the stock image util under the same type — it is replace-or-nothing.**
3. `utilsToMap` (bottom of `createTLStore.ts`) — the exact consumption point:
   `static type` → the record key, `static props` → `SchemaPropsInfo.props`,
   `static migrations` → `SchemaPropsInfo.migrations`. The class object is duck-typed; the
   constructor is never called here.
4. `createShapeRecordType` — `node_modules/@tldraw/tlschema/src/records/TLShape.ts:566-585`.
   Builds **one `RecordType` named `shape` whose validator is a discriminated union on `type`**,
   one branch per registered shape type. Your custom type is simply another branch.
5. Editor-side registration, **independent of the schema** — `Editor.ts:433-467`:
   `new Util(this)`, `_shapeUtils[Util.type] = util`.

Consequence worth naming: **the store schema and `editor.shapeUtils` are two separate
registrations built from the same array.** Desynchronizing them is the failure mode this repo
would hit (see [Sync](#sync)).

### Render, select, hit-test

**Hit-testing is entirely derived from `getGeometry`. `hitTestPoint` does not exist on
`ShapeUtil` in 5.2.5.**

- `Editor.getShapeGeometry` — `Editor.ts:5289-5303` — memoizes `getShapeUtil(shape).getGeometry(shape, opts)`.
- `Editor.isPointInShape` — `Editor.ts:6085-6105` — delegates to `Geometry2d.hitTestPoint`.
- `Geometry2d.hitTestPoint` — `node_modules/@tldraw/editor/src/lib/primitives/geometry/Geometry2d.ts:102-109`
  — point-in-polygon if `isClosed && (isFilled || hitInside)`, else distance-within-`margin`.

So: **return a `Rectangle2d` from `getGeometry` and you get hit-testing, selection, brush
selection, bounds, snapping, and the spatial index for free.** `isFilled: false` means clicks
pass through the interior.

Default capability flags on the base class (all `ShapeUtil.ts`):

| Method | Line | Default | | Method | Line | Default |
|---|---|---|---|---|---|---|
| `canSnap` | `:266` | `true` | | `canBeLaidOut` | `:361` | `true` |
| `canTabTo` | `:276` | `true` | | `canCull` | `:372` | `true` |
| `canScroll` | `:285` | `false` | | `providesBackgroundForChildren` | `:385` | `false` |
| `canBind` | `:294` | `true` | | `hideResizeHandles` | `:445` | `false` |
| `canEdit` | `:303` | `false` | | `hideRotateHandle` | `:454` | `false` |
| `canResize` | `:312` | `true` | | `hideSelectionBoundsBg` | `:463` | `false` |
| `canResizeChildren` | `:321` | `true` | | `hideSelectionBoundsFg` | `:472` | `false` |
| `canEditInReadonly` | `:330` | `false` | | `isAspectRatioLocked` | `:481` | `false` |
| `canEditWhileLocked` | `:339` | `false` | | `isFrameLike` | `:492` | `false` |
| `canCrop` | `:348` | **`false`** | | `isExportBoundsContainer` | `:506` | `false` |
| | | | | `canReceiveNewChildrenOfType` | `:557` | `false` |
| | | | | `canRemoveChildrenOfType` | `:573` | `true` |

**`canRotate` does not exist** — zero hits across `@tldraw/editor/src` and `tldraw/src`. Rotation
is universal: `rotation` is a base `TLShape` field, gated only cosmetically by `hideRotateHandle`
(`node_modules/tldraw/src/lib/overlays/SelectionForegroundOverlayUtil.ts:532-552`) and lock state.
Actions `rotate-cw`/`rotate-ccw` (`node_modules/tldraw/src/lib/ui/context/actions.tsx:1166-1198`)
call `editor.rotateShapesBy` with no per-util check.

**Tap-by-rotation is free under either architecture.** `onClick` is an optional base hook
(`ShapeUtil.ts:968`) dispatched from
`node_modules/tldraw/src/lib/tools/SelectTool/childStates/PointingShape.ts:32-33, 93-94`. The
existing implementation at `apps/tabletop/src/client/shapes/MtgCardImageShapeUtil.tsx:42-48` is
the whole mechanism. **Tap is not an argument for a custom type.**

**Resize caveat.** `canResize` defaults `true` but `onResize` is optional with no base
implementation (`ShapeUtil.ts:767`), and `Editor.resizeShape` guards
`if (util.onResize && util.canResize(initialShape))` (`Editor.ts:8197`). So a bare `ShapeUtil`
shows resize handles that do nothing. Extending `BaseBoxShapeUtil`
(`node_modules/@tldraw/editor/src/lib/editor/shapes/BaseBoxShapeUtil.tsx:13-30`) supplies both
`getGeometry` (a `Rectangle2d` from `props.w`/`props.h`) and `onResize`, cutting the abstract
surface to `getDefaultProps`, `component`, `getIndicatorPath`, plus `static type`. Confirmed by
the official example (`https://tldraw.dev/examples/shapes/tools/custom-shape`):

> "If we extended the `BaseBoxShapeUtil` class instead, we wouldn't have define methods such as
> `getGeometry` and `onResize`."

### What renders when a shape type has no util registered

**Nothing. You get a thrown assertion — there is no "unknown shape" fallback in 5.2.5.**

`Editor.ts:1325-1330`:
```ts
const shapeUtil = getOwnProperty(this.shapeUtils, type)
assert(shapeUtil, `No shape util found for type "${type}"`)
```

That is the only "missing util" error string in the editor, and the render path hits it
unconditionally at `Editor.ts:4657` inside `getUnorderedRenderingShapes` — **so one unregistered
shape breaks the whole rendering computation**, not just its own tile. A guard exists for callers
who check first: `editor.hasShapeUtil` (`Editor.ts:1342-1344`).

`component()` itself is wrapped in an `OptionalErrorBoundary` with `ShapeErrorFallback`
(`node_modules/@tldraw/editor/src/lib/components/Shape.tsx:155-157, 248-256`), so a shape whose
render throws degrades to a fallback rather than killing the canvas.

### Unknown shape type entering the store

`Store.put` (`node_modules/@tldraw/store/src/lib/Store.ts:646-651, 668-674`)
→ `StoreSchema.validateRecord` (`node_modules/@tldraw/store/src/lib/StoreSchema.ts:370-395`)
→ `RecordType.validate` (`node_modules/@tldraw/store/src/lib/RecordType.ts:309-314`)
→ the `T.union('type', …)` validator
→ `node_modules/@tldraw/validate/src/lib/validation.ts:1661-1678` throws
`Expected one of "group" or "geo" or … , got "mtg-card"`.

Note the shape's `typeName` is still `'shape'`, which *is* registered — the failure is one level
deeper, in the union branch lookup.

The error routes to tldraw's `onValidationFailure`
(`node_modules/@tldraw/tlschema/src/TLStore.ts:397-423`), which annotates with
`origin: 'store.validateRecord'`, `storePhase`, and `isExistingValidationIssue` — **and then
rethrows unconditionally at `:422`, in every phase including `'initialize'`.** The comment above
it says initialize "should allow invalid records so people can load old buggy data"; the code
only tags, it does not swallow. Final message shape:
`ValidationError: At shape.type: Expected one of … , got "mtg-card"`.

**This fails loudly — which SEAMAP.md says is acceptable.**

---

## Sync

**The sync server is NOT schema-agnostic. This is the single most constraining finding.**

### `TLSocketRoom`'s schema

- Options interface: `node_modules/@tldraw/sync-core/src/lib/TLSocketRoom.ts:83-131`. There **is**
  a `schema?: StoreSchema<R, any>` option at `:94`.
- Default when omitted — `TLSocketRoom.ts:246`: `schema: opts.schema ?? (createTLSchema() as any)`.
- `createTLSchema()` with no args defaults to `defaultShapeSchemas` —
  `node_modules/@tldraw/tlschema/src/createTLSchema.ts:336-339`. That covers arrow, bookmark,
  draw, embed, frame, geo, group, highlight, image, line, note, text, video
  (`createTLSchema.ts:113-127`) and **excludes any custom shape type**.
- **This repo passes no `schema`**: `apps/tabletop/src/server/rooms.ts:49` — the options object
  contains only `onSessionRemoved`. So the room runs on stock `createTLSchema()`.

### What happens to an unknown shape type on the wire

`TLSyncRoom.handlePushRequest`:

1. **Typename gate** — `node_modules/@tldraw/sync-core/src/lib/TLSyncRoom.ts:1166-1173`. Checks
   `typeName` (`shape`, `page`, `asset`…), built at `:267-271`. A custom shape *type* sails past
   this gate, because its `typeName` is still `shape`.
2. **Up-migration** — `TLSyncRoom.ts:1044-1048`. Failure ⇒ `TLSyncError(…, CLIENT_TOO_OLD)`.
3. **Per-record validation** — `TLSyncRoom.ts:1058, 1068, 1097`, implemented in
   `node_modules/@tldraw/sync-core/src/lib/recordDiff.ts:17-30, 66-72`. Any validator throw
   becomes `TLSyncError(error.message, TLSyncErrorCloseEventReason.INVALID_RECORD)`.
4. **Error path** — every `TLSyncError` is caught at `TLSyncRoom.ts:751-757` and routed to
   `rejectSession(sessionId, e.reason)` → `removeSession(sessionId, fatalReason)`
   (`TLSyncRoom.ts:776-819`).

**So a pushed record whose shape type the server doesn't know is not dropped and not passed
through — the pushing client is disconnected with `INVALID_RECORD`.**

Incompatibility reasons (`node_modules/@tldraw/sync-core/src/lib/TLSyncClient.ts:105-124`):
`NOT_FOUND`, `FORBIDDEN`, `NOT_AUTHENTICATED`, `UNKNOWN_ERROR`, `CLIENT_TOO_OLD`,
`SERVER_TOO_OLD`, `INVALID_RECORD`, `RATE_LIMITED`, `ROOM_FULL`. Legacy wire enum for protocol-v6
clients at `node_modules/@tldraw/sync-core/src/lib/protocol.ts:44-49`, mapped at
`TLSyncRoom.ts:787-806`. Triggers:

- `CLIENT_TOO_OLD` — protocol below server's (`TLSyncRoom.ts:885-887`); `message.schema == null`
  (`:893-896`); migration returns error during push (`:1047, 1093, 1114`).
- `SERVER_TOO_OLD` — protocol above server's (`:888-890`); client sequence version exceeds
  server's (`TLSyncRoom.ts:845-861`).
- `INVALID_RECORD` — unknown `typeName` (`:1170`) or any validator failure (`recordDiff.ts:27, 71`).

**Delayed-failure nuance.** An *unknown sequence id* in the client's schema does **not** cause
rejection at connect: `getMigrationsSince` intersects sequences
(`node_modules/@tldraw/store/src/lib/StoreSchema.ts:439-449`) and silently ignores client-only
ones. So a client carrying custom-shape migrations **connects fine**; the failure surfaces later,
at the first push of a record of that type. That is an unpleasant failure signature to debug.

### What schema the client builds — the load-bearing question

`useSync(opts: UseSyncOptions & TLStoreSchemaOptions)` —
`node_modules/@tldraw/sync/src/useSync.ts:167`. It strips non-schema keys and calls
`useTLSchemaFromUtils(schemaOpts)` at `:189`, then `createTLStore({ schema, … })` at `:283-294`.
`TLStoreSchemaOptions` is `{ schema } | { shapeUtils, bindingUtils, assetUtils, migrations, records }`
(`createTLStore.ts:59-69`); with `shapeUtils` absent, `createTLSchemaFromUtils` passes `undefined`
for `shapes` and `createTLSchema` falls back to `defaultShapeSchemas`.

**So `useSync` does take `shapeUtils`, and this repo doesn't pass them.**
`apps/tabletop/src/client/TablePage.tsx:65` calls `useSync({ uri, assets: inlineAssets })`;
`shapeUtils` goes only to `<Tldraw>` at `:82`. Passing them to `<Tldraw>` does **not** fix the
store schema: the `Editor` uses `shapeUtils` only to instantiate behavior utils keyed by
`Util.type` (`Editor.ts:433-457`) and never rebuilds the schema of a store handed in via the
`store` prop.

The docs say exactly this (`https://tldraw.dev/docs/sync`, § Custom shapes & bindings):

> "`@tldraw/sync` validates the contents of your document and runs migrations to make sure
> clients of different versions can collaborate without issue. To support this, **you need to
> make sure that both the sync client and server know about any custom shapes or bindings
> you've added.**"

> "You can pass `shapeUtils` and `bindingUtils` props to `useSync`. Unlike `<Tldraw />`, these
> don't automatically include tldraw's default shapes like arrows and rectangles. You should
> pass those in explicitly if you're using them."

and for the server:

> "Use `createTLSchema` to create a store schema, and pass that into `TLSocketRoom`. You can use
> shape/binding utils here, but **the schema will only look at two properties: `props` and
> `migrations`**. You need to provide the default shape schemas if you're using them."

```ts
const schema = createTLSchema({
  shapes: {
    ...defaultShapeSchemas,
    myCustomShape: { props: myCustomShapeProps, migrations: myCustomShapeMigrations },
    mySimpleShape: {},   // schema knows the type; no migrations or validation
  },
  bindings: defaultBindingSchemas,
})
const room = new TLSocketRoom({ schema, /* … */ })
```

Note `mySimpleShape: {}` — **registering the bare type name is a documented, valid server-side
minimum**, which makes the server change cheap.

And from `https://tldraw.dev/sdk-features/collaboration`:

> "**Pass the shape and binding utilities to both the sync hook (for schema registration) and
> the Tldraw component (for rendering). If they don't match, shapes may fail to sync or render
> correctly.**"

### The concrete cost for this repo

Going to a genuine custom shape type is a **three-place** change, all mandatory together:

1. `apps/tabletop/src/client/TablePage.tsx:65` — `useSync({ uri, assets, shapeUtils: [...customShapeUtils, ...defaultShapeUtils] })`.
   Without this, the client store rejects the shape locally at `Store.put`.
2. `apps/tabletop/src/client/TablePage.tsx:82` — `<Tldraw shapeUtils={customShapeUtils} />` (already done).
3. `apps/tabletop/src/server/rooms.ts:49` — `new TLSocketRoom({ schema: createTLSchema({ shapes: { ...defaultShapeSchemas, 'mtg-card': {…} } }), … })`.
   Without this, the server disconnects any client that pushes one.

Also in scope: **the server is a shape author, not just a relay.**
`apps/tabletop/src/server/tableFurniture.ts:96-110` and `apps/tabletop/src/server/cardArrival.ts`
hand-construct raw `type: "image"` / `type: "geo"` shape records with literal `props` objects and
`store.put` them. Every one of those literals is a schema commitment that must move in lockstep
with a custom type — and being hand-written `as any` (`tableFurniture.ts:81, 109, 208`), the
compiler will not catch the drift; the sync validator will, at runtime, by disconnecting somebody.

`loadSnapshot` delegates to `loadSnapshotIntoStorage(txn, this.room.schema, snapshot)`
(`TLSocketRoom.ts:744-748`), i.e. through the room's schema. *Not established:* whether that
throws or silently drops on an unvalidatable record.

---

## Schema migrations

### What's required

Nothing, strictly. `migrations` is optional (`ShapeUtil.ts:165`); with none, an empty retroactive
sequence `com.tldraw.shape.<yourType>` is registered for you
(`recordsWithProps.ts:160-173`). Helpers:

- `createShapePropsMigrationIds('mtg-card', { AddFace: 1, … })` →
  `` `com.tldraw.shape.mtg-card/1` `` (`TLShape.ts:538-544`). The `com.tldraw.` prefix is **not**
  optional — `recordsWithProps.ts:164, 174-179` asserts it.
- A `TLPropsMigration` is `{ id, dependsOn?, up(props), down? }`, `down` being
  `'none' | 'retired' | fn` (`recordsWithProps.ts:88-103`). Migrations touch `record.props`
  only (`recordsWithProps.ts:250-275`).

Docs (`https://tldraw.dev/sdk-features/persistence`):

> "Snapshots include schema version information. When you load a snapshot from an older version,
> the store migrates it automatically. You don't need to do anything for tldraw's built-in types."
> … "The `down` migrations are used in multiplayer when a peer needs an older schema version."

### What breaks without one

**Not a migration error — a validation error, one step later.** With no migrations the migration
step succeeds trivially (`StoreSchema.ts:531-534`), then the props object validator runs each key
against `undefined` (`node_modules/@tldraw/validate/src/lib/validation.ts:669-677`) and throws.
Path-prefixed by `rethrowPrefixed` (`:172-177`) and `T.model('shape', …)` (`:1729-1741`):

> `ValidationError: At shape.props.face: Expected a number, got undefined`

And, per the store schema above, `onValidationFailure` **rethrows** (`TLStore.ts:422`).

Other failure shapes, for the record:
- Persisted sequence newer than the code → `Result.err('Incompatible schema?')`
  (`StoreSchema.ts:470-476`) → `MigrationFailureReason.MigrationError` (`:527-532`).
- Snapshot load → `throw new Error('Failed to migrate snapshot: …')`
  (`node_modules/@tldraw/store/src/lib/Store.ts:847-850, 874-877`).
- Over sync → `TLSyncError(reason, CLIENT_TOO_OLD)` (`TLSyncRoom.ts:1043-1048`) → session removal.

### The bearing on this repo, specifically

The ticket's own note is confirmed correct and worth restating sharply: **rooms are in-memory
only** (`apps/tabletop/src/server/rooms.ts:11-14`, "Rooms are IN-MEMORY ONLY and ephemeral: a
redeploy wipes the board"), so there are no old records to migrate. **Right now migrations are
free — literally nothing to write.** The cost is *deferred*, not avoided: it arrives the day the
Tabletop gains persistence (`tabletop-survives-restart`) and the day two clients on different
deploys share a room. The second one bites sooner than persistence does, and it bites as a
disconnect, not a warning.

Note also the *cross-version multiplayer* cost is not hypothetical for a deployed board: a client
running an older bundle and one running a newer bundle in the same room is exactly the case
`down` migrations exist for.

---

## What extending `ImageShapeUtil` costs

### Inventory of what comes along

`node_modules/tldraw/src/lib/shapes/image/ImageShapeUtil.tsx` — declaration and statics at
`:65-69` (`extends BaseBoxShapeUtil<TLImageShape>`, `static type = 'image'`,
`static props = imageShapeProps`, `static migrations = imageShapeMigrations`,
`static handledAssetTypes = ['image']`).

| Member | Line | Behavior |
|---|---|---|
| `isAspectRatioLocked` | `:80-82` | **always `true`** |
| `canCrop` | `:83-85` | **always `true`** (base default is `false`) |
| `isExportBoundsContainer` | `:86-88` | `true` |
| `getDefaultProps` | `:90-102` | all nine image props |
| `createShapeForAsset` | `:104-118` | mints a `type: 'image'` shape from a dropped image |
| `getGeometry` | `:120-164` | crop/alpha-aware (`ImageEllipse2d`/`Ellipse2d`/`ImageRectangle2d`/`Rectangle2d`) |
| `getAriaDescriptor` | `:166-168` | returns `props.altText` |
| `onResize` | `:170-205` | `resizeBox` + flipX/flipY on negative scale + crop mirroring |
| `component` | `:207-209` | two-`<img>` crossfade, broken-asset icon, `HyperlinkButton`, crop-preview ghost (`:370-377, 419-431`) |
| `getIndicatorPath` | `:211-223` | ellipse when circle-cropped; `undefined` while cropping |
| `toSvg` | `:225-259` | remote → data URI, first frame of animated images, crop clip-path, flip transform |
| `onDoubleClickEdge` | `:261-295` | "reset crop to full image" |
| `getInterpolatedProps` | `:296-324` | lerps `w`/`h` **and crop** |

Not present in 5.2.5's `ImageShapeUtil`: no `onDoubleClick`, no `canResize` override (so base
`true`), no `getAspectRatio` (that method exists nowhere in `ShapeUtil.ts`), no `canEdit`/`onEditEnd`.
Alt-text editing is a UI component, not shape-util editing.

From `BaseBoxShapeUtil` (`node_modules/@tldraw/editor/src/lib/editor/shapes/BaseBoxShapeUtil.tsx`),
only `getHandleSnapGeometry` (`:26-30`) survives un-overridden; `getGeometry`, `onResize`, and
`getInterpolatedProps` are all re-overridden by `ImageShapeUtil`.

### The props a card must carry whether it wants them or not

`node_modules/@tldraw/tlschema/src/shapes/TLImageShape.ts:122-132`:

```
w: T.nonZeroNumber, h: T.nonZeroNumber, playing: T.boolean, url: T.linkUrl,
assetId: assetIdValidator.nullable(), crop: ImageShapeCrop.nullable(),
flipX: T.boolean, flipY: T.boolean, altText: T.string
```

**All nine are required keys**; only `assetId` and `crop` are nullable. A card must persist
`playing`, `url`, `crop`, `flipX`, `flipY`, `altText` on every record and inherits the whole image
migration chain (`:157-207`, five migrations). Reciprocally: keeping `type: 'image'` means the
server-side writers, tldraw's asset-drop path, and any persisted room keep validating for free.

### Suppressible on a subclass

These are read through `editor.getShapeUtil(shape)`, so a subclass's answer wins:

- `canCrop` — `Editor.ts:3004`; `SelectTool/childStates/Idle.ts:229, 422, 449, 688`;
  `Crop/children/Idle.ts:93`.
- `canResize` / `hideResizeHandles` — `SelectionForegroundOverlayUtil.ts:528-538`;
  `Resizing.ts:587`; `Editor.ts:8197`.
- `isAspectRatioLocked` — `Resizing.ts:625-628`, consumed `:237`. Already `true` on stock image,
  so uniform scaling is already enforced.
- `hideRotateHandle` — `SelectionForegroundOverlayUtil.ts:532-552`.
- `onDoubleClickEdge`, `getGeometry`, `toSvg`, `component`, `getIndicatorPath`,
  `getInterpolatedProps`, `onResize`, `getDefaultProps` — plain virtuals.

The documented list of capability methods lives only in the API reference
(`https://tldraw.dev/reference/editor/ShapeUtil`): `canBeLaidOut`, `canBind`, `canCrop`, `canCull`,
`canEdit`, `canEditInReadonly`, `canEditWhileLocked`, `canReceiveNewChildrenOfType`,
`canRemoveChildrenOfType`, `canResize`, `canResizeChildren`, `canScroll`, `canSnap`, `canTabTo`,
`hideInMinimap`, `hideResizeHandles`, `hideRotateHandle`, `hideSelectionBoundsBg`,
`hideSelectionBoundsFg`, `isAspectRatioLocked`, `isExportBoundsContainer`, `isFrameLike`,
`shouldClipChild`. All optional — the official example says so:

> "\[c] Some handy methods for controlling different shape behaviour. **You don't have to define
> these**, and they're only shown here so you know they exist."

### NOT suppressible on a subclass — keyed on the literal string `'image'`

This is the real cost, and it is invisible from the util file. Because the subclass keeps
`type === 'image'`, it inherits everything the UI special-cases on that string — and a genuine
custom type would get none of it:

- **`node_modules/tldraw/src/lib/ui/components/Toolbar/DefaultImageToolbar.tsx:20`** —
  `if (!onlySelectedShape || onlySelectedShape.type !== 'image') return null`. **The contextual
  image toolbar appears on every selected card.** Its only other gates are `showToolbar` and
  `isLocked` (`:29-34`).
  - Contents (`DefaultImageToolbarContent.tsx`): replace-media, **crop button `:301-310` gated
    only on `!isReadonly`, never on `canCrop`**, download-original, alt-text.
  - **The aspect-ratio dropdown writes `props.crop` directly via `editor.updateShape`**
    (`DefaultImageToolbarContent.tsx:146-166`), never consulting `canCrop`.
  - So `override canCrop = () => false` makes `setCroppingShape` a no-op
    (`Editor.ts:3023-3036`) but **does not remove the crop button, and the toolbar can still
    mutate crop props out from under you.** This is the sharpest single cost of the subclass
    approach for "cards don't crop".
  - Crop *handle rendering* is gated on being in a `select.crop.*` state, not on `canCrop`
    (`SelectionForegroundOverlayUtil.ts:521-527`) — another route into a crop-looking state.
- **`node_modules/tldraw/src/lib/ui/hooks/menu-hooks.ts:186-196`** — `useOnlyFlippableShape`
  includes `'image'`, so **flip horizontal/vertical menu actions apply to cards**, running through
  `onResize` with negative scale (`ImageShapeUtil.tsx:170-182`).
- `node_modules/tldraw/src/lib/ui/context/actions.tsx:78-85` (`supportsDownloadingOriginal`),
  `:1749-1758` (cmd+Enter focuses the image toolbar).
- `node_modules/tldraw/src/lib/ui/overrides.ts:65` — `image-replace` action works on cards.
- `node_modules/tldraw/src/lib/ui/components/A11y.tsx:109` — cards are announced as "image".
- `node_modules/tldraw/src/lib/ui/components/menu-items.tsx:61`,
  `node_modules/tldraw/src/lib/ui/hooks/useFlatten.ts:39`.
- Alt-text editing writes `props.altText` via `editor.updateShape`
  (`Toolbar/AltTextEditor.tsx:34-42`); nothing on the util gates it.
- **`static handledAssetTypes = ['image']`** (`:69`) + `Editor.ts:459-467` — the subclass becomes
  *the* handler for dropped/pasted image assets, and `createShapeForAsset` mints plain
  `type: 'image'` shapes with no card `meta`. A dropped JPEG is a "card" to the util.

**Caveat, not established:** `DefaultImageToolbar` is an exported, replaceable UI component
(`<Tldraw components={{...}}>`), so overriding `ImageToolbar` to `null` is a visible middle path —
but that it cleanly removes the crop surface was not verified in source this pass.

### The subclass serves ALL image shapes, including furniture

`apps/tabletop/src/client/TablePage.tsx:9, 82` passes `shapeUtils = [MtgCardImageShapeUtil]`.
`node_modules/tldraw/src/lib/Tldraw.tsx:199-202` calls
`mergeArraysAndReplaceDefaults('type', _shapeUtils, defaultShapeUtils)`, and
`node_modules/@tldraw/utils/src/lib/array.ts:271-283` **drops the stock entry entirely** for any
overridden type. `MtgCardImageShapeUtil` declares no `static type` of its own, so it inherits
`'image'` (`ImageShapeUtil.tsx:66`) and displaces `ImageShapeUtil`. `Editor.ts:438-441` registers
exactly one instance per type.

**One util instance therefore serves every `image` shape on the page** — including the locked
playmat/library backgrounds from `apps/tabletop/src/server/tableFurniture.ts:99, 105` and any
user-dropped image. Today they're insulated only *by convention*: `onClick` and `onTranslateEnd`
early-return on `!meta.instanceId`
(`apps/tabletop/src/client/shapes/MtgCardImageShapeUtil.tsx:26, 72`), and locked shapes don't
reach `PointingShape` under default `selectLockedShapes`
(`SelectTool/childStates/Idle.ts:443-447`). **Any future `override canCrop`/`canResize`/
`isAspectRatioLocked` would apply to furniture and stray dropped images too** — those overrides
take a `shape` argument, so they can be conditioned on `shape.meta.instanceId`, but that is a
growing pile of `if (isCard)` inside methods whose whole purpose is to answer per-type.

**That "one util, three meanings" is the structural argument for a custom type**, more than
crop is.

---

## Custom props vs `meta`

`https://tldraw.dev/docs/shapes` (§ Meta):

> "Every shape has a `meta` property for your own data. Tldraw stores and syncs this data but
> doesn't use it itself. It's an escape hatch for attaching extra information to shapes, like the
> name of the user who created a shape or the date it was last changed."
> … "Like `props`, the data in `meta` must be JSON-serializable. Shapes aren't the only records
> with a `meta` property: pages, bindings, assets, and the document record have one too."
> … "By default, a shape's `meta` is an empty object typed as `JsonObject`."

`https://tldraw.dev/sdk-features/shapes` (§ Shape records):

> "The `props` field contains data unique to each shape type. … Shapes also have a `meta` field
> for your own application data, which tldraw stores but doesn't use itself."

**The documented criterion is: does tldraw itself need to read/validate it?** `props` = data the
shape's own behavior and rendering depend on; `meta` = application data tldraw carries but never
reads. Docs are silent on which to prefer for a *domain identifier* specifically (e.g. a card id).

Source comparison:

| | `props` | `meta` |
|---|---|---|
| Declared type | your generic — `node_modules/@tldraw/tlschema/src/shapes/TLBaseShape.ts:75` | `JsonObject` — `TLBaseShape.ts:76` |
| Validated | yes, from `static props` | **shallowly only.** `createShapeValidator` does `meta: meta ? T.object(meta) : (T.jsonValue as any)` (`TLBaseShape.ts:179`) — and `ShapeUtil` has **no `static meta`** member (`ShapeUtil.ts:158-182`), so for anything registered via `shapeUtils` the meta validator is always `undefined`. Net: **valid JSON, nothing more.** |
| Migrated | yes | **no.** `createPropsMigration` reads/writes `record.props` exclusively (`recordsWithProps.ts:260-274`). |
| Syncs | yes | **yes** — a field of the `shape` record, `scope: 'document'` (`TLShape.ts:569`); sync diffs whole records. |
| `editor.updateShape` | yes | **yes, merged shallowly, exactly like props** — `Editor.ts:11612-11619`; `TLShapePartial` types it `meta?: Partial<T['meta']>` (`TLShape.ts:177-184`). |
| Defaults | `getDefaultProps()` | `meta: {}` (`TLShape.ts:582`) + `editor.getInitialMetaForShape` spread into every created shape (`Editor.ts:8668-8674`), documented as an override point at `Editor.ts:8414-8431`. |

Meta *can* be validated, but only by hand-building a schema — not via `static props`
(`https://tldraw.dev/docs/shapes`, § Validating meta):

```tsx
const schema = createTLSchema({
  shapes: { ...defaultShapeSchemas, geo: { ...defaultShapeSchemas.geo, meta: { createdBy: T.string } } },
})
```

`SchemaPropsInfo.meta` exists (`createTLSchema.ts:89`) but is only reachable that way. Meta
migrations go through the **general** API (`createMigrationSequence`, `scope: 'record'`), not
`createShapePropsMigrationSequence`.

**Read for this repo.** Today `instanceId`, `scryfallId`, `cardName`
(`apps/tabletop/src/server/cardArrival.ts:171`), the card's `zone`
(`MtgCardImageShapeUtil.tsx:91`), and furniture's `zone`
(`tableFurniture.ts:80, 108`) all live in `meta` — which means **the identity of a card, and
which zone a piece of furniture is, are currently unvalidated and unmigratable.** They sync
fine and update fine; nothing checks them. `meta` is the right home for data you deliberately
don't want versioned and whose backward compatibility you own at read time. Whether "this shape
is a card at all" belongs in that category is precisely the architectural question.

---

## Attachment mechanisms

### Grouping

A group **is a real shape record**: `GroupShapeUtil` with `static type = 'group'`, empty props,
geometry computed as the union of its children —
`node_modules/@tldraw/editor/src/lib/editor/shapes/group/GroupShapeUtil.tsx:11-50`.
Grouping = create a shape + reparent: `groupShapes` (`Editor.ts:8871-8892`) creates the group at
the common bounds' top-left, then `reparentShapes(sortedShapeIds, groupId)`.

Limits:
- **A shape cannot be in two groups** — one `parentId: TLParentId`
  (`node_modules/@tldraw/tlschema/src/shapes/TLBaseShape.ts:72`). Reparenting to self throws
  (`Editor.ts:6452`).
- **Groups auto-dissolve**: `onChildrenChange` deletes at 0 children and reparents-then-deletes
  at 1 (`GroupShapeUtil.tsx:124-140`). **A group of one is impossible** — which rules groups out
  for "a card that might have zero or one counters".
- **Z-order changes.** The group takes the highest index among shapes sharing the common parent
  (`Editor.ts:8869-8878`); children stack above the new parent's last sibling
  (`Editor.ts:6428-6431`) in their previous relative order (`:6435`). Relative order within the
  group survives; interleaving with ungrouped shapes is lost.
- `canBind()` is `false` (`GroupShapeUtil.tsx:20-22`); groups do not clip (no `getClipPath`).
- Clicking a child selects the outermost group unless the group is focused (`Editor.ts:6614-6634`).
- Docs: "Grouping requires at least two shapes." (`https://tldraw.dev/sdk-features/groups`)

**Survives a parent drag: yes**, via parenting (below). `DragAndDropManager.ts:53-62` also
collapses a full-child selection into the group itself.

### Parenting

**Child coordinates are stored relative to the parent.** `getShapeLocalTransform` is
`Identity().translate(x, y).rotate(rotation)`; page transform is
`Mat.Compose(parentPageTransform, localTransform)` — `Editor.ts:5351-5375`.
`reparentShapes` preserves page position by inverting the parent transform (`Editor.ts:6432-6465`).

**Dragging a parent moves children — proof:** `Translating` snapshots only
`editor.getSelectedShapeIds()`
(`node_modules/tldraw/src/lib/tools/SelectTool/childStates/Translating.ts:360-388`) and
`moveShapesToPoint` writes only `{id, type, x, y}` for those entries (`:501-576`). **Descendants
are never touched**; they move because their page transform is derived from the parent's
(`Editor.ts:5361-5375`, cached in `_getShapePageTransformCache`).

**This is the cheapest "rides along" mechanism, and it needs no custom shape at all.**

### Bindings

A binding is **its own record type** (`typeName: 'binding'`), separate from shapes:
`{ id, typeName, type, fromId: TLShapeId, toId: TLShapeId, props, meta }` —
`node_modules/@tldraw/tlschema/src/bindings/TLBaseBinding.ts:54-70`.

**A binding does not move anything by itself.** It is a relationship record plus notification
callbacks. `BindingUtil` declares exactly one abstract member, `getDefaultProps()`
(`node_modules/@tldraw/editor/src/lib/editor/bindings/BindingUtil.ts:148`); every hook is optional
(`:172-277`): `onOperationComplete`, `onBefore/AfterCreate`, `onBefore/AfterChange`,
`onBefore/AfterDelete`, `onAfterChangeFromShape`, `onAfterChangeToShape`,
`onBeforeDeleteFrom/ToShape`, `onBeforeIsolateFrom/ToShape`.

Callbacks fire from the editor's side-effect registration on `shape.afterChange`
(`Editor.ts:612-659`) — note the `reason` field, `'self'` vs `'ancestry'`, with the ancestry pass
walking descendants (`:633-658`). `shape.beforeDelete` fires the delete/isolate callbacks and then
**auto-deletes the bindings** (`Editor.ts:686-712`).

The stock arrow binding
(`node_modules/tldraw/src/lib/bindings/arrow/ArrowBindingUtil.ts`) is instructive: it renders
*from* the binding at draw time and never writes coordinates to the bound shape.
`onAfterChangeFromShape` explicitly skips work when only x/y changed (`:60-76`), because
"translating arrows together with their bound shapes, only x/y changes".
`onBeforeIsolateFromShape` bakes the terminal position in so nothing jumps (`:96-110`).

Registration: **client via `bindingUtils` on `<Tldraw>`** (merged with `defaultBindingUtils` at
`node_modules/tldraw/src/lib/Tldraw.tsx:159, 204-207, 289`; `editor.getBindingUtil` asserts
`No binding util found for type "…"` at `Editor.ts:1387-1391`), **and in the schema** via
`createTLSchemaFromUtils` (`createTLStore.ts:115-135`, pulling `static props`/`static migrations`
from `BindingUtil.ts:133-134`), **and server-side** — `TLSocketRoom` defaults to
`createTLSchema()` with no custom bindings (`TLSocketRoom.ts:246`) and validates every incoming
record (`recordDiff.ts:25-29` → `INVALID_RECORD`). **Same three-place cost as a custom shape.**

`https://tldraw.dev/sdk-features/bindings`:

> "Bindings create persistent relationships between shapes. … Bindings power features like arrows
> that follow shapes, stickers that stick to other shapes, and layout constraints…"
> … "Isolation callbacks handle a specific problem: when an arrow's target shape is deleted, the
> arrow shouldn't suddenly point to empty space."

### Frames

`FrameShapeUtil extends BaseFrameLikeShapeUtil`
(`node_modules/tldraw/src/lib/shapes/frame/FrameShapeUtil.tsx:76-79`); all container behavior is
in `node_modules/@tldraw/editor/src/lib/editor/shapes/BaseFrameLikeShapeUtil.tsx`:

- **Auto-reparent in: yes** — `onDragShapesIn` calls `editor.reparentShapes(draggingShapes, shape.id)`
  and restores original indices for returning children (`:72-110`). Note this is `onDragShapesIn`,
  **during** the drag, not on drop.
- **Auto-reparent out: yes** — `onDragShapesOut` reparents to the page when there's no next target
  (`:112-127`).
- `canReceiveNewChildrenOfType` / `canRemoveChildrenOfType` return `!shape.isLocked` (`:60-66`);
  base defaults are `false` / `true` (`ShapeUtil.ts:557-575`).
- **Clipping: yes** — `getClipPath` returns the shape geometry vertices (`:68-70`); per-child
  opt-out via `shouldClipChild` (`ShapeUtil.ts:428`).
- `providesBackgroundForChildren()` → `true` (`:56`).
- **Dragging a frame moves children: yes**, by the same parent-transform mechanism — no
  frame-specific code.
- `kickoutOccludedShapes` auto-reparents children that end up outside their parent, honoring
  `canRemoveChildrenOfType` as a "pin"
  (`node_modules/@tldraw/editor/src/lib/utils/reparenting.ts:16-58`).
- **Drag targeting**: `getDraggingOverShape` picks the topmost shape at the point whose util
  defines *any* of `onDragShapesOver | onDragShapesIn | onDragShapesOut | onDropShapesOver`
  (`Editor.ts:6571-6599`). **This is the hook zones would need to become active furniture** —
  and it requires a custom ShapeUtil, exactly as ticket 01-zone-entry-events guessed.

v5.0.0 made this opt-in-able: "Add `BaseFrameLikeShapeUtil` abstract class and
`ShapeUtil.isFrameLike()` so custom shapes can opt into frame-like behaviors (paste parenting,
full-brush selection, blocking erasure from inside, clipping children)."
(`https://tldraw.dev/releases/v5.0.0`)

### Which require a custom ShapeUtil

| Mechanism | Custom ShapeUtil needed? | Survives a parent drag? |
|---|---|---|
| Grouping | **No** — works on any shapes | Yes (via parenting) |
| Parenting (`reparentShapes`/`parentId`) | **No** — pure record/transform machinery | **Yes** |
| Bindings | No custom *Shape*Util, but **a custom `BindingUtil`, registered client + schema + server** | Only if your hooks make it — a binding moves nothing on its own |
| Frame containment (participating) | **No** — any stock shape can be dropped into a stock `frame` | Yes |
| A *custom* container / active zone | **Yes** — extend `BaseFrameLikeShapeUtil`, or implement `canReceiveNewChildrenOfType` + `onDragShapesIn`/`onDragShapesOut` | Yes |

**Bearing on the downstream tickets:** a counter or post-it that rides a card wants **parenting**
(free, no custom type, survives drag, but note the frame-style auto-reparent-on-drop is a *frame*
behavior, so a card would need to be frame-like to catch a counter dropped on it). Grouping is
ruled out for a single counter by auto-dissolve-at-one. Bindings are the only mechanism that
survives without a parent-child transform relationship — useful for "cards behind cards" where
you want independent z-order — but they cost a full three-place registration and you write the
movement logic yourself.

---

## Custom shapes and the toolbar

**No UI work is forced. Shape → tool → toolbar icon are three independent opt-ins.**

Source:
- `tools` is optional on `<TldrawEditor>` —
  `node_modules/@tldraw/editor/src/lib/TldrawEditor.tsx:149` (`tools?: readonly TLStateNodeConstructor[]`)
  and `:333` (`tools: rest.tools ?? EMPTY_TOOLS_ARRAY`). The `Editor` loops registering them
  (`Editor.ts:491-493`); `select` and `zoom` are baked into `RootState`.
- `<Tldraw>` merges utils by static `type` and nothing else (`Tldraw.tsx:198-201`).
- The UI's tool list and toolbar contain **zero** references to `shapeUtils`/`getShapeUtil`
  (`node_modules/tldraw/src/lib/ui/hooks/useTools.tsx`,
  `node_modules/tldraw/src/lib/ui/components/Toolbar/DefaultToolbarContent.tsx`).
- Programmatic creation is fully supported: `Editor.createShape` (`Editor.ts:8464-8474`) →
  `createShapes` (`:8490+`), needing only `getDefaultProps` (`:8633`), `styleProps[type]` (`:8637`),
  the schema's `shape` RecordType `.create` (`:8645-8656`), optional `onBeforeCreate` (`:8663`),
  `store.put` (`:8680`). Runtime limits in that path: throws on a non-array (`:8492`), returns
  early if `getIsReadonly()` (`:8494`), silently no-ops past `options.maxShapesPerPage` via
  `alertMaxShapes` (`:8500-8507`).

Docs: the canonical custom-shape example
(`https://tldraw.dev/examples/shapes/tools/custom-shape`) ships **no tool at all** —

```tsx
<Tldraw shapeUtils={customShape}
  onMount={(editor) => { editor.createShape({ type: MY_CUSTOM_SHAPE_TYPE, x: 100, y: 100 }) }} />
```

> "If you want to learn how to add a tool for your shape, check out the custom config example."

Tools are a separate concept (`https://tldraw.dev/docs/tools`: "a **tool** is a top-level state in
our state chart"), and the toolbar is a further opt-in
(`https://tldraw.dev/examples/ui/custom-tool-in-toolbar`: "You can make an icon for your custom
tool appear on tldraw's toolbar. To do this you will need to override the toolbar component…").

**Docs are silent** on an explicit "you do not need a tool" sentence; the evidence is the example
plus the total absence of coupling in source.

**Direct bearing:** cards arrive programmatically from the Shuffler
(`apps/tabletop/src/server/cardArrival.ts`) and furniture is drawn programmatically
(`apps/tabletop/src/server/tableFurniture.ts`). **Neither ever needs a tool or a toolbar entry.**
This cost is zero.

Also worth knowing: `ShapeUtil.configure` customizes *built-in* shapes' options without
subclassing (`https://tldraw.dev/sdk-features/shapes`, e.g.
`NoteShapeUtil.configure({ resizeMode: 'scale' })`), and "Custom shape utils can declare their own
options the same way."

---

## Appendix: v5 breaking changes that invalidate older tutorials

Two changes break essentially every pre-2026 custom-shape tutorial. **Anyone implementing from a
blog post or an older example will get this wrong.**

**(a) `indicator()` → `getIndicatorPath()`, v5.0.0** — `https://tldraw.dev/releases/v5.0.0`:

> "💥 Replace `ShapeUtil.indicator()` (returned JSX) with `ShapeUtil.getIndicatorPath()` (returns
> `Path2D | TLIndicatorPath | undefined`). Indicators now render to the canvas overlay layer
> instead of as React elements. (#8469)"
> … "**Every custom `ShapeUtil` that overrides `indicator` needs to migrate.**"

```tsx
// Before: override indicator(shape) { return <rect width={shape.props.w} height={shape.props.h} /> }
override getIndicatorPath(shape: MyShape): Path2D {
  const path = new Path2D(); path.rect(0, 0, shape.props.w, shape.props.h); return path
}
```

The React slots `ShapeIndicator`, `ShapeIndicators`, `ShapeIndicatorErrorFallback` are removed
from `TLEditorComponents` with no replacement. `indicator` survives as a dead stub returning
`null` (`ShapeUtil.ts:236-247`), documented "new shapes should not implement it".

**(b) `TLBaseShape` → `TLGlobalShapePropsMap` module augmentation, v4.3.0** —
`https://tldraw.dev/releases/v4.3.0` (PR #7091). "A minor breaking change at the type level—your
code will still run, but you'll get TypeScript errors until you migrate."

```ts
const CARD_TYPE = 'card'
declare module 'tldraw' {
  export interface TLGlobalShapePropsMap { [CARD_TYPE]: { w: number; h: number } }
}
type CardShape = TLShape<typeof CARD_TYPE>
```

> "The benefit … is that Editor APIs such as `createShape` now know about your custom shapes
> automatically."
> … "**Shape type names are global.** `TLGlobalShapePropsMap` is a single shared registry, so two
> custom shapes that previously used the same type name in different files now collide."
> … "**Heterogeneous `createShapes`/`updateShapes` arrays may need a cast.**" → cast to
> `TLShapePartial[]` / `TLCreateShapePartial[]`.

Same pattern for bindings (`TLGlobalBindingPropsMap`, `TLBinding<'my-binding'>`).

**(c) Other v5.0.0 items that could touch this repo** (`https://tldraw.dev/releases/v5.0.0`):
`getDefaultColorTheme()` and `DefaultColorThemePalette` removed (use
`editor.getCurrentTheme().colors[colorMode]`); `FONT_FAMILIES`, `FONT_SIZES`, `STROKE_SIZES`,
`TEXT_PROPS` removed; `BindingUtil` hook params changed (`fromShapeType`/`toShapeType` → full
`fromShape`/`toShape` records); overlay CSS variables and class selectors removed (`.tl-brush`,
`.tl-handle*`, `.tl-selection__fg__outline`, `--tl-color-brush-*`) — **check any Tabletop CSS that
targets those**; `cameraOptions`, `textOptions`, `deepLinks` moved from top-level `<Tldraw>` props
into `options` (note `apps/tabletop/src/client/TablePage.tsx:82` passes `deepLinks` as a top-level
prop — *whether that still works in 5.2.5 was not verified*).

---

## Not established

- Whether `loadSnapshotIntoStorage` throws or silently drops on an unvalidatable record.
- Exactly what a *receiving* client does when the server broadcasts a record type its own schema
  doesn't know (it would flow into `Store.put` validation, but the apply path wasn't traced line
  by line).
- Whether overriding `components={{ ImageToolbar: null }}` cleanly removes the crop surface on a
  subclass — the plausible middle path, unverified.
- Whether omitting `static type` produces any diagnostic beyond the `"undefined"` key collision.
- Whether `meta` participates in undo/redo differently from `props`.
- Whether `<Tldraw deepLinks>` as a top-level prop is still supported in 5.2.5 given the v5.0.0
  move of options (`TablePage.tsx:82`) — worth a separate check.
- Docs are silent on whether `props` vs `meta` is preferred for a *domain identifier* specifically.
