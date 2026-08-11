import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { context, trace, TraceFlags } from "@opentelemetry/api";
import { logs, SeverityNumber } from "@opentelemetry/api-logs";
import { LoggerProvider, InMemoryLogRecordExporter, SimpleLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { BasicTracerProvider } from "@opentelemetry/sdk-trace-base";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import { log } from "../src/server/log";


let exported: InMemoryLogRecordExporter;

beforeEach(() => {
  exported = new InMemoryLogRecordExporter();
  logs.setGlobalLoggerProvider(new LoggerProvider({ processors: [new SimpleLogRecordProcessor({ exporter: exported })] }));

  context.setGlobalContextManager(new AsyncLocalStorageContextManager().enable());
});

afterEach(() => {
  logs.disable();
  context.disable();
});

describe("log", () => {
  it("emits with no active span — the pruneSessions callback case", () => {
    log.info("room emptied", { "room.name": "kitchen-table" });

    const records = exported.getFinishedLogRecords();
    expect(records).toHaveLength(1);
    expect(records[0].body).toBe("room emptied");
    expect(records[0].attributes).toMatchObject({ "room.name": "kitchen-table" });
    expect(records[0].spanContext).toBeUndefined();
  });

  it("carries the active span's trace and span ids", () => {
    const span = new BasicTracerProvider().getTracer("test").startSpan("ws connect");

    context.with(trace.setSpan(context.active(), span), () => {
      log.info("room created", { "room.name": "kitchen-table" });
    });
    span.end();

    const [record] = exported.getFinishedLogRecords();
    expect(record.spanContext?.traceId).toBe(span.spanContext().traceId);
    expect(record.spanContext?.spanId).toBe(span.spanContext().spanId);
  });

  it("emits under an unsampled span — logs are independent of trace sampling", () => {
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

  it("carries severity", () => {
    log.info("a");
    log.warn("b");
    log.error("c");

    expect(exported.getFinishedLogRecords().map(r => r.severityNumber)).toEqual([
      SeverityNumber.INFO,
      SeverityNumber.WARN,
      SeverityNumber.ERROR,
    ]);
  });

  it("records an Error as exception attributes, not stringified into the message", () => {
    log.error("card arrival failed", { "table.name": "kitchen-table" }, new Error("no free row"));

    const [record] = exported.getFinishedLogRecords();
    expect(record.body).toBe("card arrival failed");
    expect(record.attributes).toMatchObject({
      "table.name": "kitchen-table",
      "exception.type": "Error",
      "exception.message": "no free row",
    });
  });
});
