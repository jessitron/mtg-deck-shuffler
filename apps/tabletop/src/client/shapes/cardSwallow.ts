import { Editor, TLShapeId } from "tldraw";
import { MtgCardShape } from "../../shared/mtgCardShape";
import { ZoneHit } from "./zoneHitTest";
import { evictPassengers } from "./cardZoneEntry";

const SWALLOW_DURATION_MS = 500;
const SWALLOW_SPINS = 2;

interface SwallowSnapshot {
  x: number;
  y: number;
  rotation: number;
  opacity: number;
  props: MtgCardShape["props"];
}

/**
 * The library portal's swallow (ticket 12): spins the card twice while shrinking and
 * fading it into the library's center over ~500ms, then — send-then-commit — deletes it
 * only once the Tabletop server confirms the Spine accepted `card.returned.v1`. On
 * failure the card's visuals revert and it stays on the table; nothing here deletes
 * synchronously, since tldraw non-null-asserts every still-settling shape in a
 * multi-select drag (see `owners/tabletop-shape-mechanics`).
 */
export function swallowCard(editor: Editor, current: MtgCardShape, zoneHit: ZoneHit): void {
  evictPassengers(editor, current, zoneHit);

  const zoneBounds = editor.getShapePageBounds(zoneHit.id);
  if (!zoneBounds) return;

  const before: SwallowSnapshot = {
    x: current.x,
    y: current.y,
    rotation: current.rotation,
    opacity: current.opacity,
    props: current.props,
  };

  editor.animateShapes(
    [
      {
        id: current.id,
        type: current.type,
        x: zoneBounds.center.x - 0.5,
        y: zoneBounds.center.y - 0.5,
        rotation: current.rotation + SWALLOW_SPINS * 2 * Math.PI,
        opacity: 0,
        props: { ...current.props, w: 1, h: 1 },
      },
    ],
    { animation: { duration: SWALLOW_DURATION_MS } }
  );

  const id = current.id;
  const { owner, scryfallId, gameCardIndex } = current.props;

  setTimeout(() => {
    void completeSwallow(editor, id, before, { owner, scryfallId, gameCardIndex });
  }, 0);
}

async function completeSwallow(
  editor: Editor,
  id: TLShapeId,
  before: SwallowSnapshot,
  send: { owner: string; scryfallId: string; gameCardIndex: number | null }
): Promise<void> {
  const [ok] = await Promise.all([postCardReturned(send), sleep(SWALLOW_DURATION_MS)]);

  if (!editor.getShape(id)) return; // already gone (e.g. store reset mid-flight)

  if (ok) {
    editor.deleteShapes([id]);
  } else {
    editor.animateShapes(
      [{ id, type: "mtg-card", x: before.x, y: before.y, rotation: before.rotation, opacity: before.opacity, props: before.props }],
      { animation: { duration: 200 } }
    );
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function tableSlugFromLocation(): string | undefined {
  const match = window.location.pathname.match(/^\/t\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

async function postCardReturned(send: { owner: string; scryfallId: string; gameCardIndex: number | null }): Promise<boolean> {
  if (send.gameCardIndex === null) return false;
  const tableSlug = tableSlugFromLocation();
  if (!tableSlug) return false;

  try {
    const response = await fetch(`/api/tables/${encodeURIComponent(tableSlug)}/cards/return`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ seatId: send.owner, scryfallId: send.scryfallId, gameCardIndex: send.gameCardIndex }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
