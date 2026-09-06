// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { createTLStore, defaultBindingUtils, defaultShapeUtils, defaultTools, Editor, createShapeId } from "tldraw";
import { MtgCardShapeUtil } from "../src/client/shapes/MtgCardShapeUtil";
import { snapshotCanvas } from "../src/client/snapshotCanvas";

function createTestEditor(): Editor {
  const shapeUtils = [...defaultShapeUtils, MtgCardShapeUtil];
  const store = createTLStore({ shapeUtils });
  return new Editor({
    store,
    shapeUtils,
    bindingUtils: defaultBindingUtils,
    tools: defaultTools,
    getContainer: () => document.body,
  });
}

function putCard(editor: Editor, instanceId: string) {
  editor.createShape({
    id: createShapeId(`card-${instanceId}`),
    type: "mtg-card",
    x: 0,
    y: 0,
    props: { instanceId },
  });
}

describe("snapshotCanvas", () => {
  let editor: Editor | undefined;

  afterEach(() => {
    editor?.dispose();
    editor = undefined;
  });

  it("reads no cards off an empty canvas", () => {
    editor = createTestEditor();
    expect(snapshotCanvas(editor).cardInstanceIds).toEqual([]);
  });

  it("reads card shapes created via the editor's own API", () => {
    editor = createTestEditor();
    putCard(editor, "card-1");
    putCard(editor, "card-2");
    expect(snapshotCanvas(editor).cardInstanceIds).toEqual(["card-1", "card-2"]);
  });

  it("ignores non-card shapes", () => {
    editor = createTestEditor();
    putCard(editor, "card-1");
    editor.createShape({ id: createShapeId("note-1"), type: "note", x: 0, y: 0 });
    expect(snapshotCanvas(editor).cardInstanceIds).toEqual(["card-1"]);
  });
});
