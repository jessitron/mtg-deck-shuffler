import { readFileSync } from "node:fs";
import path from "node:path";
import { Ajv2020, ValidateFunction } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

// No `import.meta.url` here (unlike the Tabletop's `src/server/contractValidation.ts`) —
// ts-jest's ESM transform can't resolve it reliably, and this file is reached transitively
// by `test/port-spine/spineSubscriber.test.ts` (see `test/port-spine/contractValidation.ts`
// for the same workaround). `process.cwd()` is `apps/shuffler/` for every way this process
// starts locally (jest, `./run`, `npm start`) — but the Docker image flattens the workspace
// to `/app` (see Dockerfile), where that relative walk no longer reaches `contracts/`, so
// `CONTRACTS_DIR` overrides it there, mirroring the Spine's own `CONTRACTS_DIR`
// (`services/spine/lib/event_contract.rb`).
const CONTRACTS_ROOT = process.env.CONTRACTS_DIR || path.join(process.cwd(), "..", "..", "contracts");

function loadSchema(relativePath: string): object {
  return JSON.parse(readFileSync(path.join(CONTRACTS_ROOT, relativePath), "utf8"));
}

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

const validateEnvelopeSchema = ajv.compile(loadSchema("envelope.v1.json"));

const payloadValidators: Record<string, ValidateFunction> = {
  "card.returned:1": ajv.compile(loadSchema("payloads/card.returned.v1.json")),
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

/**
 * Validates an event arriving over the Spine SSE subscription, mirroring the
 * Tabletop's own `src/server/contractValidation.ts` — this ship's first consumer of
 * events it didn't itself send, so this is its first gate against the committed
 * contracts on the way in rather than only on the way out (`test/port-spine/contractValidation.ts`).
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
