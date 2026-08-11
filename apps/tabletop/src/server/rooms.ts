import { TLSocketRoom } from "@tldraw/sync-core";
import { createTLSchema, defaultShapeSchemas, TLRecord } from "@tldraw/tlschema";
import { trace } from "@opentelemetry/api";
import { log } from "./log.js";
import { mtgCardShapeProps } from "../shared/mtgCardShape.js";
import { mtgCounterShapeProps } from "../shared/mtgCounterShape.js";
import { mtgLifeCounterShapeProps } from "../shared/mtgLifeCounterShape.js";
import { mtgZoneShapeProps } from "../shared/mtgZoneShape.js";

// Every room's store validates against this schema — the server-side twin of
// the client's `shapeUtils` list in TablePage.tsx (@tldraw/tlschema
// createTLSchema, not the React shapeUtils constructors: the server never
// renders). Missing `mtg-card`/`mtg-zone` here doesn't silently fail like the
// client schema would — it disconnects any client that pushes one.
const tableSchema = createTLSchema({
  shapes: {
    ...defaultShapeSchemas,
    "mtg-card": { props: mtgCardShapeProps },
    "mtg-counter": { props: mtgCounterShapeProps },
    "mtg-life-counter": { props: mtgLifeCounterShapeProps },
    "mtg-zone": { props: mtgZoneShapeProps },
  },
});

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

export interface PlayerArea {
  /** position in the row of player areas, assigned in join order (JES-140) */
  seatIndex: number;
  playerName: string;
  playmatImageUrl?: string;
  cardBackImageUrl?: string;
  /** The seat's sleeve (table-layout ticket 17) — wins over cardBackImageUrl; baked into each card at mint time. */
  sleeveColor?: string;
  landCount: number;
  graveyardCount: number;
  stackCount: number;
  /** This seat's commander names (partners = 2 entries) — table-layout ticket 21, one damage counter per name, labeled with it. */
  commanderNames: string[];
  /** How many commander-damage counters already sit on this seat's own name row — next one's position. */
  damageCounterCount: number;
}

export interface RoomEntry {
  tableName: string; // the slug
  room: TLSocketRoom<TLRecord>;
  /** event ids already ingested — dedup for retried requests (A5) */
  seenEventIds: Set<string>;
  /** seatId -> player area allocation, in join order (JES-140) */
  seats: Map<string, PlayerArea>;
  createdAt: Date;
  /** Is a card shape with this instanceId already on the table? A second arrival of the same instance is a physical no-op. */
  hasInstance(instanceId: string): boolean;
}

function hasInstance(this: RoomEntry, instanceId: string): boolean {
  return this.room
    .getCurrentSnapshot()
    .documents.some((d) => (d.state as any).typeName === "shape" && (d.state as any).props?.instanceId === instanceId);
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
      schema: tableSchema,
      // Logs, not span events. tldraw calls this from its throttled
      // pruneSessions timer, long after the span that opened the room has ENDED
      // — measured at ~13s after a 2.4ms "ws connect" span.
      //
      // The context is still present (AsyncLocalStorage carries it into the
      // timer), so trace.getActiveSpan() returns that *ended* span rather than
      // undefined. Which is why addEvent threw "Operation attempted on ended
      // Span" in production rather than quietly no-op'ing, and the record was
      // lost. A log has no such constraint: it's emitted immediately, and it
      // still carries the trace id, so it lands on the trace anyway.
      onSessionRemoved(room, args) {
        log.info("room session removed", {
          "table.name": tableName,
          "room.sessions_remaining": args.numSessionsRemaining,
        });
        if (args.numSessionsRemaining === 0) {
          log.info("room emptied", { "table.name": tableName });
          // Deliberately NOT evicting: an empty room keeps its cards until the
          // process restarts (v0 accepts restart-wipes; mid-game everyone
          // refreshing at once shouldn't lose the table).
        }
      },
    }),
    seenEventIds: new Set(),
    seats: new Map(),
    createdAt: new Date(),
    hasInstance,
  };
  registry.set(tableName, entry);
  // An attribute, not a log: both callers of this function run inside a span
  // (handleCardArrival's request span, and the "ws connect" span in server.ts),
  // so this belongs on the span that caused the creation — where it correlates
  // with everything else about that request. Attributes beat logs whenever
  // there's a span to hang them on.
  trace.getActiveSpan()?.setAttributes({ "room.created": true, "table.name": tableName });
  return entry;
}
