import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import * as path from "node:path";
import test from "node:test";
import fs from "fs-extra";
import { buildManifest, loadManifest, saveManifest } from "./manifest";
import {
  aggregateUsage,
  emptyUsageTotals,
  mergeRunUsage,
  parseUsageFromJsonl,
  resolvePriceForModel,
} from "./usage";
import {
  findPreviousHistoryRecord,
  gateAll,
  gateOne,
  gateResults,
  pendingGateRunIds,
} from "./gate";
import { collectPriorLaneUsage, estimateRun } from "./estimate";
import type { EvalsHistory, RunResults, SkillResult } from "./types";

function tokenCountLine(overrides: {
  input?: number;
  cached?: number;
  output?: number;
  reasoning?: number;
  total?: number;
}): string {
  return JSON.stringify({
    id: "sub-1",
    msg: {
      type: "token_count",
      info: {
        total_token_usage: {
          input_tokens: overrides.input ?? 0,
          cached_input_tokens: overrides.cached ?? 0,
          output_tokens: overrides.output ?? 0,
          reasoning_output_tokens: overrides.reasoning ?? 0,
          total_tokens:
            overrides.total ?? (overrides.input ?? 0) + (overrides.output ?? 0),
        },
        last_token_usage: {
          input_tokens: overrides.input ?? 0,
          cached_input_tokens: 0,
          output_tokens: overrides.output ?? 0,
          reasoning_output_tokens: 0,
          total_tokens: overrides.total ?? 0,
        },
        model_context_window: 200000,
      },
      rate_limits: null,
    },
  });
}

test("parses cumulative token usage from a synthetic codex exec --json event stream", () => {
  const jsonl = [
    tokenCountLine({ input: 100, output: 20, total: 120 }),
    tokenCountLine({
      input: 300,
      cached: 50,
      output: 60,
      reasoning: 10,
      total: 360,
    }),
  ].join("\n");
  const sample = parseUsageFromJsonl(jsonl, 4200);
  assert.deepEqual(sample, {
    promptTokens: 300,
    completionTokens: 60,
    cachedPromptTokens: 50,
    reasoningTokens: 10,
    wallMs: 4200,
  });
});

test("tolerantly fails open when the event stream is missing, empty, or malformed", () => {
  assert.equal(parseUsageFromJsonl("", 10), null);
  assert.equal(parseUsageFromJsonl("   \n  ", 10), null);
  assert.equal(
    parseUsageFromJsonl("not json\n{broken", 10),
    null,
    "unparseable lines never throw and never fabricate a value",
  );
  assert.equal(
    parseUsageFromJsonl(
      '{"id":"x","msg":{"type":"agent_message","message":"hi"}}',
      10,
    ),
    null,
    "streams with no token_count event report null, not a guess",
  );
  assert.equal(
    parseUsageFromJsonl(
      '{"id":"x","msg":{"type":"token_count","info":{"total_token_usage":{"input_tokens":"lots"}}}}',
      10,
    ),
    null,
    "non-numeric fields are rejected rather than coerced",
  );
});

test("aggregates usage samples into overall and per-arm totals, counting unmetered lanes", () => {
  const usage = aggregateUsage(
    [
      {
        arm: "baseline",
        usage: {
          promptTokens: 100,
          completionTokens: 20,
          cachedPromptTokens: 0,
          reasoningTokens: 0,
          wallMs: 500,
        },
      },
      {
        arm: "with-skill",
        usage: {
          promptTokens: 400,
          completionTokens: 80,
          cachedPromptTokens: 10,
          reasoningTokens: 5,
          wallMs: 700,
        },
      },
      { arm: "with-skill", usage: null },
    ],
    "unpriced-test-model",
  );
  assert.equal(usage.overall.lanesMetered, 2);
  assert.equal(usage.overall.lanesUnmetered, 1);
  assert.equal(usage.overall.totalTokens, 100 + 20 + 400 + 80);
  assert.equal(usage.byArm.baseline?.totalTokens, 120);
  assert.equal(usage.byArm["with-skill"]?.lanesMetered, 1);
  assert.equal(usage.byArm["with-skill"]?.lanesUnmetered, 1);
  assert.equal(usage.overall.estimatedUsd, null);
});

test("resolves a known model price case-insensitively and returns null for an unresolved model", () => {
  assert.equal(resolvePriceForModel("GPT-5"), 1.25);
  assert.equal(resolvePriceForModel("gpt-5"), 1.25);
  assert.equal(resolvePriceForModel("  gpt-5  "), 1.25);
  assert.equal(resolvePriceForModel("gpt-5.6-luna"), null);
  assert.equal(resolvePriceForModel("totally-unknown-model"), null);
});

test("merges cumulative usage across a resumed execution batch instead of overwriting it", () => {
  const first = aggregateUsage(
    [{ arm: "baseline", usage: { promptTokens: 100, completionTokens: 10, wallMs: 100 } }],
    "GPT-5",
  );
  const second = aggregateUsage(
    [{ arm: "baseline", usage: { promptTokens: 50, completionTokens: 5, wallMs: 50 } }],
    "GPT-5",
  );
  const merged = mergeRunUsage(undefined, first, "GPT-5");
  const final = mergeRunUsage(merged, second, "GPT-5");
  assert.equal(final.overall.promptTokens, 150);
  assert.equal(final.overall.completionTokens, 15);
  assert.equal(final.overall.lanesMetered, 2);
  assert.equal(final.byArm.baseline?.promptTokens, 150);
  assert.ok(typeof final.overall.estimatedUsd === "number");
});

function skillResult(overrides: Partial<SkillResult> = {}): SkillResult {
  return {
    category: "dart",
    skillName: "dart-tooling",
    guardrailApplicable: false,
    totalEvalCases: 1,
    baselinePassRate: 0.2,
    withSkillPassRate: 0.95,
    delta: 0.75,
    triggerPrecision: 1,
    casePassRate: { baseline: 0.2, withSkill: 0.95 },
    assertionPassRate: { baseline: 0.3, withSkill: 1 },
    triggerRecall: 1,
    triggerSpecificity: 1,
    balancedTriggerAccuracy: 1,
    scores: [],
    incompleteArms: [],
    ...overrides,
  };
}

function runResults(overrides: Partial<RunResults> = {}): RunResults {
  return {
    schemaVersion: 2,
    runId: "test-run",
    category: "dart",
    version: "1.0.0",
    scoredAt: "2026-06-01T00:00:00.000Z",
    metadata: {},
    compromisedSkills: [],
    skills: [skillResult()],
    ...overrides,
  };
}

test("gate passes a run whose skills clear every readiness threshold", () => {
  const history: EvalsHistory = { lastUpdated: "", records: [] };
  const outcome = gateResults(runResults(), history);
  assert.equal(outcome.ready, true);
  assert.equal(outcome.breachedCount, 0);
  assert.equal(outcome.trend.direction, "no-prior-data");
});

test("gate reports each skill breach with a specific failure reason", () => {
  const history: EvalsHistory = { lastUpdated: "", records: [] };
  const outcome = gateResults(
    runResults({
      skills: [
        skillResult({
          withSkillPassRate: 0.5,
          casePassRate: { baseline: 0.2, withSkill: 0.5 },
        }),
      ],
    }),
    history,
  );
  assert.equal(outcome.ready, false);
  assert.equal(outcome.breachedCount, 1);
  assert.match(
    outcome.breaches[0]?.failures.join(";") ?? "",
    /with-skill case pass must exceed 85%/,
  );
});

test("gate compares against the previous history record and reports trend direction", () => {
  const history: EvalsHistory = {
    lastUpdated: "",
    records: [
      {
        runId: "prior-run",
        category: "dart",
        version: "1.0.0",
        date: "2026-01-01T00:00:00.000Z",
        skillCount: 1,
        avgBaselinePassRate: 0.2,
        avgWithSkillPassRate: 0.99,
        avgDelta: 0.79,
      },
    ],
  };
  const outcome = gateResults(runResults({ runId: "current-run" }), history);
  assert.equal(outcome.trend.previousRunId, "prior-run");
  assert.equal(outcome.trend.direction, "regressed");

  const improved = gateResults(
    runResults({ runId: "current-run-2", skills: [skillResult({ withSkillPassRate: 1 })] }),
    {
      lastUpdated: "",
      records: [{ ...history.records[0]!, avgWithSkillPassRate: 0.1 }],
    },
  );
  assert.equal(improved.trend.direction, "improved");
});

test("findPreviousHistoryRecord excludes the current run and other categories", () => {
  const history: EvalsHistory = {
    lastUpdated: "",
    records: [
      {
        runId: "self",
        category: "dart",
        version: "1.0.0",
        date: "2026-02-01T00:00:00.000Z",
        skillCount: 1,
        avgBaselinePassRate: 0,
        avgWithSkillPassRate: 0,
        avgDelta: 0,
      },
      {
        runId: "other-category",
        category: "golang",
        version: "1.0.0",
        date: "2026-01-15T00:00:00.000Z",
        skillCount: 1,
        avgBaselinePassRate: 0,
        avgWithSkillPassRate: 0,
        avgDelta: 0,
      },
    ],
  };
  assert.equal(findPreviousHistoryRecord(history, "dart", "self"), null);
});

test("gate reports no scored run available when nothing is pending or the run is missing", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ags-gate-"));
  try {
    const runsDir = path.join(root, "runs");
    await fs.ensureDir(path.join(runsDir, "all-v1.0.0"));
    await fs.writeJson(path.join(runsDir, "all-v1.0.0", "results.json"), runResults({ runId: "all-v1.0.0" }));
    const history: EvalsHistory = {
      lastUpdated: "",
      records: [
        {
          runId: "all-v1.0.0",
          category: "dart",
          version: "1.0.0",
          date: "2026-01-01T00:00:00.000Z",
          skillCount: 1,
          avgBaselinePassRate: 0,
          avgWithSkillPassRate: 0,
          avgDelta: 0,
        },
      ],
    };
    const all = gateAll(runsDir, history);
    assert.equal(all.ok, true);
    assert.equal(all.runs.length, 0);
    assert.match(all.message, /No scored run available/);

    const missing = gateOne(runsDir, "does-not-exist", history);
    assert.equal(missing.ok, true);
    assert.match(missing.message, /No scored run available/);

    assert.deepEqual(pendingGateRunIds(runsDir, history), []);
  } finally {
    await fs.remove(root);
  }
});

test("gate --all gates a pending run not yet recorded in history", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ags-gate-pending-"));
  try {
    const runsDir = path.join(root, "runs");
    await fs.ensureDir(path.join(runsDir, "pending-run"));
    await fs.writeJson(
      path.join(runsDir, "pending-run", "results.json"),
      runResults({
        runId: "pending-run",
        skills: [
          skillResult({
            withSkillPassRate: 0.5,
            casePassRate: { baseline: 0.2, withSkill: 0.5 },
          }),
        ],
      }),
    );
    const history: EvalsHistory = { lastUpdated: "", records: [] };
    const report = gateAll(runsDir, history);
    assert.equal(report.ok, false);
    assert.equal(report.runs.length, 1);
    assert.equal(report.runs[0]?.runId, "pending-run");
    assert.equal(report.runs[0]?.ready, false);
  } finally {
    await fs.remove(root);
  }
});

async function fixtureRepo(): Promise<{ root: string; cleanup: () => Promise<void> }> {
  const root = await mkdtemp(path.join(os.tmpdir(), "ags-estimate-"));
  await fs.ensureDir(path.join(root, "skills", "dart", "dart-tooling", "evals"));
  await fs.writeJson(path.join(root, "skills", "metadata.json"), {
    categories: { dart: { version: "1.0.0", tag_prefix: "dart-v" } },
  });
  await fs.writeFile(
    path.join(root, "skills", "dart", "dart-tooling", "SKILL.md"),
    "---\nname: dart-tooling\ndescription: Dart tooling\n---\nUse dart format.\n",
  );
  await fs.writeJson(
    path.join(root, "skills", "dart", "dart-tooling", "evals", "evals.json"),
    {
      evals: [
        {
          id: 1,
          prompt: "How should this Dart code be formatted?",
          assertions: [{ type: "contains", value: "answer" }],
        },
      ],
      should_trigger: ["Format this Dart code with the project tool."],
      should_not_trigger: ["Design a database migration."],
    },
  );
  return { root, cleanup: () => fs.remove(root) };
}

test("estimate reports lanes and model with cost unavailable when no prior usage history exists", async () => {
  const { root, cleanup } = await fixtureRepo();
  try {
    const { runDir } = buildManifest("dart", "9.9.9", {
      repoRoot: root,
      runId: "dart-v9.9.9-2099-01-01-estimate-empty",
    });
    const runsDir = path.join(root, "benchmarks", "evals", "runs");
    const report = estimateRun(runDir, { runsDir });
    assert.equal(report.projection, null);
    assert.match(report.message, /unavailable/);
    assert.ok(report.lanesToExecute > 0);
    assert.equal(report.model, "gpt-5.6-luna");
  } finally {
    await cleanup();
  }
});

test("estimate projects a token and dollar range from prior usage of the same model", async () => {
  const { root, cleanup } = await fixtureRepo();
  try {
    const runsDir = path.join(root, "benchmarks", "evals", "runs");
    const { runDir: priorDir, manifest: priorManifest } = buildManifest(
      "dart",
      "9.9.9",
      { repoRoot: root, runId: "dart-v9.9.9-2099-01-01-prior" },
    );
    priorManifest.metadata.model = "GPT-5";
    priorManifest.metadata.usage = {
      overall: {
        promptTokens: 800,
        completionTokens: 200,
        cachedPromptTokens: 0,
        reasoningTokens: 0,
        totalTokens: 1000,
        wallMs: 1000,
        lanesMetered: 2,
        lanesUnmetered: 0,
        estimatedUsd: 1.25,
      },
      byArm: {},
    };
    saveManifest(priorDir, priorManifest);

    const originalEnv = process.env.EVALS_MODEL;
    process.env.EVALS_MODEL = "GPT-5";
    try {
      const { runDir: currentDir } = buildManifest("dart", "9.9.9", {
        repoRoot: root,
        runId: "dart-v9.9.9-2099-01-01-current",
      });
      const report = estimateRun(currentDir, { runsDir });
      assert.equal(report.model, "GPT-5");
      assert.ok(report.projection);
      assert.equal(report.projection?.sampleLanes, 1);
      assert.equal(
        report.projection?.projectedTokens.low,
        500 * report.lanesToExecute,
      );
      assert.ok(report.projection?.projectedUsd);
      assert.equal(
        report.projection?.projectedUsd?.low,
        0.625 * report.lanesToExecute,
      );
    } finally {
      if (originalEnv === undefined) delete process.env.EVALS_MODEL;
      else process.env.EVALS_MODEL = originalEnv;
    }
  } finally {
    await cleanup();
  }
});

test("collectPriorLaneUsage only reuses samples from matching-model runs with metered lanes", async () => {
  const { root, cleanup } = await fixtureRepo();
  try {
    const runsDir = path.join(root, "benchmarks", "evals", "runs");
    const { runDir: matchingDir, manifest: matchingManifest } = buildManifest(
      "dart",
      "9.9.9",
      { repoRoot: root, runId: "dart-v9.9.9-2099-01-01-matching" },
    );
    matchingManifest.metadata.model = "GPT-5";
    matchingManifest.metadata.usage = {
      overall: {
        promptTokens: 800,
        completionTokens: 200,
        cachedPromptTokens: 0,
        reasoningTokens: 0,
        totalTokens: 1000,
        wallMs: 1000,
        lanesMetered: 2,
        lanesUnmetered: 0,
        estimatedUsd: 1.25,
      },
      byArm: {},
    };
    saveManifest(matchingDir, matchingManifest);

    const { runDir: otherModelDir, manifest: otherModelManifest } =
      buildManifest("dart", "9.9.9", {
        repoRoot: root,
        runId: "dart-v9.9.9-2099-01-01-other-model",
      });
    otherModelManifest.metadata.model = "Gemini 3 Flash";
    otherModelManifest.metadata.usage = {
      overall: {
        promptTokens: 10,
        completionTokens: 10,
        cachedPromptTokens: 0,
        reasoningTokens: 0,
        totalTokens: 20,
        wallMs: 10,
        lanesMetered: 1,
        lanesUnmetered: 0,
        estimatedUsd: 0.01,
      },
      byArm: {},
    };
    saveManifest(otherModelDir, otherModelManifest);

    const samples = collectPriorLaneUsage(runsDir, "GPT-5");
    assert.equal(samples.length, 1);
    assert.equal(samples[0]?.tokensPerLane, 500);
    assert.equal(samples[0]?.usdPerLane, 0.625);
  } finally {
    await cleanup();
  }
});
