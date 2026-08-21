import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import path from "node:path";
import { Ajv2020, ValidateFunction } from "ajv/dist/2020.js";

const addFormats: (ajv: Ajv2020) => void = createRequire(import.meta.url)("ajv-formats");


const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTRACTS_ROOT = path.join(__dirname, "..", "..", "..", "..", "contracts");

function loadSchema(relativePath: string): object {
  return JSON.parse(readFileSync(path.join(CONTRACTS_ROOT, relativePath), "utf8"));
}

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

const validateEnvelopeSchema = ajv.compile(loadSchema("envelope.v1.json"));

const payloadValidators: Record<string, ValidateFunction> = {
  "card.played:1": ajv.compile(loadSchema("payloads/card.played.v1.json")),
  "card.played-face-down:1": ajv.compile(loadSchema("payloads/card.played-face-down.v1.json")),
  "seat.joined:1": ajv.compile(loadSchema("payloads/seat.joined.v1.json")),
};

export interface Initiator {
  seatId?: string;
  playerName: string;
}

export interface Envelope<Payload> {
  id: string;
  tableId: string;
  name: string;
  initiator: Initiator;
  occurredIn: string;
  origin: string;
  significance: "physical" | "domain" | "administrative";
  occurredAt?: string;
  traceparent?: string;
  schemaVersion: number;
  payload: Payload;
}

export type ValidationResult<Payload> = { ok: true; envelope: Envelope<Payload> } | { ok: false; error: string };

export function validateIncomingEvent<Payload>(body: unknown, expectedName: string): ValidationResult<Payload> {
  if (!validateEnvelopeSchema(body)) {
    return { ok: false, error: `invalid envelope: ${ajv.errorsText(validateEnvelopeSchema.errors)}` };
  }
  const envelope = body as Envelope<Payload>;
  if (envelope.name !== expectedName) {
    return { ok: false, error: `unknown event name: expected "${expectedName}", got "${envelope.name}"` };
  }
  const payloadValidator = payloadValidators[`${envelope.name}:${envelope.schemaVersion}`];
  if (!payloadValidator) {
    return { ok: false, error: `unknown schemaVersion ${envelope.schemaVersion} for "${envelope.name}"` };
  }
  if (!payloadValidator(envelope.payload)) {
    return { ok: false, error: `invalid payload: ${ajv.errorsText(payloadValidator.errors)}` };
  }
  return { ok: true, envelope };
}
