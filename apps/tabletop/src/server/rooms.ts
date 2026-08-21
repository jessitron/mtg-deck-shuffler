import { TLSocketRoom } from "@tldraw/sync-core";
import { createTLSchema, defaultShapeSchemas, TLRecord } from "@tldraw/tlschema";
import { trace } from "@opentelemetry/api";
import { log } from "./log.js";
import { tableNameFromSlug } from "../shared/slugify.js";
import { SpineSubscription } from "./spineSubscriber.js";
import { stackBounds } from "./cardLayout.js";
import { mtgCardShapeProps } from "../shared/mtgCardShape.js";
import { mtgCounterShapeProps } from "../shared/mtgCounterShape.js";
import { mtgLifeCounterShapeProps } from "../shared/mtgLifeCounterShape.js";
import { mtgTitleShapeProps } from "../shared/mtgTitleShape.js";
import { mtgZoneShapeProps } from "../shared/mtgZoneShape.js";

const tableSchema = createTLSchema({
  shapes: {
    ...defaultShapeSchemas,
    "mtg-card": { props: mtgCardShapeProps },
    "mtg-counter": { props: mtgCounterShapeProps },
    "mtg-life-counter": { props: mtgLifeCounterShapeProps },
    "mtg-title": { props: mtgTitleShapeProps },
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
  /** The seat's resolved identity colors — sleeveColor when chosen, else derived from the playmat. */
  primaryColor?: string;
  secondaryColor?: string;
  graveyardCount: number;
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
  /**
   * How many of this owner's cards are currently sitting in the Stack zone, right now — not a
   * running total of how many have ever arrived. A card counts only while it's still within
   * `stackBounds()`; once a human drags it off (to the playmat, graveyard, wherever), it no
   * longer holds its slot, so a later arrival doesn't keep cascading past it.
   */
  stackCardCount(owner: string): number;
  /** The Spine's own id for this table — learned from the first `seat.joined` envelope's `tableId` (tabletop-spine-sse-subscriber ticket 01). Same string as `tableName`. */
  spineTableId?: string;
  /**
   * The room's live Spine SSE subscription — opened once, on the first `seat.joined` for
   * this room, and never explicitly closed: it lives exactly as long as the registry entry
   * itself does, same as `room`/`seats`/`seenEventIds` above — a room is never removed from
   * `registry`, emptied or not (see `onSessionRemoved` below), so there's no earlier moment
   * to close it at. All of it goes away together on process restart, same as today.
   */
  spineSubscription?: SpineSubscription;
}

function hasInstance(this: RoomEntry, instanceId: string): boolean {
  return this.room
    .getCurrentSnapshot()
    .documents.some((d) => (d.state as any).typeName === "shape" && (d.state as any).props?.instanceId === instanceId);
}

/**
 * Reads live, in-flight shape positions — tldraw's Translating tool writes to the store on
 * every pointer-move, not just on drop — so a card mid-drag through the Stack counts while it's
 * transiently there. That's a real (if rare) race with a concurrent card.played arrival, since
 * arrivals never run the overlap-nudge that a human drag's onTranslateEnd does
 * (nudgeOffAnotherCard in cardZoneEntry.ts); accepted as a narrow edge case rather than adding
 * server-side nudging for it.
 */
function stackCardCount(this: RoomEntry, owner: string): number {
  const stack = stackBounds();
  return this.room.getCurrentSnapshot().documents.filter((d) => {
    const state = d.state as any;
    if (state.typeName !== "shape" || state.type !== "mtg-card" || state.props?.owner !== owner) return false;
    return state.x >= stack.x && state.x <= stack.x + stack.w && state.y >= stack.y && state.y <= stack.y + stack.h;
  }).length;
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
          "table.name": tableNameFromSlug(tableName),
          "table.slug": tableName,
          "room.sessions_remaining": args.numSessionsRemaining,
        });
        if (args.numSessionsRemaining === 0) {
          log.info("room emptied", { "table.name": tableNameFromSlug(tableName), "table.slug": tableName });
        }
      },
    }),
    seenEventIds: new Set(),
    seats: new Map(),
    createdAt: new Date(),
    hasInstance,
    stackCardCount,
  };
  registry.set(tableName, entry);
  trace.getActiveSpan()?.setAttributes({ "room.created": true, "table.name": tableNameFromSlug(tableName), "table.slug": tableName });
  return entry;
}
