import { randomUUID } from "node:crypto";
import { trace } from "@opentelemetry/api";
import { tableNameFromSlug } from "../shared/slugify.js";
import { log } from "./log.js";

const SPINE_URL = process.env.SPINE_URL || "http://localhost:4600";

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
 * `traceparent` is minted here. Best-effort: never throws or rejects, so a Spine failure
 * never fails the caller's own action — on failure it sets `spine_send.send_failed` on the
 * active span and logs a warning. Like `HttpSpineGateway.sendEvent` (Shuffler), this uses a
 * bare `fetch` with no bounded timeout, so a Spine that accepts the connection but never
 * responds can still stall the caller for as long as Node's default fetch timeout (5 min) —
 * unlike `spineSubscriber.ts`'s long-lived SSE connection, this hasn't yet been given a
 * heartbeat-aware dispatcher.
 */
export async function sendCardReturnedToSpineBestEffort(params: CardReturnedParams, baseUrl: string = SPINE_URL): Promise<void> {
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
    });
    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      throw new Error(`Spine rejected the event: ${response.status} ${response.statusText} ${bodyText}`.trim());
    }
  } catch (error) {
    trace.getActiveSpan()?.setAttributes({
      "spine_send.send_failed": true,
      "table.name": tableNameFromSlug(tableId),
      "table.slug": tableId,
    });
    log.warn(
      "card.returned send to Spine failed (best-effort; the drag gesture on the canvas proceeds regardless)",
      { "table.name": tableNameFromSlug(tableId), "table.slug": tableId },
      error
    );
  }
}
