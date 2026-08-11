import { TLSocketRoom } from "@tldraw/sync-core";
import { createTLSchema, defaultShapeSchemas, TLRecord } from "@tldraw/tlschema";
import { trace } from "@opentelemetry/api";
import { log } from "./log.js";
import { mtgCardShapeProps } from "../shared/mtgCardShape.js";
import { mtgCounterShapeProps } from "../shared/mtgCounterShape.js";
import { mtgLifeCounterShapeProps } from "../shared/mtgLifeCounterShape.js";
import { mtgZoneShapeProps } from "../shared/mtgZoneShape.js";

const tableSchema = createTLSchema({
  shapes: {
    ...defaultShapeSchemas,
    "mtg-card": { props: mtgCardShapeProps },
    "mtg-counter": { props: mtgCounterShapeProps },
    "mtg-life-counter": { props: mtgLifeCounterShapeProps },
    "mtg-zone": { props: mtgZoneShapeProps },
  },
});


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
      onSessionRemoved(room, args) {
        log.info("room session removed", {
          "table.name": tableName,
          "room.sessions_remaining": args.numSessionsRemaining,
        });
        if (args.numSessionsRemaining === 0) {
          log.info("room emptied", { "table.name": tableName });
        }
      },
    }),
    seenEventIds: new Set(),
    seats: new Map(),
    createdAt: new Date(),
    hasInstance,
  };
  registry.set(tableName, entry);
  trace.getActiveSpan()?.setAttributes({ "room.created": true, "table.name": tableName });
  return entry;
}
