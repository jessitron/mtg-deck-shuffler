import { describe, it, expect } from "vitest";
import { mtgCardShapeMigrations } from "../src/shared/mtgCardShape";

describe("mtg-card shape migrations", () => {
  const [rename] = mtgCardShapeMigrations.sequence as Array<{
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
});
