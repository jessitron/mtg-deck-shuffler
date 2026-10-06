import { trace, SpanKind } from "@opentelemetry/api";
import { getOrCreateRoom } from "./rooms.js";
import { slugifyTableName, tableNameFromSlug } from "../shared/slugify.js";
import { validateIncomingEvent } from "./contractValidation.js";
import { PASSENGER_TYPES } from "../shared/passengerTypes.js";

const tracer = trace.getTracer("mtg-tabletop");

export const CARD_RETURNED_EVENT_NAME = "card.returned";

interface CardReturnedPayload {
  card: { cardDefinitionId: string; instanceId?: string };
  gameCardIndex: number;
  seat: string;
}

export type CardRemovalOutcome =
  | { status: "invalid"; error: string }
  | { status: "removed" }
  | { status: "not-found" }
  | { status: "deduped" }
  | { status: "ignored"; reason: "not-shuffler-initiated" | "no-instance-id" };

/**
 * Poofs the tldraw shape for a card that left the Shuffler's Table location (ticket 07):
 * the Return button, or a crafted put-in-hand/top/bottom. Filters on `occurredIn: "shuffler"`
 * so the Tabletop's own library-portal-initiated `card.returned` sends (ticket 12) don't
 * bounce back and remove the very shape that swallow already handled client-side. Any
 * passenger shapes (counters/notes) are reparented to the card's own parent (always the
 * page, in practice) in place — the ticket's "attachments stay behind, detached" — since
 * there's no `Editor` instance on the server to lean on for that (tabletop-shape-mechanics,
 * 2026-08-21).
 */
export async function applyCardRemoval(tableName: string, body: unknown): Promise<CardRemovalOutcome> {
  const result = validateIncomingEvent<CardReturnedPayload>(body, CARD_RETURNED_EVENT_NAME);
  if (!result.ok) {
    return { status: "invalid", error: result.error };
  }
  const { envelope } = result;

  if (envelope.occurredIn !== "shuffler") {
    return { status: "ignored", reason: "not-shuffler-initiated" };
  }
  if (slugifyTableName(envelope.tableId) !== tableName) {
    return { status: "invalid", error: "envelope tableId does not match the table being posted to" };
  }
  const instanceId = envelope.payload.card.instanceId;
  if (!instanceId) {
    return { status: "ignored", reason: "no-instance-id" };
  }

  const entry = getOrCreateRoom(tableName);

  if (entry.seenEventIds.has(envelope.id)) {
    trace.getActiveSpan()?.setAttribute("removal.deduped", true);
    return { status: "deduped" };
  }

  trace.getActiveSpan()?.setAttributes({
    "card.instance_id": instanceId,
    "card.definition_id": envelope.payload.card.cardDefinitionId,
    "event.id": envelope.id,
    "event.name": envelope.name,
    "table.name": tableNameFromSlug(tableName),
    "table.slug": tableName,
  });

  let outcome: "removed" | "not-found" = "not-found";

  await tracer.startActiveSpan(
    "poof returned card",
    {
      kind: SpanKind.INTERNAL,
      attributes: {
        "event.id": envelope.id,
        "event.name": envelope.name,
        "table.name": tableNameFromSlug(tableName),
        "table.slug": tableName,
        "card.instance_id": instanceId,
      },
    },
    async (span) => {
      try {
        await entry.room.updateStore((store) => {
          const card = store.getAll().find((r: any) => r.typeName === "shape" && r.props?.instanceId === instanceId) as any;
          if (!card) return;

          const passengers = store
            .getAll()
            .filter((r: any) => r.typeName === "shape" && r.parentId === card.id && PASSENGER_TYPES.has(r.type)) as any[];

          const cos = Math.cos(card.rotation);
          const sin = Math.sin(card.rotation);
          for (const passenger of passengers) {
            const newX = card.x + passenger.x * cos - passenger.y * sin;
            const newY = card.y + passenger.x * sin + passenger.y * cos;
            store.put({ ...passenger, parentId: card.parentId, x: newX, y: newY, rotation: card.rotation + passenger.rotation });
          }

          store.delete(card.id);
          outcome = "removed";
        });
        span.setAttribute("removal.outcome", outcome);
      } finally {
        span.end();
      }
    }
  );

  entry.seenEventIds.add(envelope.id);
  return { status: outcome };
}
