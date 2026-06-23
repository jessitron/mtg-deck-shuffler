import { CardDefinition, Deck, PERSISTED_DECK_VERSION } from "../../types.js";
import { MtgjsonCard, MtgjsonDeck } from "./mtgjsonTypes.js";
import { isDoubleSidedLayout } from "../twoFacedLayouts.js";

export class MtgjsonDeckAdapter {
  /**
   * Converts a MTGJSON preconstructed deck format to our internal Deck format
   *
   * ⚠️ IMPORTANT: If you change the conversion logic in this adapter (especially in convertMtgjsonToCard),
   * you MUST regenerate all precon files by running:
   *   npm run precons:fetch-mtgjson -- --convert
   *
   * The precon JSON files in decks/ are generated once and read directly by LocalFileAdapter,
   * so they won't pick up changes to this adapter until regenerated.
   *
   * Pass `setNames` (set-code→full-name, from fetchScryfallSetNames) so cards store
   * the full set TEXT ("Secret Lair Drop") rather than the code ("SLD"). To fix the
   * set field on already-generated files without a full regenerate, run
   * `npm run decks:backfill-set-names`.
   */
  convertMtgjsonToDeck(mtgjsonDeck: MtgjsonDeck, sourceFilePath: string, cardDatabase?: Map<string, MtgjsonCard>, setNames?: Map<string, string>): Deck {
    const data = mtgjsonDeck.data;

    // Build UUID map from deck cards + optional external database for back-face lookup
    const cardsByUuid = new Map<string, MtgjsonCard>();
    if (cardDatabase) {
      for (const [uuid, card] of cardDatabase) {
        cardsByUuid.set(uuid, card);
      }
    }
    // Deck cards override external database (they're more specific to this printing)
    const allCards = [...data.commander, ...data.mainBoard, ...(data.sideBoard || [])];
    for (const card of allCards) {
      cardsByUuid.set(card.uuid, card);
    }

    // Convert commanders (skip side "b" entries)
    const commanders: CardDefinition[] = data.commander
      .filter(card => card.side !== "b")
      .map(card => this.convertMtgjsonToCard(card, cardsByUuid, setNames));

    // Convert mainboard cards (respecting count for each card, skip side "b")
    const mainboardCards: CardDefinition[] = [];
    for (const card of data.mainBoard) {
      if (card.side === "b") continue;
      const cardDef = this.convertMtgjsonToCard(card, cardsByUuid, setNames);
      for (let i = 0; i < card.count; i++) {
        mainboardCards.push(cardDef);
      }
    }

    // Generate a numeric ID from deck name (simple hash)
    const deckId = this.generateDeckId(data.name);

    return {
      version: PERSISTED_DECK_VERSION,
      id: deckId,
      name: data.name,
      totalCards: commanders.length + mainboardCards.length,
      commanders,
      cards: mainboardCards,
      provenance: {
        retrievedDate: new Date(),
        sourceUrl: sourceFilePath,
        deckSource: "precon",
        createdAt: data.releaseDate ? new Date(data.releaseDate) : undefined,
      },
    };
  }

  private convertMtgjsonToCard(mtgjsonCard: MtgjsonCard, cardsByUuid: Map<string, MtgjsonCard>, setNames?: Map<string, string>): CardDefinition {
    // Determine if card is two-faced based on layout (drives the flip button)
    const twoFaced = isDoubleSidedLayout(mtgjsonCard.layout);

    // cardTypes is the union of every face's/part's types. Resolve other faces
    // (back of a DFC, the other half of a split/adventure) via otherFaceIds.
    const otherFaces = (mtgjsonCard.otherFaceIds || [])
      .map(id => cardsByUuid.get(id))
      .filter((c): c is MtgjsonCard => c !== undefined);

    // A genuinely double-sided card whose back can't be resolved means the
    // AllIdentifiers database wasn't provided -- fail loudly so we don't ship
    // decks with incomplete type grouping.
    if (twoFaced && mtgjsonCard.otherFaceIds?.length && otherFaces.length === 0) {
      throw new Error(
        `Two-faced card "${mtgjsonCard.name}" (uuid: ${mtgjsonCard.uuid}) has otherFaceIds ${JSON.stringify(mtgjsonCard.otherFaceIds)} but no other face found. Provide a cardDatabase with the missing UUIDs.`
      );
    }

    const cardTypes = [...new Set([mtgjsonCard, ...otherFaces].flatMap(c => c.types || []))];

    const cardDefinition: CardDefinition = {
      name: mtgjsonCard.name,
      scryfallId: mtgjsonCard.identifiers.scryfallId || "",
      multiverseid: mtgjsonCard.identifiers.multiverseId
        ? parseInt(mtgjsonCard.identifiers.multiverseId, 10)
        : undefined,
      twoFaced,
      oracleCardName: mtgjsonCard.name,
      colorIdentity: mtgjsonCard.colorIdentity || [],
      // Prefer the full set name (e.g. "Secret Lair Drop") for display; fall back
      // to the raw set code if Scryfall didn't have it.
      set: setNames?.get(mtgjsonCard.setCode) ?? mtgjsonCard.setCode,
      cardTypes,
    };

    return cardDefinition;
  }

  /**
   * Generate a numeric ID from deck name using a simple hash function
   */
  private generateDeckId(deckName: string): number {
    let hash = 0;
    for (let i = 0; i < deckName.length; i++) {
      const char = deckName.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    // Ensure positive integer
    return Math.abs(hash);
  }
}
