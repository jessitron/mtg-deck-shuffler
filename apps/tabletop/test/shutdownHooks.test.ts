import { describe, it, expect } from "vitest";
import { EventEmitter } from "node:events";
import { installShutdownHandlers } from "../src/server/shutdownHooks";

/** A real EventEmitter standing in for `process` — a fake, not a mock. */
function fakeSignalSource(): EventEmitter {
  return new EventEmitter();
}

describe("installShutdownHandlers", () => {
  it("drains then exits 0 on SIGTERM", async () => {
    const signalSource = fakeSignalSource();
    const exitCodes: number[] = [];
    let drained = false;

    installShutdownHandlers(
      async () => {
        drained = true;
      },
      { exit: (code) => exitCodes.push(code), signalSource, timeoutMs: 1000 }
    );

    signalSource.emit("SIGTERM");
    // Let the drain promise's .then chain run.
    await new Promise((resolve) => setImmediate(resolve));

    expect(drained).toBe(true);
    expect(exitCodes).toEqual([0]);
  });

  it("exits anyway, bounded by timeoutMs, when drain hangs, and reports the timeout", async () => {
    const signalSource = fakeSignalSource();
    const exitCodes: number[] = [];
    let timedOut = false;

    installShutdownHandlers(() => new Promise<void>(() => {}), {
      exit: (code) => exitCodes.push(code),
      onTimeout: () => {
        timedOut = true;
      },
      signalSource,
      timeoutMs: 20,
    });

    signalSource.emit("SIGTERM");
    expect(exitCodes).toEqual([]);

    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(exitCodes).toEqual([0]);
    expect(timedOut).toBe(true);
  });

  it("exits anyway when drain rejects, and reports the error", async () => {
    const signalSource = fakeSignalSource();
    const exitCodes: number[] = [];
    const drainErrors: unknown[] = [];
    const thrown = new Error("exporter threw");

    installShutdownHandlers(() => Promise.reject(thrown), {
      exit: (code) => exitCodes.push(code),
      onDrainError: (error) => drainErrors.push(error),
      signalSource,
      timeoutMs: 1000,
    });

    signalSource.emit("SIGTERM");
    await new Promise((resolve) => setImmediate(resolve));

    expect(exitCodes).toEqual([0]);
    expect(drainErrors).toEqual([thrown]);
  });

  it("only drains and exits once if both signals fire", async () => {
    const signalSource = fakeSignalSource();
    const exitCodes: number[] = [];
    let drainCalls = 0;

    installShutdownHandlers(
      async () => {
        drainCalls++;
      },
      { exit: (code) => exitCodes.push(code), signalSource, timeoutMs: 1000 }
    );

    signalSource.emit("SIGTERM");
    signalSource.emit("SIGINT");
    await new Promise((resolve) => setImmediate(resolve));

    expect(drainCalls).toBe(1);
    expect(exitCodes).toEqual([0]);
  });

  it("reacts to SIGINT too", async () => {
    const signalSource = fakeSignalSource();
    const exitCodes: number[] = [];

    installShutdownHandlers(async () => {}, { exit: (code) => exitCodes.push(code), signalSource, timeoutMs: 1000 });

    signalSource.emit("SIGINT");
    await new Promise((resolve) => setImmediate(resolve));

    expect(exitCodes).toEqual([0]);
  });
});
