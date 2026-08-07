/**
 * What spans a verify run should produce — as a pure data transformation.
 *
 * The Playwright reporter (`otelReporter.ts`) collects plain entries as tests
 * finish, hands them here once at the end, and emits whatever tree comes back.
 * Every span carries explicit start/end times, so nothing has to be held open
 * across Playwright's hooks and none of the interesting decisions need a
 * browser to test. `spanPlan.test.ts` is where those decisions are pinned down.
 */
import type { Attributes } from "@opentelemetry/api";

export interface SpanNode {
  name: string;
  /** Epoch millis. OTel accepts a bare number and reads it as millis. */
  startTimeMs: number;
  endTimeMs: number;
  attributes: Attributes;
  children: SpanNode[];
  /** Set the span's status to ERROR. */
  error?: boolean;
}

export interface StepEntry {
  title: string;
  /** Playwright's step category: "pw:api", "expect", "hook", "test.step". */
  category: string;
  startTimeMs: number;
  /** Playwright reports -1 for a step that never finished. */
  durationMs: number;
  children: StepEntry[];
  error?: string;
}

export interface TestEntry {
  specFile: string;
  title: string;
  startTimeMs: number;
  durationMs: number;
  status: string;
  retry: number;
  steps: StepEntry[];
}

/**
 * Phase boundaries measured by `verify.sh`, in epoch millis. All optional: a
 * bare `npx playwright test` has none of them, and a missing phase means the
 * span is skipped rather than emitted with a nonsense timestamp.
 */
export interface ShellPhases {
  scriptStartMs?: number;
  buildStartMs?: number;
  buildEndMs?: number;
  serverStartMs?: number;
  serverReadyMs?: number;
}

export interface RunInput {
  nowMs: number;
  playwrightStartMs: number;
  playwrightEndMs: number;
  runAttributes: Attributes;
  shellPhases: ShellPhases;
  tests: TestEntry[];
  /** An expect below this duration becomes attributes, not a span. */
  expectThresholdMs: number;
}

/**
 * How far from `now` a shell timestamp may sit and still be believed.
 *
 * OTel takes a bare number as epoch MILLIS and validates nothing: seconds
 * yields a span in 1970, nanoseconds one in the year 55000, and the exporter
 * ships either without complaint. A verify run lasts minutes, so anything
 * outside a day of now is a units bug, not a slow build.
 */
const PLAUSIBLE_WINDOW_MS = 24 * 60 * 60 * 1000;

function isPlausible(timestampMs: number | undefined, nowMs: number): timestampMs is number {
  if (timestampMs === undefined || !Number.isFinite(timestampMs)) return false;
  return Math.abs(timestampMs - nowMs) < PLAUSIBLE_WINDOW_MS;
}

/**
 * A span for a shell phase, or nothing at all. Silence beats a span in 1970:
 * a missing phase is normal (a bare `npx playwright test`), and an implausible
 * one is a units bug that would otherwise be invisible.
 */
function synthesizePhase(name: string, startMs: number | undefined, endMs: number | undefined, nowMs: number): SpanNode | undefined {
  if (!isPlausible(startMs, nowMs) || !isPlausible(endMs, nowMs)) return undefined;
  if (endMs < startMs) return undefined;
  return { name, startTimeMs: startMs, endTimeMs: endMs, attributes: {}, children: [] };
}

/**
 * "page.goto(http://localhost:20481/prepare?deck=7)" -> "page.goto".
 *
 * Playwright puts the arguments in the step title, which would make every
 * navigation its own span name — and the questions this instrumentation exists
 * to answer ("how much of a run is fixed sleeps") are aggregates grouped by
 * name. The full title survives as an attribute.
 */
export function normalizeStepName(title: string): string {
  const withoutArgs = title.split("(")[0].trim();
  return withoutArgs === "" ? "step" : withoutArgs;
}

interface StepPlan {
  spans: SpanNode[];
  expectCount: number;
  expectTotalMs: number;
  expectSuppressed: number;
}

function planSteps(steps: StepEntry[], input: RunInput): StepPlan {
  const plan: StepPlan = { spans: [], expectCount: 0, expectTotalMs: 0, expectSuppressed: 0 };

  for (const step of steps) {
    const isExpect = step.category === "expect";
    if (isExpect) {
      plan.expectCount += 1;
      plan.expectTotalMs += Math.max(0, step.durationMs);
    }

    // A step that never finished has no duration to report.
    if (step.durationMs < 0) continue;

    const nested = planSteps(step.children, input);
    plan.expectCount += nested.expectCount;
    plan.expectTotalMs += nested.expectTotalMs;
    plan.expectSuppressed += nested.expectSuppressed;

    // Fast assertions become attributes, not spans. An expect that resolved in
    // 3ms hid no time by definition, and at 51 tests the fast ones are most of
    // the span volume in the environment.
    if (isExpect && step.durationMs < input.expectThresholdMs) {
      plan.expectSuppressed += 1;
      continue;
    }

    const attributes: Attributes = {
      "playwright.step.title": step.title,
      "playwright.step.category": step.category,
    };
    if (step.error) attributes["playwright.step.error"] = step.error;

    plan.spans.push({
      name: `step: ${normalizeStepName(step.title)}`,
      startTimeMs: step.startTimeMs,
      endTimeMs: step.startTimeMs + step.durationMs,
      attributes,
      children: nested.spans,
      error: step.error ? true : undefined,
    });
  }

  return plan;
}

function planTest(test: TestEntry, input: RunInput): SpanNode {
  const steps = planSteps(test.steps, input);
  const failed = test.status !== "passed" && test.status !== "skipped";

  return {
    name: `test: ${test.title}`,
    startTimeMs: test.startTimeMs,
    endTimeMs: test.startTimeMs + Math.max(0, test.durationMs),
    attributes: {
      "test.title": test.title,
      "test.spec": specName(test.specFile),
      "test.status": test.status,
      "test.retry": test.retry,
      "test.expect.count": steps.expectCount,
      "test.expect.total_ms": steps.expectTotalMs,
      "test.expect.suppressed_count": steps.expectSuppressed,
    },
    children: steps.spans,
    error: failed ? true : undefined,
  };
}

/** "verify-mulligan.spec.ts" -> "verify-mulligan" */
function specName(specFile: string): string {
  const base = specFile.split("/").pop() ?? specFile;
  return base.replace(/\.spec\.ts$/, "");
}

function planSpec(specFile: string, tests: TestEntry[], input: RunInput): SpanNode {
  const testSpans = tests.map((test) => planTest(test, input));
  const failed = testSpans.filter((span) => span.error).length;

  return {
    name: `spec: ${specName(specFile)}`,
    startTimeMs: Math.min(...testSpans.map((span) => span.startTimeMs)),
    endTimeMs: Math.max(...testSpans.map((span) => span.endTimeMs)),
    attributes: {
      "test.spec": specName(specFile),
      "spec.test.count": tests.length,
      "spec.test.failed": failed,
    },
    children: testSpans,
    error: failed > 0 ? true : undefined,
  };
}

export function countSpans(node: SpanNode): number {
  return 1 + node.children.reduce((total, child) => total + countSpans(child), 0);
}

export function planRun(input: RunInput): SpanNode {
  const { shellPhases: phases, nowMs } = input;

  const synthetic = [
    synthesizePhase("verify build", phases.buildStartMs, phases.buildEndMs, nowMs),
    synthesizePhase("verify server boot", phases.serverStartMs, phases.serverReadyMs, nowMs),
  ].filter((span): span is SpanNode => span !== undefined);

  // Group by spec file, preserving the order the specs ran in.
  const bySpec = new Map<string, TestEntry[]>();
  for (const test of input.tests) {
    const existing = bySpec.get(test.specFile);
    if (existing) existing.push(test);
    else bySpec.set(test.specFile, [test]);
  }
  const specSpans = [...bySpec.entries()].map(([specFile, tests]) => planSpec(specFile, tests, input));

  const failedTests = input.tests.filter((test) => test.status !== "passed" && test.status !== "skipped").length;

  // The root covers the whole SCRIPT, not just Playwright — the build and the
  // server boot happen before Playwright starts, and they are part of what
  // "the suite takes 4 minutes" means.
  const startTimeMs = isPlausible(phases.scriptStartMs, nowMs) ? phases.scriptStartMs : input.playwrightStartMs;

  const root: SpanNode = {
    name: "verify run",
    startTimeMs,
    endTimeMs: input.playwrightEndMs,
    attributes: {
      ...input.runAttributes,
      "verify.test.count": input.tests.length,
      "verify.test.failed": failedTests,
      "verify.spec.count": specSpans.length,
      "verify.expect.threshold_ms": input.expectThresholdMs,
    },
    children: [...synthetic, ...specSpans],
    error: failedTests > 0 ? true : undefined,
  };

  // Emitted-span volume, so the run reports its own cost rather than us
  // guessing at it. Counted before the attribute exists, hence the +1 is
  // already included: countSpans walks the finished tree.
  root.attributes["verify.span.count"] = countSpans(root);

  return root;
}
