import { describe, it, expect } from "vitest";
import { planRun, countSpans, normalizeStepName, RunInput, StepEntry, SpanNode } from "./spanPlan.js";

// A fixed "now" so the timestamp plausibility window is deterministic.
const NOW = 1770000000000; // some Saturday in 2026

function step(partial: Partial<StepEntry> & { title: string }): StepEntry {
  return {
    category: "pw:api",
    startTimeMs: NOW,
    durationMs: 10,
    children: [],
    ...partial,
  };
}

function minimalInput(partial: Partial<RunInput> = {}): RunInput {
  return {
    nowMs: NOW,
    playwrightStartMs: NOW,
    playwrightEndMs: NOW + 1000,
    runAttributes: { "verify.run.id": "run-1" },
    shellPhases: {},
    tests: [],
    expectThresholdMs: 100,
    ...partial,
  };
}

/** Find a span by name anywhere in the tree. */
function find(node: SpanNode, name: string): SpanNode | undefined {
  if (node.name === name) return node;
  for (const child of node.children) {
    const hit = find(child, name);
    if (hit) return hit;
  }
  return undefined;
}

function names(nodes: SpanNode[]): string[] {
  return nodes.map((n) => n.name);
}

describe("planRun — run shape", () => {
  it("roots the run at a single span covering the whole script", () => {
    const root = planRun(
      minimalInput({
        shellPhases: { scriptStartMs: NOW - 60_000 },
        playwrightEndMs: NOW + 5_000,
      })
    );

    expect(root.name).toBe("verify run");
    expect(root.startTimeMs).toBe(NOW - 60_000);
    expect(root.endTimeMs).toBe(NOW + 5_000);
  });

  it("falls back to Playwright's own start when the shell passed no timestamps", () => {
    const root = planRun(minimalInput({ playwrightStartMs: NOW + 7 }));
    expect(root.startTimeMs).toBe(NOW + 7);
  });

  it("puts the run attributes on the root", () => {
    const root = planRun(minimalInput({ runAttributes: { "verify.run.id": "abc", "verify.ship": "shuffler" } }));
    expect(root.attributes["verify.run.id"]).toBe("abc");
    expect(root.attributes["verify.ship"]).toBe("shuffler");
  });
});

describe("planRun — synthetic spans from shell timestamps", () => {
  it("synthesizes build and server-boot spans from the phase timestamps", () => {
    const root = planRun(
      minimalInput({
        shellPhases: {
          scriptStartMs: NOW - 60_000,
          buildStartMs: NOW - 59_000,
          buildEndMs: NOW - 20_000,
          serverStartMs: NOW - 19_000,
          serverReadyMs: NOW - 18_000,
        },
      })
    );

    const build = find(root, "verify build");
    expect(build).toBeDefined();
    expect(build!.startTimeMs).toBe(NOW - 59_000);
    expect(build!.endTimeMs).toBe(NOW - 20_000);

    const boot = find(root, "verify server boot");
    expect(boot!.startTimeMs).toBe(NOW - 19_000);
    expect(boot!.endTimeMs).toBe(NOW - 18_000);

    // Both hang directly off the root, in wall-clock order, before the specs.
    expect(names(root.children).slice(0, 2)).toEqual(["verify build", "verify server boot"]);
  });

  it("skips a synthetic span rather than emitting one with a missing timestamp", () => {
    const root = planRun(
      minimalInput({
        shellPhases: { buildStartMs: NOW - 1000 }, // no buildEndMs
      })
    );
    expect(find(root, "verify build")).toBeUndefined();
  });

  it("skips a synthetic span whose timestamps are implausible", () => {
    // Seconds instead of millis: OTel would happily emit a span in 1970.
    const asSeconds = Math.floor(NOW / 1000);
    const root = planRun(
      minimalInput({
        shellPhases: { buildStartMs: asSeconds, buildEndMs: asSeconds + 30 },
      })
    );
    expect(find(root, "verify build")).toBeUndefined();
  });

  it("skips a synthetic span whose timestamps are in nanoseconds", () => {
    const asNanos = NOW * 1_000_000;
    const root = planRun(minimalInput({ shellPhases: { buildStartMs: asNanos, buildEndMs: asNanos + 1000 } }));
    expect(find(root, "verify build")).toBeUndefined();
  });

  it("skips a synthetic span whose end precedes its start", () => {
    const root = planRun(minimalInput({ shellPhases: { buildStartMs: NOW, buildEndMs: NOW - 5000 } }));
    expect(find(root, "verify build")).toBeUndefined();
  });
});

describe("planRun — specs and tests", () => {
  const twoSpecs = [
    {
      specFile: "verify-mulligan.spec.ts",
      title: "keeps a hand",
      startTimeMs: NOW + 100,
      durationMs: 500,
      status: "passed",
      retry: 0,
      steps: [],
    },
    {
      specFile: "verify-mulligan.spec.ts",
      title: "mulligans once",
      startTimeMs: NOW + 700,
      durationMs: 900,
      status: "passed",
      retry: 0,
      steps: [],
    },
    {
      specFile: "verify-game-menu.spec.ts",
      title: "opens the menu",
      startTimeMs: NOW + 1700,
      durationMs: 300,
      status: "failed",
      retry: 1,
      steps: [],
    },
  ];

  it("groups tests under one span per spec file", () => {
    const root = planRun(minimalInput({ tests: twoSpecs }));

    const mulligan = find(root, "spec: verify-mulligan");
    expect(mulligan).toBeDefined();
    expect(names(mulligan!.children)).toEqual(["test: keeps a hand", "test: mulligans once"]);

    const menu = find(root, "spec: verify-game-menu");
    expect(names(menu!.children)).toEqual(["test: opens the menu"]);
  });

  it("spans a spec from its first test's start to its last test's end", () => {
    const root = planRun(minimalInput({ tests: twoSpecs }));
    const mulligan = find(root, "spec: verify-mulligan")!;
    expect(mulligan.startTimeMs).toBe(NOW + 100);
    expect(mulligan.endTimeMs).toBe(NOW + 700 + 900);
  });

  it("records status and retry on the test span, and marks failures as errors", () => {
    const root = planRun(minimalInput({ tests: twoSpecs }));

    const passed = find(root, "test: keeps a hand")!;
    expect(passed.attributes["test.status"]).toBe("passed");
    expect(passed.error).toBeFalsy();

    const failed = find(root, "test: opens the menu")!;
    expect(failed.attributes["test.status"]).toBe("failed");
    expect(failed.attributes["test.retry"]).toBe(1);
    expect(failed.error).toBe(true);
  });

  it("counts the suite on the root span", () => {
    const root = planRun(minimalInput({ tests: twoSpecs }));
    expect(root.attributes["verify.test.count"]).toBe(3);
    expect(root.attributes["verify.test.failed"]).toBe(1);
    expect(root.attributes["verify.spec.count"]).toBe(2);
  });
});

describe("planRun — steps", () => {
  function withSteps(steps: StepEntry[]) {
    return minimalInput({
      tests: [
        {
          specFile: "verify-mulligan.spec.ts",
          title: "a test",
          startTimeMs: NOW,
          durationMs: 5000,
          status: "passed",
          retry: 0,
          steps,
        },
      ],
    });
  }

  it("gives each step a span, nested the way Playwright nests them", () => {
    const root = planRun(
      withSteps([
        step({
          title: "outer",
          category: "test.step",
          children: [step({ title: "page.click(#go)" })],
        }),
      ])
    );

    const outer = find(root, "step: outer")!;
    expect(names(outer.children)).toEqual(["step: page.click"]);
  });

  it("strips arguments from the step name but keeps the full title as an attribute", () => {
    const root = planRun(withSteps([step({ title: "page.waitForTimeout(1800)" })]));

    const wait = find(root, "step: page.waitForTimeout")!;
    expect(wait.attributes["playwright.step.title"]).toBe("page.waitForTimeout(1800)");
    expect(wait.attributes["playwright.step.category"]).toBe("pw:api");
  });

  it("gives a span to a slow expect, because that is where invisible time hides", () => {
    const root = planRun(withSteps([step({ title: "expect.toBeVisible", category: "expect", durationMs: 4500 })]));
    expect(find(root, "step: expect.toBeVisible")).toBeDefined();
  });

  it("rolls fast expects into attributes instead of spans", () => {
    const root = planRun(
      withSteps([
        step({ title: "expect.toBeVisible", category: "expect", durationMs: 3 }),
        step({ title: "expect.toHaveText", category: "expect", durationMs: 7 }),
        step({ title: "expect.toBeVisible", category: "expect", durationMs: 4500 }),
      ])
    );

    const test = find(root, "test: a test")!;
    // All three counted...
    expect(test.attributes["test.expect.count"]).toBe(3);
    expect(test.attributes["test.expect.total_ms"]).toBe(4510);
    // ...but only the slow one got a span.
    expect(test.children.length).toBe(1);
    expect(test.attributes["test.expect.suppressed_count"]).toBe(2);
  });

  it("does not threshold non-expect steps, however fast", () => {
    const root = planRun(withSteps([step({ title: "page.click(#go)", durationMs: 1 })]));
    expect(find(root, "step: page.click")).toBeDefined();
  });

  it("skips a step that never finished rather than emitting a negative duration", () => {
    // Playwright reports duration -1 for a step that didn't complete.
    const root = planRun(withSteps([step({ title: "page.click(#go)", durationMs: -1 })]));
    expect(find(root, "step: page.click")).toBeUndefined();
  });

  it("marks a step that carries an error", () => {
    const root = planRun(withSteps([step({ title: "page.click(#go)", error: "locator not found" })]));
    const clicked = find(root, "step: page.click")!;
    expect(clicked.error).toBe(true);
    expect(clicked.attributes["playwright.step.error"]).toBe("locator not found");
  });
});

describe("countSpans", () => {
  it("counts every node in the tree, so the root can report the run's real volume", () => {
    const root = planRun(
      minimalInput({
        tests: [
          {
            specFile: "a.spec.ts",
            title: "t",
            startTimeMs: NOW,
            durationMs: 10,
            status: "passed",
            retry: 0,
            steps: [step({ title: "one", children: [step({ title: "two" })] })],
          },
        ],
      })
    );
    // root + spec + test + 2 steps
    expect(countSpans(root)).toBe(5);
    expect(root.attributes["verify.span.count"]).toBe(5);
  });
});

describe("normalizeStepName", () => {
  it("leaves Playwright's own prose titles alone", () => {
    expect(normalizeStepName("Wait for timeout")).toBe("Wait for timeout");
    expect(normalizeStepName('Expect "toHaveCSS" locator')).toBe('Expect "toHaveCSS" locator');
    expect(normalizeStepName("Launch browser")).toBe("Launch browser");
    expect(normalizeStepName('Navigate to "/choose-any-deck"')).toBe('Navigate to "/choose-any-deck"');
  });

  it("keeps the callable part and drops the arguments", () => {
    expect(normalizeStepName("page.goto(http://localhost:20481/prepare?deck=7)")).toBe("page.goto");
    expect(normalizeStepName("page.waitForTimeout(1800)")).toBe("page.waitForTimeout");
    expect(normalizeStepName("locator.click")).toBe("locator.click");
  });

  it("leaves a human-written test.step title alone", () => {
    expect(normalizeStepName("shuffle up and draw")).toBe("shuffle up and draw");
  });

  it("collapses nothing to a stable placeholder", () => {
    expect(normalizeStepName("")).toBe("step");
  });
});
