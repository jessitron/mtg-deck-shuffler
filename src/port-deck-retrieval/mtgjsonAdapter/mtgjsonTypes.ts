// MTGJSON preconstructed deck format types
// Based on https://mtgjson.com/data-models/deck/

export interface MtgjsonCard {
  name: string;
  uuid: string;
  count: number;
  layout: string;
  colorIdentity?: string[];
  setCode: string;
  identifiers: {
    scryfallId?: string;
    multiverseId?: string;
    [key: string]: any;
  };
  [key: string]: any; // Other card properties we don't need
}

export interface MtgjsonDeckData {
  name: string;
  code: string;
  type: string;
  releaseDate: string;
  commander: MtgjsonCard[];
  displayCommander?: MtgjsonCard[];
  mainBoard: MtgjsonCard[];
  sideBoard?: MtgjsonCard[];
  [key: string]: any; // Other properties we don't need
}

export interface MtgjsonDeck {
  meta: {
    date: string;
    version: string;
  };
  data: MtgjsonDeckData;
}
