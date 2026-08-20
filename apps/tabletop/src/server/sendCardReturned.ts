import { randomUUID } from "node:crypto";
import { trace } from "@opentelemetry/api";
import { tableNameFromSlug } from "../shared/slugify.js";
import { log } from "./log.js";

export const CARD_RETURNED_EVENT_NAME = "card.returned" as const;

export interface CardReturnedParams {
  /** The Spine's real table id (the full slug), matching seat.joined's `entry.spineTableId`. */
  tableId: string;
  seatId: string;
  playerName: string;
  scryfallId: string;
  gameCardIndex: number;
  fromZone?: string;
}

/**
 * Sends a `card.returned.v1` event to the Spine's generic events endpoint — the same send
 * shape `sendCardPlayedToSpineBestEffort` (Shuffler) already uses for `card.played`, and
 * `eventsUrl` is not introduced: the address is simply "the Spine". Rides the ambient
 * request/gesture span plus undici's automatic outbound `traceparent` header; no envelope
 * `traceparent` is minted here. Best-effort: never throws or rejects — a Spine failure
 * never crashes the caller. Resolves `true`/`false` so a send-then-commit caller (the
 * library-portal swallow, ticket 12) can gate its own commit on the outcome; both outcomes
 * are stamped on the active span (`card.returned.spine_confirmed`), and failure also sets
 * `spine_send.send_failed` and logs a warning. Bounded to a 5s timeout
 * (`AbortSignal.timeout`) — unlike `spineSubscriber.ts`'s long-lived SSE connection this
 * is a single request, so a plain abort signal is enough; no `undici.Agent` needed.
 */
export async function sendCardReturnedToSpineBestEffort(
  params: CardReturnedParams,
  baseUrl: string = process.env.SPINE_URL || "http://localhost:4600"
): Promise<boolean> {
  const { tableId, seatId, playerName, scryfallId, gameCardIndex, fromZone } = params;
  const event = {
    id: randomUUID(),
    tableId,
    name: CARD_RETURNED_EVENT_NAME,
    occurredAt: new Date().toISOString(),
    initiator: { seatId, playerName },
    occurredIn: "tabletop" as const,
    origin: "tabletop.cardShapeHook",
    significance: "domain" as const,
    schemaVersion: 1,
    payload: {
      card: { scryfallId },
      gameCardIndex,
      seat: seatId,
      ...(fromZone !== undefined ? { fromZone } : {}),
    },
  };

  try {
    const url = `${baseUrl}/tables/${encodeURIComponent(tableId)}/events`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      throw new Error(`Spine rejected the event: ${response.status} ${response.statusText} ${bodyText}`.trim());
    }
    trace.getActiveSpan()?.setAttribute("card.returned.spine_confirmed", true);
    return true;
  } catch (error) {
    trace.getActiveSpan()?.setAttributes({
      "card.returned.spine_confirmed": false,
      "spine_send.send_failed": true,
      "table.name": tableNameFromSlug(tableId),
      "table.slug": tableId,
    });
    log.warn(
      "card.returned send to Spine failed (best-effort; caller decides how to proceed)",
      { "table.name": tableNameFromSlug(tableId), "table.slug": tableId },
      error
    );
    return false;
  }
}
