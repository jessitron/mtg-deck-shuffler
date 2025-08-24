import { test, describe } from "node:test";
import assert from "node:assert";
import { ArchidektCard, convertArchidektToCard } from "../src/deck-retrieval/ArchidektTypes.js";

describe("convertArchidektToCard", () => {
  test("converts card with oracle name", () => {
    const archidektCard: ArchidektCard = {
      card: {
        uid: "test-uid",
        multiverseid: 123456,
        oracleCard: {
          name: "Oracle Name",
        },
      },
      quantity: 1,
      categories: ["Test"],
    };

    const result = convertArchidektToCard(archidektCard);

    assert.deepStrictEqual(result, { name: "Oracle Name", uid: "test-uid", multiverseid: 123456 });
  });

  test("converts card with display name when available", () => {
    const archidektCard: ArchidektCard = {
      card: {
        displayName: "Display Name",
        uid: "test-uid-2",
        multiverseid: 789012,
        oracleCard: {
          name: "Oracle Name",
        },
      },
      quantity: 1,
      categories: ["Test"],
    };

    const result = convertArchidektToCard(archidektCard);

    assert.deepStrictEqual(result, { name: "Display Name", uid: "test-uid-2", multiverseid: 789012 });
  });
});

