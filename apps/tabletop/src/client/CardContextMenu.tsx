import {
  ClipboardMenuGroup,
  DefaultContextMenu,
  ReorderMenuSubmenu,
  TldrawUiMenuGroup,
  TldrawUiMenuItem,
  TLShapePartial,
  TLUiContextMenuProps,
  useEditor,
  useValue,
} from "tldraw";
import { MtgCardShape } from "../shared/mtgCardShape";
import { tapPartialsForCards } from "./shapes/cardTap";

/**
 * The Tabletop's first custom context menu (ticket 17: flip and face-down).
 * `DefaultContextMenu`'s `children` REPLACE its default content entirely —
 * there is no additive slot — so this renders the card actions plus a
 * trimmed stock menu, not the untouched `DefaultContextMenuContent`.
 *
 * Curation (Jess, ticket 17): keep only Reorder and the clipboard group
 * (Cut/Copy/Paste/Duplicate/Delete); drop Lock/Unlock (`EditMenuSubmenu`),
 * Arrange, Move to page, Conversions, and Select all. Losing Lock/Unlock here
 * is deliberate — furniture is the only thing that's ever locked, and zones
 * mint locked and stay that way (tabletop-shape-mechanics owner, ticket 17
 * review).
 */
export function TableContextMenu(props: TLUiContextMenuProps) {
  return (
    <DefaultContextMenu {...props}>
      <CardMenuItems />
      <TldrawUiMenuGroup id="modify">
        <ReorderMenuSubmenu />
      </TldrawUiMenuGroup>
      <ClipboardMenuGroup />
    </DefaultContextMenu>
  );
}

function CardMenuItems() {
  const editor = useEditor();
  const cards = useValue(
    "selected mtg-cards",
    () => editor.getSelectedShapes().filter((s): s is MtgCardShape => s.type === "mtg-card"),
    [editor],
  );

  if (cards.length === 0) return null;

  // Right-clicking selects the card, and — unlike locked shapes — an
  // unlocked card's selection survives the menu closing (tldraw's own
  // behavior). A lingering selection makes the NEXT drag of a different card
  // silently move this one instead (MtgCardShapeUtil.onTranslateEnd's
  // comment on the same hazard). Every action here clears selection when
  // it's done, same fix, applied at the menu's exit instead of the drag's.
  function commit(partials: TLShapePartial<MtgCardShape>[], label: string) {
    if (partials.length === 0) return;
    editor.markHistoryStoppingPoint(label);
    editor.updateShapes(partials);
    editor.setSelectedShapes([]);
  }

  const flippable = cards.filter((c) => c.props.backImageUrl !== null);
  const anyFaceUp = cards.some((c) => !c.props.faceDown);
  const anyUntapped = cards.some((c) => !c.props.tapped);

  return (
    <TldrawUiMenuGroup id="mtg-card-actions">
      {flippable.length > 0 && (
        <TldrawUiMenuItem
          id="mtg-card-flip"
          label="Flip"
          onSelect={() =>
            commit(
              flippable.map((c) => ({
                id: c.id,
                type: c.type,
                props: { ...c.props, face: c.props.face === "front" ? ("back" as const) : ("front" as const) },
              })),
              "flip",
            )
          }
        />
      )}
      <TldrawUiMenuItem
        id="mtg-card-face-down"
        label={anyFaceUp ? "Turn face down" : "Turn face up"}
        onSelect={() =>
          commit(
            cards
              .filter((c) => c.props.faceDown !== anyFaceUp)
              .map((c) => ({ id: c.id, type: c.type, props: { ...c.props, faceDown: anyFaceUp } })),
            "turn-face",
          )
        }
      />
      <TldrawUiMenuItem
        id="mtg-card-tap"
        label={anyUntapped ? "Tap" : "Untap"}
        onSelect={() => commit(tapPartialsForCards(editor, cards, anyUntapped), "tap")}
      />
    </TldrawUiMenuGroup>
  );
}
