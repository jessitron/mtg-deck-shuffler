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
import { tapPartial } from "./shapes/cardTap";

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

  function commit(partials: TLShapePartial<MtgCardShape>[], label: string) {
    if (partials.length === 0) return;
    editor.markHistoryStoppingPoint(label);
    editor.updateShapes(partials);
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
        onSelect={() =>
          commit(
            cards.filter((c) => c.props.tapped !== anyUntapped).map((c) => tapPartial(c, anyUntapped)),
            "tap",
          )
        }
      />
    </TldrawUiMenuGroup>
  );
}
