import { describe, it, expect } from "vitest";
import { mtgCardShapeMigrations } from "../src/shared/mtgCardShape";

describe("mtg-card shape migrations", () => {
  const [rename, addCardSource] = mtgCardShapeMigrations.sequence as Array<{
    up: (props: Record<string, unknown>) => void;
    down: (props: Record<string, unknown>) => void;
  }>;

  it("renames scryfallId to cardDefinitionId going up, and back going down", () => {
    const props: Record<string, unknown> = { scryfallId: "11111111-1111-4111-8111-111111111111", cardName: "Bolt" };
    rename.up(props);
    expect(props).toEqual({ cardDefinitionId: "11111111-1111-4111-8111-111111111111", cardName: "Bolt" });
    rename.down(props);
    expect(props).toEqual({ scryfallId: "11111111-1111-4111-8111-111111111111", cardName: "Bolt" });
  });

  it("adds cardSource 'scryfall' going up, and removes it going down so older clients stay connected", () => {
    const props: Record<string, unknown> = { cardDefinitionId: "11111111-1111-4111-8111-111111111111", cardName: "Bolt" };
    addCardSource.up(props);
    expect(props).toEqual({ cardDefinitionId: "11111111-1111-4111-8111-111111111111", cardName: "Bolt", cardSource: "scryfall" });
    addCardSource.down(props);
    expect(props).toEqual({ cardDefinitionId: "11111111-1111-4111-8111-111111111111", cardName: "Bolt" });
  });

  it("removes a custom card's cardSource going down", () => {
    const props: Record<string, unknown> = { cardDefinitionId: "x", cardSource: "archidekt-custom" };
    addCardSource.down(props);
    expect(props).toEqual({ cardDefinitionId: "x" });
  });
});
