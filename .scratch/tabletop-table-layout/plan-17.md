# Plan — Ticket 17: sleeve color travels and renders on the cards

Mountain: tabletop-replaces-mural
Ticket: `.scratch/tabletop-table-layout/issues/17-sleeve-color-travels-and-renders.md`
Design source: `.scratch/tabletop-table-layout/issues/11-sleeve-color-to-card-back.md`

## Context

A player's picked sleeve color (hex string, e.g. `#8b2f5c`) makes their cards
recognizably theirs on the shared board. Sleeve color is a **game constant** — chosen
before the game, never changed mid-game — which is what makes baking it into each
card shape's props at mint time legal.

The `seat.joined.v1` contract schema already carries optional `sleeveColor`
(pattern `^#[0-9a-fA-F]{6}$`) and says `cardBackImageUrl` is omitted when a sleeve
is defined; `sleeveColor` wins if both arrive. Ticket 15 landed that schema.

Ticket 16 (the prep-screen picker UI) is **not yet implemented** — there is no UI to
pick a color. This plan adds the storage seam ticket 16 will write into
(`PersistedGamePrep.sleeveColor?`), plus the full transport and rendering. Until 16
lands, every seat is unsleeved in practice, and the seams are covered by unit tests.

## Shuffler side (`apps/shuffler/`)

1. **Prep state** — `src/port-persist-prep/types.ts`: add optional
   `sleeveColor?: string` to `PersistedGamePrep`, using the documented optional-field
   exception (no version bump), same as `tableName?/playerName?/seatId?`. Thread
   through both persist adapters (Sqlite + InMemory) if they enumerate fields.
2. **Event type** — `src/port-tabletop/types.ts`: add `sleeveColor?: string` to
   `SeatJoinedEvent`; extend `buildSeatJoinedEvent` to take it.
3. **Send seam** — `src/port-tabletop/sendToTable.ts`:
   `sendSeatJoinedBestEffort(..., deckName, sleeveColor?)`. When `sleeveColor` is
   defined, **omit** `cardBackImageUrl` from the event; otherwise send
   `cardBackImageUrl()` as today.
4. **Call sites** — `src/app.ts` (3): `/start-game` and `/restart-game` pass the
   prep/persisted `sleeveColor`; `/yo` passes undefined (no prep flow there).

Tests (jest, `test/port-tabletop/sendToTable.test.ts`):
- sleeve picked → event carries `sleeveColor`, `cardBackImageUrl` is absent
- no sleeve → no `sleeveColor`, `cardBackImageUrl` present (today's behavior)

## Tabletop side (`apps/tabletop/`)

5. **Validation** — `src/server/seatJoined.ts`: accept optional `sleeveColor`,
   validate against `^#[0-9a-fA-F]{6}$`, reject anything else loudly (400), pass it
   into the `ensurePlayerArea` look.
6. **Seat memory** — `src/server/rooms.ts` `PlayerArea` +
   `src/server/tableFurniture.ts` `PlayerAreaLook`: add `sleeveColor?`.
   In `ensurePlayerArea`, when `sleeveColor` is present it **wins** over
   `cardBackImageUrl` (store the color, drop the URL).
7. **Library pile** — `src/server/tableFurniture.ts`: when the seat has a
   `sleeveColor`, the library pile renders as a solid sleeve-colored rounded rect
   inset by the same `LIBRARY_IMAGE_INSET = 12` the image uses today (the inset
   frames the zone border and "Library" label), radius `insetW * 0.05`, flat, no
   border. Mechanism: add `sleeveColor: string | null` prop to the `mtg-zone`
   shape, rendered by `MtgZoneShapeUtil` as an inner solid rect (owner-preferred:
   sidesteps the opaque-image-hides-zone-interior tldraw limit; armed box-shadow
   ring still spreads correctly). Unsleeved seats keep today's image-or-plain-box
   behavior.
8. **Card mint** — `src/server/cardArrival.ts`: bake
   `sleeveColor: playerArea.sleeveColor ?? null` into the minted `mtg-card` props.
9. **Shape props** — `src/shared/mtgCardShape.ts`: add
   `sleeveColor: string | null` (`T.string.nullable()`) to `MtgCardShapeProps` +
   validator + default (null).
10. **Rendering** — `src/client/shapes/MtgCardShapeUtil.tsx` `component()`.
    `face` and `faceDown` are **independent axes** (two-faced-cards owner, binding):
    `face` picks the printed side, `faceDown` is concealment. Never collapse them.
    - **Sleeved, not faceDown** (either face): sleeve-colored rounded rect fills
      the shape (`background: sleeveColor`, `borderRadius: w * 0.05`,
      `padding: w * 0.03`); the face image (front or printed back per `face`)
      centered inside, keeping its own rendering — no second radius on the image.
      Proportional to `w`, never fixed px (cards are aspect-locked resizable).
    - **Sleeved and faceDown**: solid sleeve-colored rounded rect, no image. Flat
      color — no border, no sheen (chunky-3D retired fleet-wide).
    - **Unsleeved** (`sleeveColor === null`): exactly today's rendering, untouched.
      `faceDown` on an unsleeved seat should eventually show the standard Magic
      back, but nothing sets `faceDown` yet (ticket 06 of tabletop-physics owns the
      gesture) — the renderer must not assume faceDown ⇒ sleeve exists; unsleeved
      faceDown falls through to today's image path for now.
    - Do NOT restyle the selection `indicator()` (explicitly reserved decision).
    - Concealment is depicted, never enforced: identity and both URLs stay in props.

Tests (vitest):
- `test/seatJoined.test.ts`: sleeveColor accepted and stored; bad hex rejected;
  both sleeveColor+cardBackImageUrl → sleeve wins (library pile is solid color,
  no image shape); sleeved seat's library pile has the solid-color zone prop.
- `test/cardArrival.test.ts`: card minted at a sleeved seat carries
  `sleeveColor` in props; unsleeved seat mints `sleeveColor: null`.

## Out of scope

- The picker UI (ticket 16).
- `card.played` contract changes (sleeve is seat data — none needed).
- Redeploy fragility (seat memory wiped → sleeveless cards) — accepted, same as
  playmat and deck name.

## Owner decisions incorporated (context consults, 2026-08-08)

- **shuffler-looks-like-itself**: radius `w * 0.05`, margin `w * 0.03` per side,
  proportional to `w` (never fixed px); flat solid, no border/sheen; raw
  player-picked hex is exempt from the no-raw-hex rule (domain data, not chrome),
  but any auxiliary color I add around it is chrome and must be tokenized;
  library-pile inner rect keeps LIBRARY_IMAGE_INSET geometry, radius insetW*0.05;
  don't establish a default sleeve color; don't touch indicator().
- **two-faced-cards**: face/faceDown are independent axes (binding); `face:"back"`
  is a printed face image inside the sleeve frame; only `faceDown` renders the
  solid rect; nothing sets faceDown yet (tabletop-physics ticket 06 owns the
  gesture); `T.string.nullable()` default null mirroring backImageUrl, no
  migrations (rooms in-memory); set explicitly at mint in cardArrival.ts; never
  smuggle sleeve into backImageUrl; also update the "until sleeve selection
  exists" comment on cardBackImageUrl() in shuffler types.ts (fleet ticket, in
  scope).
