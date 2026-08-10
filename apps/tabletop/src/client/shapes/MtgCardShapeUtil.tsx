import { useLayoutEffect, useRef } from "react";
import { BaseBoxShapeUtil, HTMLContainer, TLDragShapesOutInfo, TLShape, TLShapeId, TLShapePartial } from "tldraw";
import type { CSSProperties } from "react";
import { MtgCardShape, mtgCardShapeProps } from "../../shared/mtgCardShape";
import { findOpenSpotsNearZoneEdge, Rect } from "./openSpotNearZoneEdge";
import { topmostZoneAt, ZoneHit } from "./zoneHitTest";
import { rotateHoldingCenter, tapPartial, tapPartialsForCards } from "./cardTap";

// Ticket 18: counters detach the instant their host card leaves the
// battlefield — one rule, no per-zone special-casing. Battlefield = the
// playmat, the command zone, the bare table (no zone at all) — and the
// Stack, deliberately: cards ARRIVE on the Stack, so their first settled
// move fires a zone-entry for it, and evicting counters for a nudge around
// the Stack would strip every counter the moment one was attached there.
// The detach set is exactly the ticket's list minus "hand", which doesn't
// exist as a zone here yet.
const NON_BATTLEFIELD_ZONES = new Set(["graveyard", "exile", "library"]);

// Ticket 19: notes ride along exactly like counters — same accept-list, same
// battlefield-exit eviction. "Passenger" is anything a card hosts by
// parenting; not the card's own props, per ticket 02's "the card carries
// nothing about its passengers." Cards are deliberately NOT in this set —
// see the "cards tuck via a meta link, not parenting" comment below for why.
const PASSENGER_TYPES = new Set(["mtg-counter", "note"]);

// Ticket 20 (corrected 2026-08-10 after Jess's live bug report): a card
// cannot be a real tldraw child of another card, full stop. tldraw's
// renderer does one global depth-first traversal
// (Editor.getUnorderedRenderingShapes) that assigns every descendant a
// higher z-index than its own ancestor, unconditionally (verified against
// tldraw source) — a child can NEVER paint behind its own parent, no matter
// what "send to back" does. And tldraw's reorder actions
// (getReorderingShapesChanges) only reorder shapes against their SIBLINGS
// (same parentId) — reordering a lone child against its own parent is a
// silent no-op, which is exactly the bug Jess hit: "send to back" on a
// tucked card had no chance of working while it was a real child.
//
// So a tucked card stays an ordinary top-level page shape, linked to its
// tuck partner by a plain `meta.tuckedWith: ShapeId | null` pointer (written
// on both sides) instead of `parentId`. That makes tldraw's stock "Send to
// back"/"Bring to front" (ReorderMenuSubmenu) genuinely reorder the two
// cards against each other, because they really are ordinary siblings now.
//
// "Host" (which of the two carries the other when dragged, and whose
// zone-exit detaches the other) is no longer a fixed role assigned at
// attach time — it's computed LIVE from current z-order, matching Jess's
// correction: "whichever card is on top should be the parent." Drag-carry
// therefore can't be free page-transform composition anymore (that
// composition is exactly the mechanism that trapped the passenger in front
// forever) — it's implemented by hand in onTranslateEnd. Tapping a card
// never needs to compensate anything now: with no real parenting, a tap on
// one card cannot affect the other's rotation at all.
const TUCK_KEY = "tuckedWith";

/**
 * JES-144, tabletop-physics ticket 12: `mtg-card`, a genuine custom shape
 * (see MtgCardShapeProps) rather than a stock `image` shape borrowed for
 * cards, furniture, and stray drops alike. Tap state lives in `props.tapped`
 * — never read back out of rotation — so free rotation and tap compose
 * independently instead of one clobbering the other's read of "is this
 * tapped".
 */
export class MtgCardShapeUtil extends BaseBoxShapeUtil<MtgCardShape> {
  static override type = "mtg-card" as const;
  static override props = mtgCardShapeProps;

  override getDefaultProps(): MtgCardShape["props"] {
    return {
      w: 170,
      h: 238,
      instanceId: "",
      scryfallId: "",
      cardName: "",
      frontImageUrl: "",
      backImageUrl: null,
      face: "front",
      faceDown: false,
      tapped: false,
      sleeveColor: null,
      cardBackImageUrl: null,
      owner: "",
      isCommander: false,
    };
  }

  override isAspectRatioLocked(): boolean {
    return true;
  }

  component(shape: MtgCardShape) {
    const { frontImageUrl, backImageUrl, face, cardName, faceDown, sleeveColor, cardBackImageUrl, w } = shape.props;
    // `face` and `faceDown` are independent axes (two-faced-cards owner):
    // face picks which PRINTED side shows — a DFC's back is a normal face
    // image — while faceDown is concealment. Only faceDown hides the image.
    const src = (face === "back" ? backImageUrl : frontImageUrl) ?? frontImageUrl;
    // Sleeve geometry is a proportion of the shape's own width — cards are
    // aspect-locked resizable, so a fixed px would drift out of proportion.
    // Square corners: sleeves are rectangular (Jess, 2026-08-09). w * 0.03
    // mirrors a real sleeve's ~1-2mm overhang. Flat solid color, no border
    // or sheen.
    const sleeve: CSSProperties | undefined = sleeveColor
      ? { width: "100%", height: "100%", background: sleeveColor, boxSizing: "border-box" }
      : undefined;

    // Ticket 15: tap reads as a quick rotation, not a snap. onClick writes
    // the new rotation in one synced record update, which tldraw renders
    // instantly; the motion is a local catch-up — counter-rotate the content
    // by the just-applied delta and ease it back to 0. Keyed off
    // `props.tapped` changing, never off a rotation delta, so free-rotating
    // through 90° can't fire it — and remote peers animate identically for
    // free when the prop syncs in. The ref starts at the first-seen value so
    // a card arriving already-tapped doesn't swing on mount or reconnect.
    //
    // 0.5s ease-out matches the Shuffler's card-motion timing (game.css
    // slides), deliberately snappier than its 0.8s flip.
    const containerRef = useRef<HTMLDivElement>(null);
    const prevTappedRef = useRef(shape.props.tapped);
    const tapped = shape.props.tapped;
    useLayoutEffect(() => {
      if (prevTappedRef.current === tapped) return;
      prevTappedRef.current = tapped;
      const el = containerRef.current;
      if (!el) return;
      // A re-tap mid-swing would stack a second catch-up on the first;
      // cancel so the worst case is one clean jump. (Smooth reversal on a
      // fast double-tap is an accepted gap — WAAPI starts from the fixed
      // keyframe, not the current rendered angle.)
      el.getAnimations().forEach((a) => a.cancel());
      // The default transform-origin (this div's center) is load-bearing:
      // onClick holds the card's CENTER fixed across the rotation write, so
      // frame 0 here is pixel-identical to the pre-tap render only if the
      // counter-rotation pivots on that same center.
      el.animate([{ transform: `rotate(${tapped ? -90 : 90}deg)` }, { transform: "rotate(0deg)" }], {
        duration: 500,
        easing: "ease-out",
      });
    }, [tapped]);

    return (
      <HTMLContainer id={shape.id}>
        {/* tl-html-container is `pointer-events: none` by default (tldraw.css)
            so hover/click reach whatever's behind it; tldraw's own image/video
            shapes re-enable hit-testing via .tl-image-container's `pointer-
            events: all` — reusing that class here rather than reinventing it. */}
        <div className="tl-image-container" ref={containerRef}>
          {sleeve && faceDown ? (
            // Concealed in a sleeve: the bare sleeve rectangle. Identity and
            // both URLs stay in props — concealment is depicted, not enforced.
            <div style={sleeve} />
          ) : sleeve ? (
            // Face image centered in the sleeve, a ring of color on every
            // side — the IRL sleeve-border look. Not `className="tl-image"`:
            // that rule is `position: absolute; inset: 0`, which anchors to
            // .tl-image-container and escapes this div's padding entirely.
            // The IMAGE keeps rounded corners — the printed card inside the
            // sleeve is still a rounded card (Jess, 2026-08-09); only the
            // sleeve itself is square. w * 0.05 is the Shuffler card's own
            // corner ratio (10/200).
            <div style={{ ...sleeve, padding: w * 0.03 }}>
              <img style={{ display: "block", width: "100%", height: "100%", borderRadius: w * 0.05 }} src={src} alt={cardName} draggable={false} />
            </div>
          ) : faceDown ? (
            // Unsleeved and concealed: the table's generic Magic card back, a
            // plain image swap (ticket 06 decision 3 — no border/dim/badge).
            // cardBackImageUrl is null only for shapes minted before this
            // prop existed; fall back to a flat rectangle rather than leaking
            // the face underneath.
            cardBackImageUrl ? (
              <img className="tl-image" style={{ borderRadius: w * 0.05 }} src={cardBackImageUrl} alt="face-down card" draggable={false} />
            ) : (
              <div style={{ width: "100%", height: "100%", background: "#3a3a3a", borderRadius: w * 0.05 }} />
            )
          ) : (
            // Unsleeved, face-up: a real card keeps its rounded corners —
            // only a sleeve (above) is square (Jess, 2026-08-09).
            <img className="tl-image" style={{ borderRadius: w * 0.05 }} src={src} alt={cardName} draggable={false} />
          )}
        </div>
      </HTMLContainer>
    );
  }

  override getIndicatorPath(shape: MtgCardShape) {
    const path = new Path2D();
    path.rect(0, 0, shape.props.w, shape.props.h);
    return path;
  }

  // Ticket 20 (corrected 2026-08-10): carryTuckedPartner needs to know
  // whether a tucked card's own partner is ALSO being dragged in the same
  // multi-select gesture, to avoid double-moving it. tldraw calls
  // onTranslateEnd once per moving shape in one synchronous loop
  // (Translating.ts), and each call's own `setSelectedShapes([])` mutates
  // the SHARED live selection — so a naive `getSelectedShapeIds()` read
  // inside onTranslateEnd sees an already-emptied selection for whichever
  // shape in the batch is processed second. onTranslateStart fires for
  // every moving shape too, but BEFORE any of them has cleared anything, so
  // capturing it there (once per gesture, on this shared ShapeUtil
  // instance — safe, since tldraw doesn't run two translate gestures at
  // once) gives every shape's onTranslateEnd the same, correct, still-full
  // selection to check against.
  private gestureSelection: TLShapeId[] = [];

  override onTranslateStart(_shape: MtgCardShape): TLShapePartial<MtgCardShape> | undefined {
    this.gestureSelection = this.editor.getSelectedShapeIds();
    return undefined;
  }

  // JES-144: tap/untap a card by clicking it — a toggle, not a 4-way
  // rotation cycle, so a second click always taps it back. `props.tapped` is
  // the source of truth; rotation is purely visual and additive on top of it,
  // applied as a delta so it composes with whatever free rotation left the
  // card at, instead of snapping to an absolute angle.
  //
  // Ticket 16 (multi-untap): if the clicked card is part of the current
  // selection (marquee), its NEW tapped state propagates to every other
  // selected mtg-card — a state push, not a per-card toggle, so a mixed
  // selection converges. The clicked card's own change must still be
  // RETURNED synchronously: when onClick returns a change,
  // PointingShape.onPointerUp early-returns and the multi-selection
  // survives the click (returning undefined falls through to selection
  // logic that collapses it to the clicked card).
  override onClick(shape: MtgCardShape): TLShapePartial<MtgCardShape> | undefined {
    const tapped = !shape.props.tapped;

    const selectedIds = this.editor.getSelectedShapeIds();
    const otherIds = selectedIds.includes(shape.id) ? selectedIds.filter((id) => id !== shape.id) : [];
    if (otherIds.length > 0) {
      // Deferred via queueMicrotask — undocumented-tldraw-ordering alert:
      // PointingShape.onPointerUp calls markHistoryStoppingPoint() and then
      // updateShapes([change]) AFTER onClick returns, so a synchronous write
      // here would land BEFORE the mark, fusing into the previous undo entry.
      // The microtask runs after the whole pointer-up handler — after the
      // mark — so the propagated writes coalesce into the same new undo
      // entry as the clicked card's own change, and one Ctrl+Z reverts the
      // whole gesture. Guarded by verify-multi-untap.spec.ts, which is the
      // tripwire for a tldraw upgrade reordering this. Never "upgrade" this
      // to setTimeout: a macrotask could interleave with other input events.
      queueMicrotask(() => {
        // Re-fetch fresh: the clicked card's update (and possibly remote
        // changes) applied between onClick and this microtask. A marquee can
        // also catch counters and other shapes — cards only.
        const otherCards = otherIds
          .map((id) => this.editor.getShape(id))
          .filter((s): s is MtgCardShape => !!s && s.type === "mtg-card");
        const partials = tapPartialsForCards(otherCards, tapped);
        if (partials.length > 0) this.editor.updateShapes(partials);
      });
    }

    return tapPartial(shape, tapped);
  }

  // Ticket 18 (counters): the card hosts counters via tldraw's native
  // drag-and-drop parenting — a deliberate, narrow exception to "the card
  // carries nothing about its passengers": the card's util MEDIATES the drop,
  // but the resulting parent relationship (the counter's parentId, not any
  // list on the card's props) is what carries the state. Defining any of
  // these hooks makes every card a drag target for every unlocked dragged
  // shape (getDraggingOverShape checks only that hooks exist), so both `can*`
  // gates are type-narrowed — without the canRemoveChildrenOfType gate
  // (default: true for ALL types), dragging card A across card B would fire
  // B.onDragShapesOut(B, [cardA]).
  //
  // "mtg-card" is receivable too (ticket 20) — but ONLY for the free hover
  // hinting during a drag; onDragShapesIn below never reparents a card, only
  // counters/notes. See the TUCK_KEY comment above for why.
  override canReceiveNewChildrenOfType(shape: MtgCardShape, type: TLShape["type"]): boolean {
    return !shape.isLocked && (PASSENGER_TYPES.has(type) || type === "mtg-card");
  }

  override canRemoveChildrenOfType(_shape: MtgCardShape, type: TLShape["type"]): boolean {
    return PASSENGER_TYPES.has(type);
  }

  // Live reparent during the drag (the frame pattern) — DragAndDropManager
  // has already filtered `shapes` through canReceiveNewChildrenOfType, and it
  // hints this card (the hover-highlight) whenever any shape is receivable.
  override onDragShapesIn(card: MtgCardShape, shapes: TLShape[]): void {
    const realChildren = shapes.filter((s) => PASSENGER_TYPES.has(s.type));
    if (realChildren.length > 0 && !realChildren.some((s) => this.editor.hasAncestor(card, s.id))) {
      this.editor.reparentShapes(realChildren, card.id);

      // reparentShapes preserves page rotation, so a passenger dropped on an
      // already-tapped card would keep a compensating local rotation forever —
      // visibly tilted after the card untaps. Counters/notes are card-aligned:
      // zero the local rotation, holding the passenger's center fixed (same
      // math as onClick's tap pivot).
      for (const dropped of realChildren) {
        this.zeroRotationHoldingCenter(dropped.id);
      }
    }

    // Ticket 20: a card dropped onto another card tucks via a meta link, not
    // real parenting (TUCK_KEY comment above). Lands wherever dropped, on
    // top by default — there's no "tuck under by default" rule (no
    // card-type prop to decide a default with); getting it to read as
    // tucked-under is the explicit reorder command.
    for (const dropped of shapes) {
      if (dropped.type !== "mtg-card" || dropped.id === card.id) continue;
      this.tuckCard(dropped as MtgCardShape, card);
      this.editor.bringToFront([dropped.id]);
    }
  }

  // Link two cards as tuck partners, breaking whichever prior link either
  // side had — pairwise only, one partner at a time. onDragShapesIn is the
  // "frame pattern": it can fire every hover frame while a card lingers over
  // a potential host, not just on drop — one batched updateShapes rather
  // than up to three separate ones keeps repeated hovers over an
  // already-tucked pair cheap (and a no-op once linked).
  private tuckCard(passenger: MtgCardShape, host: MtgCardShape): void {
    if ((passenger.meta?.[TUCK_KEY] as TLShapeId | undefined) === host.id) return;

    const partials: TLShapePartial<MtgCardShape>[] = [
      ...this.untuckPartials(passenger),
      ...this.untuckPartials(host),
      { id: passenger.id, type: "mtg-card", meta: { ...passenger.meta, [TUCK_KEY]: host.id } },
      { id: host.id, type: "mtg-card", meta: { ...host.meta, [TUCK_KEY]: passenger.id } },
    ];
    this.editor.updateShapes(partials);
  }

  // Clear a card's tuck link on both sides, if it has one, in one write.
  private untuck(card: MtgCardShape): void {
    const partials = this.untuckPartials(card);
    if (partials.length > 0) this.editor.updateShapes(partials);
  }

  // Partials that clear `card`'s tuck link and its partner's reverse link —
  // pure data, no write, so tuckCard can fold this into its own single
  // updateShapes call instead of issuing a separate transaction per side.
  private untuckPartials(card: MtgCardShape): TLShapePartial<MtgCardShape>[] {
    const partnerId = card.meta?.[TUCK_KEY] as TLShapeId | undefined;
    if (!partnerId) return [];
    const partner = this.editor.getShape(partnerId);
    const partials: TLShapePartial<MtgCardShape>[] = [{ id: card.id, type: "mtg-card", meta: { ...card.meta, [TUCK_KEY]: null } }];
    if (partner && partner.type === "mtg-card") {
      partials.push({ id: partner.id, type: "mtg-card", meta: { ...partner.meta, [TUCK_KEY]: null } });
    }
    return partials;
  }

  // Dragged off the card and not into another receiver: detached, staying
  // wherever it's dropped. Only the dragged shapes that are currently THIS
  // card's real children (counters/notes) — a multi-shape drag containing
  // someone else's counter must not touch it, and this card's other
  // counters stay put. A tucked CARD is never a real child, so it's never
  // in `mine` here — its own detach-by-distance lives in onTranslateEnd.
  override onDragShapesOut(card: MtgCardShape, shapes: TLShape[], info: TLDragShapesOutInfo): void {
    if (info.nextDraggingOverShapeId) return;
    const mine = shapes.filter((s) => s.parentId === card.id);
    if (mine.length === 0) return;
    this.editor.reparentShapes(mine, this.editor.getCurrentPageId());
  }

  // Zero a shape's local rotation, holding its own center fixed on the page
  // (rotation pivots around a shape's top-left, not its center — zeroing it
  // alone would swing the shape sideways). Geometry bounds, not `props.w/h`:
  // a note has no w/h prop (its size comes from a style enum plus `growY`),
  // but every shape's geometry does.
  private zeroRotationHoldingCenter(id: TLShape["id"]): void {
    const fresh = this.editor.getShape(id);
    if (!fresh || fresh.rotation === 0) return;
    const { w, h } = this.editor.getShapeGeometry(fresh).bounds;
    const pose = rotateHoldingCenter(fresh, { x: w / 2, y: h / 2 }, 0);
    this.editor.updateShape({ id: fresh.id, type: fresh.type, x: pose.x, y: pose.y, rotation: 0 });
  }

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
  override onTranslateEnd(initial: MtgCardShape, current: MtgCardShape): TLShapePartial<MtgCardShape> | undefined {
    // tldraw bug workaround: because this ShapeUtil defines `onClick`,
    // tldraw's SelectTool defers selecting the pointed-at shape until
    // pointer-up (PointingShape.onEnter in node_modules/tldraw/src/lib/tools/
    // SelectTool/childStates/PointingShape.ts skips select-on-enter whenever
    // `getShapeUtil(shape).onClick` is truthy). If the drag threshold is
    // crossed before pointer-up, `startTranslating` only forces a reselect
    // of the actually-hit shape when NOTHING is currently selected:
    //   if (!this.didSelectOnEnter && !this.editor.getSelectedShapeIds().length)
    // Since tldraw leaves the just-dragged card selected after a drag ends,
    // that guard is false on the next drag — so dragging a second,
    // still-selected-from-before card silently re-translates the FIRST
    // (still-selected) card instead of the one under the pointer. Clearing
    // selection here — on every drag settle, not just on a zone change —
    // makes the next drag's guard see an empty selection and correctly pick
    // up whichever card the pointer actually lands on.
    this.editor.setSelectedShapes([]);

    const zoneHit = this.zoneAt(current);

    // Ticket 20: drag-carry for a tucked card is no longer free page-
    // transform composition (that's the mechanism that trapped a passenger
    // in front of its host forever — see TUCK_KEY comment). Runs on every
    // settle, not gated on a zone change, since sliding a card around
    // WITHIN the same zone must still carry its tucked partner. Uses
    // `gestureSelection` (captured in onTranslateStart, before any card's
    // own clear-on-settle could mutate it), not a live read here — see that
    // field's comment.
    this.carryTuckedPartner(initial, current, zoneHit);

    const zone = zoneHit?.zone;
    const previousZone = (current.meta?.zone as string | undefined) ?? undefined;
    if (zone === previousZone) return undefined;

    if (zoneHit) {
      // Descoped 2026-08-06 (Jess): no callback/emitter/queue yet — nothing
      // downstream consumes this. A plain console.log is the whole
      // notification surface for now, proving the detection logic; wiring
      // a real consumer is later tickets' job (tabletop-survives-restart).
      console.log(`zone-entry ${current.props.instanceId} ${zoneHit.zone}`);

      // Ticket 18 (counters), extended by ticket 19 (notes): the card just
      // left the battlefield — its passengers don't follow it into the
      // graveyard/exile/library. They detach and scoot to an open spot near
      // the zone's edge, staying on the table. This has to be driven from
      // here: a parented shape's own onTranslateEnd never fires when only
      // its parent moves.
      if (NON_BATTLEFIELD_ZONES.has(zoneHit.zone)) {
        this.evictPassengers(current, zoneHit);
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
  private zoneAt(shape: MtgCardShape): ZoneHit | undefined {
    const bounds = this.editor.getShapePageBounds(shape);
    return bounds ? topmostZoneAt(this.editor, bounds.center) : undefined;
  }

  // Ticket 20 (corrected 2026-08-10): "host" (whoever's drag carries the
  // other) is whichever of a tucked pair is CURRENTLY on top — Jess's
  // correction, "whichever card is on top should be the parent" — not a
  // fixed role assigned at attach time. Index doesn't change from a plain
  // translate, only from an explicit reorder action or at creation, so
  // `current.index` here reliably reflects whatever the player last chose
  // via "Send to back"/"Bring to front".
  private carryTuckedPartner(initial: MtgCardShape, current: MtgCardShape, zoneHit: ZoneHit | undefined): void {
    const partnerId = current.meta?.[TUCK_KEY] as TLShapeId | undefined;
    if (!partnerId) return;
    const partner = this.editor.getShape(partnerId);
    if (!partner || partner.type !== "mtg-card") return;

    // Both cards of the pair were dragged together in one multi-select
    // gesture — tldraw's own per-shape translation already moved the
    // partner correctly; propagating this delta too would double it.
    if (this.gestureSelection.includes(partner.id)) return;

    const iAmOnTop = current.index > partner.index;
    if (!iAmOnTop) {
      // I'm the passenger, dragged on my own (not carried) — a small
      // in-place nudge that still overlaps my host keeps the link; moving
      // far enough to stop overlapping detaches (ticket 20: "dragging a
      // passenger directly does not auto-detach it" — only true up to
      // this point).
      const myBounds = this.editor.getShapePageBounds(current);
      const hostBounds = this.editor.getShapePageBounds(partner);
      if (myBounds && hostBounds && !myBounds.collides(hostBounds)) {
        this.untuck(current);
      }
      return;
    }

    // I'm the host. Leaving the battlefield detaches my passenger, which
    // stays behind, unattached, exactly where it was — it was never carried
    // there in the first place, since carry only happens below this check.
    if (zoneHit && NON_BATTLEFIELD_ZONES.has(zoneHit.zone)) {
      this.untuck(current);
      return;
    }

    const dx = current.x - initial.x;
    const dy = current.y - initial.y;
    if (dx === 0 && dy === 0) return;
    this.editor.updateShape({ id: partner.id, type: "mtg-card", x: partner.x + dx, y: partner.y + dy });
  }

  // Ticket 18 (counters), extended by ticket 19 (notes): detach every
  // passenger riding this card and land each at an open spot near the
  // destination zone's edge — outside the zone, on the table. "Occupied"
  // considers only the small movable stuff (cards and passengers); furniture
  // is fair ground to sit on, same as real cardboard.
  private evictPassengers(card: MtgCardShape, zoneHit: ZoneHit): void {
    const passengers = this.editor
      .getSortedChildIdsForParent(card.id)
      .map((id) => this.editor.getShape(id))
      .filter((s): s is TLShape => !!s && PASSENGER_TYPES.has(s.type));
    if (passengers.length === 0) return;

    const zoneBounds = this.editor.getShapePageBounds(zoneHit.id);
    const cardBounds = this.editor.getShapePageBounds(card);
    if (!zoneBounds || !cardBounds) return;

    const passengerIds = new Set(passengers.map((p) => p.id));
    const occupied: Rect[] = [];
    for (const shape of this.editor.getCurrentPageShapes()) {
      if (shape.type !== "mtg-card" && !PASSENGER_TYPES.has(shape.type)) continue;
      if (passengerIds.has(shape.id)) continue;
      const bounds = this.editor.getShapePageBounds(shape);
      if (bounds) occupied.push({ x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h });
    }

    // A note's own geometry (its size style + growY) stands in for a
    // counter's fixed props.w — spotSize just needs a plausible passenger
    // footprint to avoid collisions, not a per-passenger exact fit.
    const spotSize = this.editor.getShapeGeometry(passengers[0]).bounds.w;
    const spots = findOpenSpotsNearZoneEdge({
      zone: { x: zoneBounds.x, y: zoneBounds.y, w: zoneBounds.w, h: zoneBounds.h },
      entry: { x: cardBounds.center.x, y: cardBounds.center.y },
      spotSize,
      occupied,
      count: passengers.length,
    });

    this.editor.reparentShapes(
      passengers.map((p) => p.id),
      this.editor.getCurrentPageId(),
    );
    // Counters/notes land upright (rotation 0) — there's no host left for
    // "relative to" to mean anything, so upright on the table is the
    // natural rest state (ticket 18). `passengers` is always counters/notes
    // here — a tucked CARD is never a real child (ticket 20 correction, see
    // TUCK_KEY comment), so its own zone-exit detach lives in
    // carryTuckedPartner, not here.
    this.editor.animateShapes(
      passengers.map((p, i) => ({ id: p.id, type: p.type, x: spots[i].x, y: spots[i].y, rotation: 0 })),
      { animation: { duration: 200 } },
    );
  }
}
