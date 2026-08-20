import { readFileSync } from "node:fs";
import path from "node:path";
import { Ajv2020, ValidateFunction } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

// jest always runs with cwd = apps/shuffler (the workspace package dir, whether invoked
// directly or via the root's `npm test` passthrough), so this is stable without
// import.meta.url — which ts-jest's ESM transform can't resolve reliably here.
const CONTRACTS_ROOT = path.join(process.cwd(), "..", "..", "contracts");

function loadSchema(relativePath: string): object {
  return JSON.parse(readFileSync(path.join(CONTRACTS_ROOT, relativePath), "utf8"));
}

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

const validateEnvelopeSchema = ajv.compile(loadSchema("envelope.v1.json"));

const payloadValidators: Record<string, ValidateFunction> = {
  "card.played:1": ajv.compile(loadSchema("payloads/card.played.v1.json")),
  "card.returned:1": ajv.compile(loadSchema("payloads/card.returned.v1.json")),
};

/**
 * Mirrors the Spine's own gate (the Tabletop's `contractValidation.ts` does the same
 * thing): validate an outbound envelope + its kind-specific payload against the
 * committed contracts, so a Shuffler-side event that would fail the Spine's real
 * validation fails here instead.
 */
export function assertValidatesAsSpineEvent(event: unknown): void {
  if (!validateEnvelopeSchema(event)) {
    throw new Error(`invalid envelope: ${ajv.errorsText(validateEnvelopeSchema.errors)}`);
  }
  const { name, schemaVersion, payload } = event as { name: string; schemaVersion: number; payload: unknown };
  const payloadValidator = payloadValidators[`${name}:${schemaVersion}`];
  if (!payloadValidator) {
    throw new Error(`no contract test coverage for "${name}" schemaVersion ${schemaVersion}`);
  }
  if (!payloadValidator(payload)) {
    throw new Error(`invalid payload: ${ajv.errorsText(payloadValidator.errors)}`);
  }
}
