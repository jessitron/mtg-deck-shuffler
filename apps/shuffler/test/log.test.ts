import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { context, trace, TraceFlags } from "@opentelemetry/api";
import { logs, SeverityNumber } from "@opentelemetry/api-logs";
import { LoggerProvider, InMemoryLogRecordExporter, SimpleLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { BasicTracerProvider } from "@opentelemetry/sdk-trace-base";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import { log } from "../src/log.js";


let exported: InMemoryLogRecordExporter;

beforeEach(() => {
  exported = new InMemoryLogRecordExporter();
  const provider = new LoggerProvider({
    processors: [new SimpleLogRecordProcessor({ exporter: exported })],
  });
  logs.setGlobalLoggerProvider(provider);

  context.setGlobalContextManager(new AsyncLocalStorageContextManager().enable());
});

afterEach(() => {
  logs.disable();
  context.disable();
});

describe("log", () => {
  test("with no active span, the record is still emitted", () => {
    log.error("room emptied", { "room.name": "kitchen-table" });

    const records = exported.getFinishedLogRecords();
    expect(records).toHaveLength(1);
    expect(records[0].body).toBe("room emptied");
    expect(records[0].attributes).toMatchObject({ "room.name": "kitchen-table" });
    expect(records[0].spanContext).toBeUndefined();
  });

  test("inside a span, the record carries that span's trace and span ids", () => {
    const tracer = new BasicTracerProvider().getTracer("test");
    const span = tracer.startSpan("a request");

    context.with(trace.setSpan(context.active(), span), () => {
      log.error("deck fetch failed", { "deck.source": "archidekt" });
    });
    span.end();

    const records = exported.getFinishedLogRecords();
    expect(records).toHaveLength(1);
    expect(records[0].spanContext?.traceId).toBe(span.spanContext().traceId);
    expect(records[0].spanContext?.spanId).toBe(span.spanContext().spanId);
  });

  test("a log under an unsampled span is still emitted", () => {
    const unsampled = trace.wrapSpanContext({
      traceId: "0af7651916cd43dd8448eb211c80319c",
      spanId: "b7ad6b7169203331",
      traceFlags: TraceFlags.NONE,
    });

    context.with(trace.setSpan(context.active(), unsampled), () => {
      log.warn("health check failing");
    });

    expect(exported.getFinishedLogRecords()).toHaveLength(1);
  });

  test("severity travels with the record", () => {
    log.info("using SQLite persistence adapter");
    log.warn("prep has incompatible version");
    log.error("error starting game");

    expect(exported.getFinishedLogRecords().map(r => r.severityNumber)).toEqual([
      SeverityNumber.INFO,
      SeverityNumber.WARN,
      SeverityNumber.ERROR,
    ]);
  });

  test("an Error is recorded as exception attributes, not stringified into the message", () => {
    log.error("error loading game", { "game.id": "42" }, new Error("no such game"));

    const [record] = exported.getFinishedLogRecords();
    expect(record.body).toBe("error loading game");
    expect(record.attributes).toMatchObject({
      "game.id": "42",
      "exception.type": "Error",
      "exception.message": "no such game",
    });
    expect(record.attributes["exception.stacktrace"]).toEqual(expect.stringContaining("no such game"));
  });
});
