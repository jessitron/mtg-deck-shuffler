/**
 * TableState models, for now, just which cards (by instanceId) are present on the
 * table — the smallest slice the cards-jump-to-entry-position diagnostic needs. Later
 * tickets extend it with position and kind-specific state; projectEvents/snapshotCanvas/
 * diffTableStates must keep producing values in the same shape so they stay diffable.
 */
export interface TableState {
  cardInstanceIds: string[];
}

export interface PhysicalEvent {
  name: string;
  payload: {
    card: { instanceId?: string };
  };
}

const CARD_ARRIVED_EVENT = "card.played";
const CARD_REMOVED_EVENT = "card.returned";

/** Pure fold of the existing card.played/card.returned events into a TableState. */
export function projectEvents(events: PhysicalEvent[]): TableState {
  const present = new Set<string>();
  for (const event of events) {
    const instanceId = event.payload.card.instanceId;
    if (!instanceId) continue;
    if (event.name === CARD_ARRIVED_EVENT) {
      present.add(instanceId);
    } else if (event.name === CARD_REMOVED_EVENT) {
      present.delete(instanceId);
    }
  }
  return { cardInstanceIds: [...present].sort() };
}

export interface TableStateDiscrepancy {
  instanceId: string;
  kind: "missing-from-canvas" | "missing-from-log";
}

/** Diffs a log-projected TableState against a live-canvas-snapshotted one. */
export function diffTableStates(projected: TableState, live: TableState): TableStateDiscrepancy[] {
  const projectedIds = new Set(projected.cardInstanceIds);
  const liveIds = new Set(live.cardInstanceIds);
  const discrepancies: TableStateDiscrepancy[] = [];
  for (const instanceId of projectedIds) {
    if (!liveIds.has(instanceId)) discrepancies.push({ instanceId, kind: "missing-from-canvas" });
  }
  for (const instanceId of liveIds) {
    if (!projectedIds.has(instanceId)) discrepancies.push({ instanceId, kind: "missing-from-log" });
  }
  return discrepancies;
}
