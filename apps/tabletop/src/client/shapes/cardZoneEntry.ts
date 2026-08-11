import { Editor, TLShape, TLShapePartial } from "tldraw";
import { MtgCardShape } from "../../shared/mtgCardShape";
import { findOpenSpotsNearZoneEdge, Rect } from "./openSpotNearZoneEdge";
import { topmostZoneAt, ZoneHit } from "./zoneHitTest";
import { PASSENGER_TYPES } from "./cardPassengers";

// Ticket 01 (organizational split): the zone-entry hook's body plus its two
// private helpers, pulled out of MtgCardShapeUtil.tsx verbatim, `this.editor`
// passed explicitly as `editor` instead. Still tldraw-dependent (Editor,
// getShapePageBounds/reparentShapes/animateShapes below) — see the ticket
// for why no tldraw-free boundary exists cleanly here.

// Ticket 18: counters detach the instant their host card leaves the
// battlefield — one rule, no per-zone special-casing. Battlefield = the
// playmat, the command zone, the bare table (no zone at all) — and the
// Stack, deliberately: cards ARRIVE on the Stack, so their first settled
// move fires a zone-entry for it, and evicting counters for a nudge around
// the Stack would strip every counter the moment one was attached there.
// The detach set is exactly the ticket's list minus "hand", which doesn't
// exist as a zone here yet.
const NON_BATTLEFIELD_ZONES = new Set(["graveyard", "exile", "library"]);

// Ticket 01-zone-entry-events: name "this card instance entered this
// zone" as a distinct occurrence, once per real zone change — not once
// per drag frame, and not re-fired for staying in (or returning to) the
// same zone.
//
// `onTranslateEnd` (fired once, on the *moved* card, when a drag settles)
// rather than `onDragShapesOver`/`onDropShapesOver` (fired on the
// *target*, every frame while dragging): zones are `mtg-zone` shapes
// (ticket 13) but always `isLocked: true`, and `Editor.getDraggingOverShape`
// filters out locked shapes before checking for target-side hooks at all —
// so a target-side hook on the zone could never fire regardless of whether
// `MtgZoneShapeUtil` defined one.
//
// Debounce state rides on the card's `meta.zone` — the last zone this card
// was known to be in — so re-entering a zone it already left still counts
// as a fresh entry, but staying put (or a tiny in-zone nudge) doesn't. Zone
// membership deliberately stays out of `props`: see MtgCardShapeProps.
export function handleTranslateEnd(editor: Editor, current: MtgCardShape): TLShapePartial<MtgCardShape> | undefined {
  const zoneHit = zoneAt(editor, current);
  const zone = zoneHit?.zone;
  const previousZone = (current.meta?.zone as string | undefined) ?? undefined;
  if (zone === previousZone) return undefined;

  if (zoneHit) {
    // Descoped 2026-08-06 (Jess), superseded by ticket 21: this hook only
    // computes the zone change and returns it in `meta.zone` below;
    // usePhysicsAnnouncements.ts's centralized store.listen() is what
    // announces it (`card.zoneMoved`, via Honeycomb, never console.log).

    // Ticket 18 (counters), extended by ticket 19 (notes): the card just
    // left the battlefield — its passengers don't follow it into the
    // graveyard/exile/library. They detach and scoot to an open spot near
    // the zone's edge, staying on the table. This has to be driven from
    // here: a parented shape's own onTranslateEnd never fires when only
    // its parent moves.
    if (NON_BATTLEFIELD_ZONES.has(zoneHit.zone)) {
      evictPassengers(editor, current, zoneHit);
    }
  }

  // Ticket 17: a card entering the library resets both face axes — mirrors
  // the Shuffler's own mulligan() reset. Folded into this same returned
  // partial (one write, one undo entry) rather than a second updateShapes
  // call. There's no "hand" zone yet (see NON_BATTLEFIELD_ZONES above), so
  // this only fires for library today.
  const resetFace = zoneHit?.zone === "library" && (current.props.face !== "front" || current.props.faceDown);

  return {
    id: current.id,
    type: current.type,
    ...(resetFace ? { props: { ...current.props, face: "front" as const, faceDown: false } } : {}),
    meta: { ...current.meta, zone: zone ?? null },
  };
}

/**
 * Which zone (if any) the shape's center currently rests in. Matches real
 * `mtg-zone` shapes (tabletop-physics ticket 13) rather than a bare
 * `meta.zone` string tag — a locked shape can never be a drag target
 * (`Editor.getDraggingOverShape` filters `!isLocked` first), so this stays
 * a card-side scan rather than a zone-side `onDragShapesOver` hook. When
 * the card's center overlaps more than one zone, the topmost-drawn zone
 * wins — see `topmostZoneAt` (shared with the zone's own armed-state
 * check, tabletop-physics ticket 14).
 */
function zoneAt(editor: Editor, shape: MtgCardShape): ZoneHit | undefined {
  const bounds = editor.getShapePageBounds(shape);
  return bounds ? topmostZoneAt(editor, bounds.center) : undefined;
}

// Ticket 18 (counters), extended by ticket 19 (notes): detach every
// passenger riding this card and land each at an open spot near the
// destination zone's edge — outside the zone, on the table. "Occupied"
// considers only the small movable stuff (cards and passengers); furniture
// is fair ground to sit on, same as real cardboard.
function evictPassengers(editor: Editor, card: MtgCardShape, zoneHit: ZoneHit): void {
  const passengers = editor
    .getSortedChildIdsForParent(card.id)
    .map((id) => editor.getShape(id))
    .filter((s): s is TLShape => !!s && PASSENGER_TYPES.has(s.type));
  if (passengers.length === 0) return;

  const zoneBounds = editor.getShapePageBounds(zoneHit.id);
  const cardBounds = editor.getShapePageBounds(card);
  if (!zoneBounds || !cardBounds) return;

  const passengerIds = new Set(passengers.map((p) => p.id));
  const occupied: Rect[] = [];
  for (const shape of editor.getCurrentPageShapes()) {
    if (shape.type !== "mtg-card" && !PASSENGER_TYPES.has(shape.type)) continue;
    if (passengerIds.has(shape.id)) continue;
    const bounds = editor.getShapePageBounds(shape);
    if (bounds) occupied.push({ x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h });
  }

  // A note's own geometry (its size style + growY) stands in for a
  // counter's fixed props.w — spotSize just needs a plausible passenger
  // footprint to avoid collisions, not a per-passenger exact fit.
  const spotSize = editor.getShapeGeometry(passengers[0]).bounds.w;
  const spots = findOpenSpotsNearZoneEdge({
    zone: { x: zoneBounds.x, y: zoneBounds.y, w: zoneBounds.w, h: zoneBounds.h },
    entry: { x: cardBounds.center.x, y: cardBounds.center.y },
    spotSize,
    occupied,
    count: passengers.length,
  });

  editor.reparentShapes(
    passengers.map((p) => p.id),
    editor.getCurrentPageId(),
  );
  editor.animateShapes(
    passengers.map((p, i) => ({ id: p.id, type: p.type, x: spots[i].x, y: spots[i].y, rotation: 0 })),
    { animation: { duration: 200 } },
  );
}
