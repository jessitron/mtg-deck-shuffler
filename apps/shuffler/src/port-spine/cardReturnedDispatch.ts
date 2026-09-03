import { context, propagation, ROOT_CONTEXT, trace, SpanKind } from "@opentelemetry/api";
import { GameId } from "../domain-types.js";
import { PersistStatePort } from "../port-persist-state/types.js";
import { CardRepositoryPort } from "../port-card-repository/types.js";
import { applyGameCommand } from "../apply-game-command.js";
import { validateIncomingEvent } from "./incomingEventValidation.js";
import { markCurrentSpanAsError } from "../tracing_util.js";
import { broadcastGameStateUpdated } from "./gameSubscriptionRegistry.js";
import { log } from "../log.js";

const tracer = trace.getTracer("mtg-deck-shuffler");

interface CardReturnedPayload {
  card: { scryfallId: string };
  gameCardIndex: number;
  seat: string;
  fromZone?: string;
}

function isEnvelopeLike(value: unknown): value is { name: string; traceparent?: unknown } {
  return typeof value === "object" && value !== null && "name" in value && typeof (value as { name: unknown }).name === "string";
}

/** The Spine assigns `seq` on append and stamps it on every broadcast envelope — read here, not by `subscribeToSpine`, per the seq-tracking contract described there. */
function extractSeq(value: unknown): number | undefined {
  if (typeof value !== "object" || value === null || !("seq" in value)) return undefined;
  const seq = (value as { seq: unknown }).seq;
  return typeof seq === "number" ? seq : undefined;
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
 * Resolves with the event's `seq` once it's been fully handled and confirmed to have
 * actually landed (applied, or correctly skipped as a duplicate/other-seat/invalid event)
 * — `subscribeToSpine` uses that to track the high-water mark it sends back as
 * `Last-Event-ID` on reconnect. Resolves with `undefined` when the apply itself threw, so
 * that event gets replayed rather than silently skipped on the next reconnect.
 */
export async function dispatchSpineEventForGame(
  gameId: GameId,
  spineTableId: string,
  gameSeatId: string | undefined,
  seenEventIds: Set<string>,
  deps: CardReturnedDispatchDeps,
  event: unknown
): Promise<number | undefined> {
  const seq = extractSeq(event);
  if (!isEnvelopeLike(event)) return seq;

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
      async (span): Promise<number | undefined> => {
        try {
          if (event.name !== "card.returned") return seq;

          const result = validateIncomingEvent<CardReturnedPayload>(event, "card.returned");
          if (!result.ok) {
            span.setAttribute("card_return.outcome", "invalid");
            log.warn("spine sse: card.returned event failed validation", {
              "game.game_id": String(gameId),
              "table.slug": spineTableId,
              "card_return.error": result.error,
            });
            return seq;
          }
          const { envelope } = result;
          span.setAttribute("event.id", envelope.id);
          span.setAttribute("seat.id", envelope.payload.seat);

          if (envelope.payload.seat !== gameSeatId) {
            span.setAttribute("card_return.outcome", "other-seat");
            return seq;
          }

          if (seenEventIds.has(envelope.id)) {
            span.setAttribute("card_return.outcome", "duplicate");
            return seq;
          }

          // An error here means the event never actually landed — the seq high-water mark
          // must not advance past it, or a replayed reconnect would skip it for good.
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
                  game.moveByGameCardIndex(envelope.payload.gameCardIndex, "Revealed");
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
          return applyThrew ? undefined : seq;
        } finally {
          span.end();
        }
      }
    )
  );
}
