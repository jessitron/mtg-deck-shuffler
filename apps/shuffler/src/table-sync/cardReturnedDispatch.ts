import { context, propagation, ROOT_CONTEXT, trace, SpanKind } from "@opentelemetry/api";
import { GameId } from "../domain-types.js";
import { PersistStatePort } from "../port-persist-state/types.js";
import { CardRepositoryPort } from "../port-card-repository/types.js";
import { applyGameCommand } from "../apply-game-command.js";
import { validateIncomingEvent } from "../port-spine/events/incomingEventValidation.js";
import { markCurrentSpanAsError } from "../tracing_util.js";
import { broadcastGameStateUpdated } from "./gameSubscriptionRegistry.js";
import { EventApplication } from "../port-spine/events/types.js";
import { log } from "../log.js";

const tracer = trace.getTracer("mtg-deck-shuffler");

/** Nothing more will change by seeing this event again. */
const APPLIED: EventApplication = { applied: true };

interface CardReturnedPayload {
  card: { scryfallId: string };
  gameCardIndex: number;
  seat: string;
  fromZone?: string;
}

function isEnvelopeLike(value: unknown): value is { name: string; traceparent?: unknown } {
  return typeof value === "object" && value !== null && "name" in value && typeof (value as { name: unknown }).name === "string";
}

export interface CardReturnedDispatchDeps {
  persistStatePort: PersistStatePort;
  cardRepository: CardRepositoryPort;
}

/**
 * Dispatches one event received over a game's Spine SSE subscription. Every kind gets
 * the receiving span, matching the fleet's SSE event standard
 * (`apps/tabletop/CLAUDE.md`, and `apps/tabletop/src/server/spineEventDispatch.ts` — the
 * first consumer of that standard, this is the second). Continues the trace from the
 * broadcast envelope's `traceparent` (injected fresh at publish time by the Spine's
 * `Table#broadcast`) as a CHILD span — one Honeycomb trace covering the Tabletop's portal
 * drag through the Spine to this move into Revealed, not an unlinked new one.
 *
 * Resolves with `applied: true` once the event has been fully handled and confirmed to
 * have actually landed — applied, or correctly passed over as a duplicate/other-seat/
 * self-initiated/invalid event. Resolves with `applied: false` when the apply itself threw,
 * so the table delivers that event again rather than it being silently skipped.
 */
export async function dispatchSpineEventForGame(
  gameId: GameId,
  spineTableId: string,
  gameSeatId: string | undefined,
  seenEventIds: Set<string>,
  deps: CardReturnedDispatchDeps,
  event: unknown
): Promise<EventApplication> {
  if (!isEnvelopeLike(event)) return APPLIED;

  const traceparent = typeof event.traceparent === "string" ? event.traceparent : undefined;
  const parentContext = traceparent ? propagation.extract(ROOT_CONTEXT, { traceparent }) : ROOT_CONTEXT;

  return context.with(parentContext, () =>
    tracer.startActiveSpan(
      `sse subscription: ${event.name}`,
      {
        kind: SpanKind.CONSUMER,
        attributes: {
          "event.name": event.name,
          "game.game_id": String(gameId),
          "table.slug": spineTableId,
        },
      },
      async (span): Promise<EventApplication> => {
        try {
          if (event.name !== "card.returned") return APPLIED;

          const result = validateIncomingEvent<CardReturnedPayload>(event, "card.returned");
          if (!result.ok) {
            span.setAttribute("card_return.outcome", "invalid");
            log.warn("spine sse: card.returned event failed validation", {
              "game.game_id": String(gameId),
              "table.slug": spineTableId,
              "card_return.error": result.error,
            });
            return APPLIED;
          }
          const { envelope } = result;
          span.setAttribute("event.id", envelope.id);
          span.setAttribute("seat.id", envelope.payload.seat);

          if (envelope.payload.seat !== gameSeatId) {
            span.setAttribute("card_return.outcome", "other-seat");
            return APPLIED;
          }

          // The Shuffler's own Return/Put-in-Hand/Put-on-Top/Put-on-Bottom actions apply the
          // move locally *and* send this same card.returned to the Spine (so the Tabletop can
          // poof the shape) — which the Spine then broadcasts straight back over this same
          // subscription. `occurredIn` says which ship actually built the event: "shuffler"
          // means we already applied it before sending, so this arrival is just our own echo.
          if (envelope.occurredIn === "shuffler") {
            span.setAttribute("card_return.outcome", "self-initiated");
            return APPLIED;
          }

          if (seenEventIds.has(envelope.id)) {
            span.setAttribute("card_return.outcome", "duplicate");
            return APPLIED;
          }

          // An error here means the event never actually landed — saying so keeps the table
          // delivering it again, instead of it being skipped for good.
          let applyThrew = false;
          await tracer.startActiveSpan(
            "move returned card to Revealed",
            {
              kind: SpanKind.INTERNAL,
              attributes: {
                "event.id": envelope.id,
                "event.name": envelope.name,
                "game.game_id": String(gameId),
                "table.slug": spineTableId,
                "card.scryfall_id": envelope.payload.card.scryfallId,
                "game.game_card_index": envelope.payload.gameCardIndex,
                "seat.id": envelope.payload.seat,
              },
            },
            async (doingSpan) => {
              try {
                const outcome = await applyGameCommand(deps, gameId, undefined, (game) => {
                  game.moveByGameCardIndex(envelope.payload.gameCardIndex, "Revealed", undefined, "returned", envelope.seq);
                });

                if (outcome.kind === "applied") {
                  seenEventIds.add(envelope.id);
                  span.setAttribute("card_return.outcome", "applied");
                  broadcastGameStateUpdated(gameId);
                } else {
                  span.setAttribute("card_return.outcome", outcome.kind);
                  markCurrentSpanAsError(`card.returned could not be applied: ${outcome.kind}`, {
                    "card_return.outcome": outcome.kind,
                  });
                  log.error("spine sse: card.returned could not be applied", {
                    "game.game_id": String(gameId),
                    "table.slug": spineTableId,
                    "card_return.outcome": outcome.kind,
                  });
                }
              } catch (error) {
                applyThrew = true;
                span.setAttribute("card_return.outcome", "error");
                markCurrentSpanAsError(error instanceof Error ? error.message : String(error));
                log.error("spine sse: card.returned dispatch failed", { "game.game_id": String(gameId), "table.slug": spineTableId }, error);
              } finally {
                doingSpan.end();
              }
            }
          );
          return applyThrew ? { applied: false } : APPLIED;
        } finally {
          span.end();
        }
      }
    )
  );
}
