import { Request, Response } from "express";
import { trace, SpanKind } from "@opentelemetry/api";
import { createShapeId } from "@tldraw/tlschema";
import { getOrCreateRoom } from "./rooms.js";
import { slugifyTableName, tableNameFromSlug } from "../shared/slugify.js";
import { ensurePlayerArea, pageIdOf, nextIndex, mtgCardShape, addCommanderDamageCounters } from "./tableFurniture.js";
import { MAX_SEATS, CARD_W, CARD_H, commandZoneCardPosition } from "./cardLayout.js";
import { validateIncomingEvent } from "./contractValidation.js";
import { subscribeToSpine } from "./spineSubscriber.js";
import { dispatchSpineEvent } from "./spineEventDispatch.js";

const tracer = trace.getTracer("mtg-tabletop");

/** A commander riding seat.joined (ticket 18) — always face up, no `face` field on the wire. */
interface SeatJoinedCommander {
  card: { scryfallId: string; instanceId: string };
  cardName: string;
  frontImageUrl: string;
  backImageUrl: string | null;
}

/** A ghost's identity never collides with a real instanceId — instanceAlreadyOnTable (cardArrival.ts) matches exact strings. */
const ghostInstanceId = (instanceId: string): string => `ghost:${instanceId}`;


interface SeatJoinedPayload {
  deckName: string;
  playmatImageUrl?: string;
  cardBackImageUrl?: string;
  sleeveColor?: string;
  primaryColor?: string;
  secondaryColor?: string;
  commanders?: SeatJoinedCommander[];
  gameCardIndex?: number;
}

export async function handleSeatJoined(req: Request, res: Response): Promise<void> {
  const tableName = slugifyTableName(req.params.tableName ?? "");
  if (!tableName) {
    res.status(400).json({ error: "table name required" });
    return;
  }

  const result = validateIncomingEvent<SeatJoinedPayload>(req.body, "seat.joined");
  if (!result.ok) {
    res.status(400).json({ error: result.error });
    return;
  }
  const { envelope } = result;
  if (slugifyTableName(envelope.tableId) !== tableName) {
    res.status(400).json({ error: "envelope tableId does not match the table being posted to" });
    return;
  }
  const seatId = envelope.initiator.seatId;
  if (!seatId) {
    res.status(400).json({ error: "initiator.seatId is required for seat.joined" });
    return;
  }
  const { playerName } = envelope.initiator;
  const { deckName, playmatImageUrl, cardBackImageUrl, sleeveColor, primaryColor, secondaryColor, commanders } = envelope.payload;

  trace.getActiveSpan()?.setAttributes({
    "event.id": envelope.id,
    "event.name": envelope.name,
    "table.name": tableNameFromSlug(tableName),
    "table.slug": tableName,
    "seat.id": seatId,
    "player.name": playerName,
  });

  const entry = getOrCreateRoom(tableName);

  // One live Spine SSE subscription per room, opened the first time a seat.joined
  // tells this room its Spine tableId — a second seat joining is a no-op here.
  if (!entry.spineSubscription) {
    entry.spineTableId = envelope.tableId;
    entry.spineSubscription = subscribeToSpine(envelope.tableId, (spineEvent) => dispatchSpineEvent(tableName, spineEvent));
  }

  if (entry.seenEventIds.has(envelope.id)) {
    trace.getActiveSpan()?.setAttribute("seat_joined.deduped", "event-id");
    res.status(200).json({ ok: true, deduped: true });
    return;
  }
  if (entry.seats.has(seatId)) {
    entry.seenEventIds.add(envelope.id);
    trace.getActiveSpan()?.setAttribute("seat_joined.deduped", "seat-already-seated");
    res.status(200).json({ ok: true, deduped: true });
    return;
  }

  if (entry.seats.size >= MAX_SEATS) {
    trace.getActiveSpan()?.setAttribute("seat_joined.rejected", "table-full");
    res.status(409).json({ error: `table is full: ${MAX_SEATS} seats` });
    return;
  }

  const pageId = pageIdOf(entry);
  const seatCommanders = commanders ?? [];

  await tracer.startActiveSpan(
    "add player furniture",
    {
      kind: SpanKind.INTERNAL,
      attributes: {
        "event.id": envelope.id,
        "event.name": envelope.name,
        "table.name": tableNameFromSlug(tableName),
        "table.slug": tableName,
        "seat.id": seatId,
        "player.name": playerName,
        "player.deckName": deckName,
        "player.playmatImageUrl": playmatImageUrl ?? "",
        "player.cardBackImageUrl": cardBackImageUrl ?? "",
        "player.sleeveColor": sleeveColor ?? "",
        "player.primaryColor": primaryColor ?? "",
        "player.secondaryColor": secondaryColor ?? "",
        "commander.count": seatCommanders.length,
        "commander.names": seatCommanders.map((commander) => commander.cardName),
        "room.seats_before": entry.seats.size,
      },
    },
    async (span) => {
      try {
        const playerArea = await ensurePlayerArea(entry, pageId, seatId, playerName, {
          deckName,
          playmatImageUrl,
          cardBackImageUrl,
          sleeveColor,
          primaryColor,
          secondaryColor,
        });

        if (seatCommanders.length > 0) {
          await entry.room.updateStore((store) => {
            seatCommanders.forEach((commander, slot) => {
              const { instanceId } = commander.card;
              const position = commandZoneCardPosition(playerArea.seatIndex, slot, seatCommanders.length as 1 | 2);
              const sharedFields = {
                pageId,
                x: position.x,
                y: position.y,
                w: CARD_W,
                h: CARD_H,
                scryfallId: commander.card.scryfallId,
                cardName: commander.cardName,
                frontImageUrl: commander.frontImageUrl,
                backImageUrl: commander.backImageUrl,
                face: "front" as const,
                faceDown: false,
                sleeveColor: playerArea.sleeveColor ?? null,
                cardBackImageUrl: playerArea.cardBackImageUrl ?? null,
                owner: seatId,
                isCommander: true,
              };

              store.put(
                mtgCardShape({
                  id: createShapeId(`ghost-${instanceId}`),
                  index: nextIndex(tableName),
                  instanceId: ghostInstanceId(instanceId),
                  isLocked: true,
                  opacity: 0.3,
                  ...sharedFields,
                })
              );
              store.put(
                mtgCardShape({
                  id: createShapeId(`card-${instanceId}`),
                  index: nextIndex(tableName),
                  instanceId,
                  ...sharedFields,
                })
              );
            });
          });
        }

        const commanderNames = seatCommanders.map((commander) => commander.cardName);
        if (commanderNames.length > 0) {
          playerArea.commanderNames = commanderNames;
        }

        for (const [otherSeatId, otherArea] of entry.seats) {
          if (otherSeatId === seatId) continue;
          await addCommanderDamageCounters(entry, pageId, seatId, otherSeatId, otherArea.commanderNames, otherArea.sleeveColor);
          await addCommanderDamageCounters(entry, pageId, otherSeatId, seatId, commanderNames, sleeveColor);
        }

        span.setAttribute("room.seats_after", entry.seats.size);
      } finally {
        span.end();
      }
    }
  );

  entry.seenEventIds.add(envelope.id);
  res.status(201).json({ ok: true });
}
