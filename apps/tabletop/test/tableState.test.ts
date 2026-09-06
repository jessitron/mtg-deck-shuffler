import { describe, it, expect } from "vitest";
import { projectEvents, diffTableStates, PhysicalEvent } from "../src/shared/tableState";

function arrived(instanceId: string): PhysicalEvent {
  return { name: "card.played", payload: { card: { instanceId } } };
}

function returned(instanceId: string): PhysicalEvent {
  return { name: "card.returned", payload: { card: { instanceId } } };
}

describe("projectEvents", () => {
  it("adds a card on card.played", () => {
    const state = projectEvents([arrived("card-1")]);
    expect(state.cardInstanceIds).toEqual(["card-1"]);
  });

  it("removes a card on card.returned", () => {
    const state = projectEvents([arrived("card-1"), returned("card-1")]);
    expect(state.cardInstanceIds).toEqual([]);
  });

  it("folds interleaved events for multiple cards", () => {
    const state = projectEvents([arrived("card-1"), arrived("card-2"), returned("card-1"), arrived("card-3")]);
    expect(state.cardInstanceIds).toEqual(["card-2", "card-3"]);
  });

  it("ignores a card.returned with no instanceId", () => {
    const state = projectEvents([arrived("card-1"), { name: "card.returned", payload: { card: {} } }]);
    expect(state.cardInstanceIds).toEqual(["card-1"]);
  });
});

describe("diffTableStates", () => {
  it("reports no discrepancies for a matching pair", () => {
    const projected = { cardInstanceIds: ["card-1", "card-2"] };
    const live = { cardInstanceIds: ["card-2", "card-1"] };
    expect(diffTableStates(projected, live)).toEqual([]);
  });

  it("reports a card missing from the canvas and a card missing from the log", () => {
    const projected = { cardInstanceIds: ["card-1", "card-2"] };
    const live = { cardInstanceIds: ["card-2", "card-3"] };
    const discrepancies = diffTableStates(projected, live);
    expect(discrepancies).toContainEqual({ instanceId: "card-1", kind: "missing-from-canvas" });
    expect(discrepancies).toContainEqual({ instanceId: "card-3", kind: "missing-from-log" });
    expect(discrepancies).toHaveLength(2);
  });
});
