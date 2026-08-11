import { describe, it, expect } from "vitest";
import { TLSocketRoom } from "@tldraw/sync-core";
import { AssetRecordType, createShapeId } from "@tldraw/tlschema";

describe("TLSocketRoom.updateStore (server-side shape injection)", () => {
  it("injects an image asset + image shape into the room store", async () => {
    const room = new TLSocketRoom({});

    const assetId = AssetRecordType.createId("test-card");
    const shapeId = createShapeId("test-card-shape");

    await room.updateStore((store) => {
      store.put(
        AssetRecordType.create({
          id: assetId,
          type: "image",
          typeName: "asset",
          props: {
            name: "Lightning Bolt",
            src: "https://cards.scryfall.io/normal/front/x/y/xyz.jpg",
            w: 488,
            h: 680,
            mimeType: "image/jpeg",
            isAnimated: false,
          },
          meta: {},
        })
      );
      store.put({
        id: shapeId,
        typeName: "shape",
        type: "image",
        x: 100,
        y: 100,
        rotation: 0,
        index: "a1" as any,
        parentId: "page:page" as any,
        isLocked: false,
        opacity: 1,
        props: {
          w: 170,
          h: 238,
          assetId,
          playing: true,
          url: "",
          crop: null,
          flipX: false,
          flipY: false,
          altText: "Lightning Bolt",
        },
        meta: { instanceId: "instance-1", scryfallId: "xyz", cardName: "Lightning Bolt" },
      } as any);
    });

    const snapshot = room.getCurrentSnapshot();
    const ids = snapshot.documents.map((d) => d.state.id);
    expect(ids).toContain(assetId);
    expect(ids).toContain(shapeId);

    const shape = snapshot.documents.find((d) => d.state.id === shapeId)!.state as any;
    expect(shape.meta.instanceId).toBe("instance-1");
    room.close();
  });
});
