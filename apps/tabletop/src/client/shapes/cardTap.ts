import { Editor, Mat, TLShapePartial, Vec } from "tldraw";
import { MtgCardShape } from "../../shared/mtgCardShape";

const TAP_ANGLE = Math.PI / 2;

interface HostPose {
  x: number;
  y: number;
  rotation: number;
}

// A shape's x/y is its top-left corner, and rotation pivots around that
// point, not its center — so writing a new rotation alone swings the shape
// sideways. Hold the center fixed instead: find it under the current
// rotation, then solve for the top-left that puts the same center under the
// new rotation. Shared by tapPartial (rotation = current ± 90°) and
// MtgCardShapeUtil's zeroRotationHoldingCenter (rotation = 0) — same pivot
// math, different target angle and different source of halfExtent (a card's
// own props.w/h here; shape geometry bounds there, since that caller runs
// on any passenger type, not just cards).
export function rotateHoldingCenter(pose: HostPose, halfExtent: { x: number; y: number }, rotation: number): HostPose {
  const center = Vec.Add(pose, Vec.Rot(halfExtent, pose.rotation));
  const topLeft = Vec.Sub(center, Vec.Rot(halfExtent, rotation));
  return { x: topLeft.x, y: topLeft.y, rotation };
}

// The tap write for one card: toggle `props.tapped` and apply the ±90°
// rotation delta, holding the card's center fixed.
//
// Pulled out of MtgCardShapeUtil (ticket 17) as a standalone pure function —
// no `this.editor`, so both the shape's own onClick and the context menu's
// Tap/Untap item can share one implementation.
export function tapPartial(shape: MtgCardShape, tapped: boolean): TLShapePartial<MtgCardShape> {
  const delta = tapped ? TAP_ANGLE : -TAP_ANGLE;
  const { w, h } = shape.props;
  const pose = rotateHoldingCenter(shape, { x: w / 2, y: h / 2 }, shape.rotation + delta);

  return {
    id: shape.id,
    type: shape.type,
    x: pose.x,
    y: pose.y,
    rotation: pose.rotation,
    props: { ...shape.props, tapped },
  };
}

// Ticket 20 (cards behind cards): tldraw composes a parent's rotation into
// every child's page transform unconditionally. Counters/notes are meant to
// tilt along with a tap (ticket 18's ride-along visual); a tucked CARD is
// not — its printed face shouldn't appear to spin every time its host taps.
// Because a passenger generally isn't centered on its host, and tapPartial's
// own center-preserving pivot moves the host's (x, y) as well as its
// rotation, a bare counter-rotation isn't enough — an off-center passenger
// would still visibly orbit the host's pivot. Solve for the passenger's new
// LOCAL (x, y, rotation) that reproduces its CURRENT page transform under the
// host's POST-tap local transform: newHostLocal · newPassengerLocal ==
// oldHostLocal · oldPassengerLocal, i.e. newPassengerLocal =
// newHostLocal⁻¹ · oldHostLocal · oldPassengerLocal. Pure — no Editor — so
// it's unit-testable without a store.
export function passengerTapCompensation(passenger: MtgCardShape, oldHost: HostPose, newHost: HostPose): TLShapePartial<MtgCardShape> {
  const localMat = (pose: HostPose) => Mat.Identity().translate(pose.x, pose.y).rotate(pose.rotation);
  const compensated = localMat(newHost).invert().multiply(localMat(oldHost)).multiply(localMat(passenger)).decompose();

  return { id: passenger.id, type: passenger.type, x: compensated.x, y: compensated.y, rotation: compensated.rotation };
}

// tapPartial's return type is a generic TLShapePartial, so x/y/rotation are
// typed optional even though tapPartial always sets them — narrow back to a
// HostPose at the one seam that needs it.
export function poseOf(partial: TLShapePartial<MtgCardShape>): HostPose {
  return { x: partial.x!, y: partial.y!, rotation: partial.rotation! };
}

// Every direct mtg-card child of `oldHost`, compensated against `newHost`'s
// tap-delta transform (see passengerTapCompensation above).
export function passengerCompensationPartials(editor: Editor, oldHost: MtgCardShape, newHost: HostPose): TLShapePartial<MtgCardShape>[] {
  return editor
    .getSortedChildIdsForParent(oldHost.id)
    .map((id) => editor.getShape(id))
    .filter((s): s is MtgCardShape => !!s && s.type === "mtg-card")
    .map((child) => passengerTapCompensation(child, oldHost, newHost));
}

// Tap (or untap) each of `cards` to `tapped`, compensating each one's own
// mtg-card passengers in the same batch. Cards already at the target state
// are left untouched — shared by the context menu's Tap/Untap item and
// MtgCardShapeUtil's multi-select propagation.
//
// A card that's directly IN `cards` (a passenger multi-selected alongside
// its own host, both being tapped in the same gesture) always gets its own
// tap write, never a stale "ride along" compensation computed as though it
// weren't independently changing state too — dedupe against `directIds`
// rather than relying on which partial happens to land later in the array,
// which would make the outcome depend on `cards`' iteration order.
export function tapPartialsForCards(editor: Editor, cards: MtgCardShape[], tapped: boolean): TLShapePartial<MtgCardShape>[] {
  const directIds = new Set(cards.map((c) => c.id));
  const partials: TLShapePartial<MtgCardShape>[] = [];
  for (const card of cards) {
    if (card.props.tapped === tapped) continue;
    const hostPartial = tapPartial(card, tapped);
    const compensations = passengerCompensationPartials(editor, card, poseOf(hostPartial)).filter((p) => !directIds.has(p.id));
    partials.push(hostPartial, ...compensations);
  }
  return partials;
}
