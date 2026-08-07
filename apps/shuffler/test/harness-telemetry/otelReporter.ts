/**
 * A Playwright reporter that traces the verify suite itself.
 *
 * Why the reporter is the only emitter: with `workers: 1`, everything
 * interesting is already visible from here. Playwright hands the reporter each
 * test's start time, duration, and full step tree — which includes every
 * `page.goto`, every `waitForTimeout`, and every auto-retrying assertion. So
 * one process owns one tracer provider and one flush, no spec file changes, and
 * no per-worker provider lifecycle to get wrong.
 *
 * Spans are built at the very end from recorded timestamps rather than held
 * open across hooks, which is why `spanPlan.ts` can be pure and tested.
 *
 * Nothing in here may change the suite's exit code. A telemetry failure prints
 * one line and the test result stands.
 */
import type { FullConfig, FullResult, Reporter, TestCase, TestResult, TestStep } from "@playwright/test/reporter";
import { Attributes } from "@opentelemetry/api";
import { startHarnessTracing, HarnessTracing, HARNESS_SERVICE_NAME } from "./harnessTracing.js";
import { planRun, StepEntry, TestEntry } from "./spanPlan.js";

/** An expect faster than this becomes attributes on its test, not a span. */
const EXPECT_THRESHOLD_MS = 100;

/** How long we'll wait for the exporter before giving up on the telemetry. */
const FLUSH_TIMEOUT_MS = 10_000;

function envNumber(name: string): number | undefined {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return undefined;
  const value = Number(raw);
  // NaN would sail straight through to a span with nonsense timestamps.
  return Number.isFinite(value) ? value : undefined;
}

function toStepEntry(step: TestStep): StepEntry {
  return {
    title: step.title,
    category: step.category,
    startTimeMs: step.startTime.getTime(),
    durationMs: step.duration,
    children: step.steps.map(toStepEntry),
    error: step.error?.message,
  };
}

function toTestEntry(test: TestCase, result: TestResult): TestEntry {
  return {
    specFile: test.location.file,
    title: test.title,
    startTimeMs: result.startTime.getTime(),
    durationMs: result.duration,
    status: result.status,
    retry: result.retry,
    steps: result.steps.map(toStepEntry),
  };
}

export default class OtelReporter implements Reporter {
  private tracing: HarnessTracing | null = null;
  private readonly tests: TestEntry[] = [];
  private playwrightStartMs = Date.now();
  private readonly runId: string;
  private runAttributes: Attributes = {};

  constructor() {
    // verify.sh mints the run id so it can echo it before the suite starts; a
    // bare `npx playwright test` gets one from here.
    this.runId = process.env.VERIFY_RUN_ID?.trim() || `local-${Date.now()}`;
  }

  printsToStdio(): boolean {
    // The `list` reporter owns the terminal; we print one line at the end.
    return false;
  }

  onBegin(_config: FullConfig): void {
    this.playwrightStartMs = Date.now();
    try {
      const runAttributes: Attributes = {
        "verify.run.id": this.runId,
        "verify.ship": process.env.VERIFY_SHIP?.trim() || "shuffler",
      };
      const gitSha = process.env.VERIFY_GIT_SHA?.trim();
      if (gitSha) runAttributes["verify.git.sha"] = gitSha;

      // The cold-vs-warm condition, measured by verify.sh BEFORE the server
      // booted (it creates data.db, after which the question is unanswerable).
      // On every span, not just the root: "how much of a run is fixed sleeps"
      // is only a fair question once it can be asked per condition.
      const dbExisted = process.env.VERIFY_DATA_DB_EXISTED?.trim();
      if (dbExisted) runAttributes["verify.data_db.existed"] = dbExisted === "true";
      const dbBytes = envNumber("VERIFY_DATA_DB_BYTES");
      if (dbBytes !== undefined) runAttributes["verify.data_db.bytes"] = dbBytes;

      this.runAttributes = runAttributes;
      this.tracing = startHarnessTracing(process.env, { runAttributes, serviceVersion: gitSha });
    } catch (error) {
      console.log(`verify telemetry: not starting (${error})`);
      this.tracing = null;
    }
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    if (!this.tracing) return;
    try {
      this.tests.push(toTestEntry(test, result));
    } catch (error) {
      console.log(`verify telemetry: dropped a test's spans (${error})`);
    }
  }

  async onEnd(_result: FullResult): Promise<void> {
    const tracing = this.tracing;
    if (!tracing) return;

    try {
      const root = planRun({
        nowMs: Date.now(),
        playwrightStartMs: this.playwrightStartMs,
        playwrightEndMs: Date.now(),
        runAttributes: this.runAttributes,
        shellPhases: {
          scriptStartMs: envNumber("VERIFY_SCRIPT_START_MS"),
          buildStartMs: envNumber("VERIFY_BUILD_START_MS"),
          buildEndMs: envNumber("VERIFY_BUILD_END_MS"),
          serverStartMs: envNumber("VERIFY_SERVER_START_MS"),
          serverReadyMs: envNumber("VERIFY_SERVER_READY_MS"),
        },
        tests: this.tests,
        expectThresholdMs: EXPECT_THRESHOLD_MS,
      });

      const emitted = tracing.emit(root);
      await tracing.shutdown(FLUSH_TIMEOUT_MS);
      console.log(`verify telemetry: ${emitted} spans → ${HARNESS_SERVICE_NAME} (run ${this.runId})`);
    } catch (error) {
      // Never fatal. The suite's result is the suite's result.
      console.log(`verify telemetry: failed to report this run (${error})`);
    }
  }
}
