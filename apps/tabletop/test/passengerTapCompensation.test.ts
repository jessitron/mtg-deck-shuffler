import { describe, expect, it } from "vitest";
import { Mat } from "tldraw";
import { passengerTapCompensation } from "../src/client/shapes/cardTap";
import { MtgCardShape } from "../src/shared/mtgCardShape";

/**
 * Ticket 20 (tabletop-physics): counter-rotation compensation for a card
 * tucked under a host. Pure math, no Editor — the seam this ticket's plan
 * calls out for TDD.
 */

function localMat(h: { x: number; y: number; rotation: number }): Mat {
  return Mat.Identity().translate(h.x, h.y).rotate(h.rotation);
}

function pagePoseUnderHost(host: { x: number; y: number; rotation: number }, passenger: { x: number; y: number; rotation: number }) {
  return Mat.Compose(localMat(host), localMat(passenger)).decompose();
}

function passenger(overrides: Partial<MtgCardShape["props"]> & { x?: number; y?: number; rotation?: number }): MtgCardShape {
  const { x = 0, y = 0, rotation = 0, ...props } = overrides;
  return {
    id: "shape:passenger" as MtgCardShape["id"],
    type: "mtg-card",
    x,
    y,
    rotation,
    index: "a1" as MtgCardShape["index"],
    parentId: "shape:host" as MtgCardShape["parentId"],
    isLocked: false,
    opacity: 1,
    meta: {},
    typeName: "shape",
    props: {
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
      ...props,
    },
  } as MtgCardShape;
}

describe("passengerTapCompensation", () => {
  it("holds an off-center passenger's page position and rotation fixed across the host's tap", () => {
    const oldHost = { x: 0, y: 0, rotation: 0 };
    // tapPartial's own math: +90deg, x/y adjusted to hold the host's 170x238
    // center fixed. Center = (85, 119); new top-left under +90deg rotation.
    const newHost = { x: 85 - 119, y: 119 - 85, rotation: Math.PI / 2 };

    const before = passenger({ x: 20, y: 30, rotation: 0 });
    const wantedPage = pagePoseUnderHost(oldHost, before);

    const compensated = passengerTapCompensation(before, oldHost, newHost);
    const gotPage = pagePoseUnderHost(newHost, { x: compensated.x!, y: compensated.y!, rotation: compensated.rotation! });

    expect(gotPage.x).toBeCloseTo(wantedPage.x, 5);
    expect(gotPage.y).toBeCloseTo(wantedPage.y, 5);
    expect(gotPage.rotation).toBeCloseTo(wantedPage.rotation, 5);
  });

  it("is a no-op when the host's transform hasn't changed", () => {
    const host = { x: 12, y: -4, rotation: 0.3 };
    const before = passenger({ x: 40, y: -15, rotation: 0.1 });

    const compensated = passengerTapCompensation(before, host, host);

    expect(compensated.x).toBeCloseTo(before.x, 5);
    expect(compensated.y).toBeCloseTo(before.y, 5);
    expect(compensated.rotation).toBeCloseTo(before.rotation, 5);
  });

  it("round-trips: tap then untap returns the passenger to its original local coordinates", () => {
    const untapped = { x: 0, y: 0, rotation: 0 };
    const tapped = { x: 85 - 119, y: 119 - 85, rotation: Math.PI / 2 };

    const before = passenger({ x: -30, y: 60, rotation: 0 });
    const afterTap = passengerTapCompensation(before, untapped, tapped);
    const afterUntap = passengerTapCompensation(
      { ...before, x: afterTap.x!, y: afterTap.y!, rotation: afterTap.rotation! },
      tapped,
      untapped,
    );

    expect(afterUntap.x).toBeCloseTo(before.x, 5);
    expect(afterUntap.y).toBeCloseTo(before.y, 5);
    expect(afterUntap.rotation).toBeCloseTo(before.rotation, 5);
  });
});
