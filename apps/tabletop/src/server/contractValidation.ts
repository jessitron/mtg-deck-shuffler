import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import path from "node:path";
import { Ajv2020, ValidateFunction } from "ajv/dist/2020.js";

// ajv-formats' .d.ts default-exports a CJS module with no "exports" map in
// its package.json — under this project's moduleResolution (NodeNext), a
// static `import addFormats from "ajv-formats"` type-checks to the whole
// module namespace instead of the plugin function. `require` sidesteps that
// entirely; the runtime value is identical either way.
const addFormats: (ajv: Ajv2020) => void = createRequire(import.meta.url)("ajv-formats");

// ============================================================================
// JES-128 / tabletop-cards-come-and-go ticket 05: real contract validation,
// replacing the hand-rolled if-chains. Both endpoints POST the full envelope
// (contracts/envelope.v2.json) as their body, with the kind-specific payload
// nested at `.payload` per the envelope's own `payload` field — see
// contracts/README.md.
//
// This is the Tabletop's copy of contracts/, read at runtime relative to this
// module's own location (works identically from src/ in dev/test and from
// dist/ in prod, since both sit at the same depth under apps/tabletop/) — see
// the Dockerfile for the matching COPY that makes this resolve in the
// container too.
// ============================================================================

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTRACTS_ROOT = path.join(__dirname, "..", "..", "..", "..", "contracts");

function loadSchema(relativePath: string): object {
  return JSON.parse(readFileSync(path.join(CONTRACTS_ROOT, relativePath), "utf8"));
}

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

const validateEnvelopeSchema = ajv.compile(loadSchema("envelope.v2.json"));

// Every payload schema this ship knows how to validate against, keyed by
// `${name}:${schemaVersion}`. An envelope naming any other key is rejected
// loudly (unknown name/version) rather than silently accepted or dropped.
const payloadValidators: Record<string, ValidateFunction> = {
  "card.played:1": ajv.compile(loadSchema("payloads/card.played.v1.json")),
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
  visibility: string;
  traceparent: string;
  schemaVersion: number;
  payload: Payload;
}

export type ValidationResult<Payload> = { ok: true; envelope: Envelope<Payload> } | { ok: false; error: string };

/**
 * Validate an incoming request body as a full envelope carrying `expectedName`'s
 * payload. Fails loudly (a clear error string, never a silent drop or best-effort
 * parse) on: a malformed envelope, a name other than `expectedName`, or a
 * schemaVersion this ship doesn't have a payload schema for.
 */
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
