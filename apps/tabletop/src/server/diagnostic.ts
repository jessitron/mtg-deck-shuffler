import { Request, Response } from "express";
import { trace, SpanKind } from "@opentelemetry/api";
import { slugifyTableName, tableNameFromSlug } from "../shared/slugify.js";

const tracer = trace.getTracer("mtg-tabletop");

/**
 * The diagnostic button's server leg (tabletop-persists-physical-events ticket 01) — a
 * player's "something looks wrong" report. The incoming `traceparent` header is extracted
 * automatically by `@opentelemetry/auto-instrumentations-node`'s HTTP/Express
 * instrumentation, same as every other POST route in this ship, so the span minted here
 * nests under the client's click span with no manual extraction needed.
 *
 * The actual diff — a projection of the Spine's event log compared against a snapshot of
 * the live tldraw room — depends on the server retaining the event log, which follows a
 * port extraction that hasn't happened yet (see `notes/DESIGN-spine-projection.md`, "The
 * diff runs on the server"). This span carries no automated findings yet — the only
 * content it records is whatever free-text `message` the player typed into the button's
 * popover, stamped as `diagnostic.message` for someone to read in Honeycomb.
 */
export async function handleDiagnostic(req: Request, res: Response): Promise<void> {
  const tableName = slugifyTableName(req.params.tableName ?? "");
  if (!tableName) {
    trace.getActiveSpan()?.setAttributes({
      "diagnostic.rejected": "table-name-required",
      "request.params.tableName": req.params.tableName ?? "",
    });
    res.status(400).json({ error: "table name required" });
    return;
  }

  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";

  trace.getActiveSpan()?.setAttributes({
    "table.name": tableNameFromSlug(tableName),
    "table.slug": tableName,
    ...(message ? { "diagnostic.message": message } : {}),
  });

  await tracer.startActiveSpan(
    "diagnostic: diff projection vs live table",
    {
      kind: SpanKind.INTERNAL,
      attributes: {
        "table.name": tableNameFromSlug(tableName),
        "table.slug": tableName,
        "diagnostic.implemented": false,
      },
    },
    async (span) => {
      try {
        // Not implemented yet — see the doc comment above.
      } finally {
        span.end();
      }
    }
  );

  res.status(202).json({ ok: true, implemented: false });
}
