import { TLSocketRoom } from "@tldraw/sync-core";
import { trace } from "@opentelemetry/api";

// ============================================================================
// SCAFFOLDING — the in-memory room registry.
//
// A tldraw room corresponds to a Table in the core domain: the NAME is the
// alias and (in v0) the only identity — no interim GUIDs; the Spine absorbs
// table identity later (it will mint tableId at table.created).
//
// Rooms are IN-MEMORY ONLY and ephemeral: a redeploy wipes the board.
// Accepted for v0; durable reconstruction from the Spine's event log is a
// filed buoy.
// ============================================================================

export interface SeatRow {
  /** battlefield row number, allocated in first-play order */
  rowIndex: number;
  playerName: string;
  battlefieldCount: number;
  graveyardCount: number;
  exileCount: number;
}

export interface RoomEntry {
  tableName: string; // the slug
  room: TLSocketRoom;
  /** event ids already ingested — dedup for retried requests (A5) */
  seenEventIds: Set<string>;
  /** seatId -> battlefield row allocation (A5) */
  seats: Map<string, SeatRow>;
  createdAt: Date;
}

const registry = new Map<string, RoomEntry>();

export function getRoomRegistry(): Map<string, RoomEntry> {
  return registry;
}

export function getOrCreateRoom(tableName: string): RoomEntry {
  const existing = registry.get(tableName);
  if (existing) return existing;

  const entry: RoomEntry = {
    tableName,
    room: new TLSocketRoom({
      onSessionRemoved(room, args) {
        trace.getActiveSpan()?.addEvent("room.session_removed", {
          "table.name": tableName,
          "room.sessions_remaining": args.numSessionsRemaining,
        });
        if (args.numSessionsRemaining === 0) {
          trace.getActiveSpan()?.addEvent("room.emptied", { "table.name": tableName });
          // Deliberately NOT evicting: an empty room keeps its cards until the
          // process restarts (v0 accepts restart-wipes; mid-game everyone
          // refreshing at once shouldn't lose the table).
        }
      },
    }),
    seenEventIds: new Set(),
    seats: new Map(),
    createdAt: new Date(),
  };
  registry.set(tableName, entry);
  trace.getActiveSpan()?.addEvent("room.created", { "table.name": tableName });
  return entry;
}
