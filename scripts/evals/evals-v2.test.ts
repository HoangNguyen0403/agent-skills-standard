import assert from "node:assert/strict";
import { mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import fs from "fs-extra";
import {
  answerPath,
  buildManifest,
  loadManifest,
  resumeManifest,
} from "./manifest";
import { scoreRun } from "./scorer";
import { verifyRun } from "./verify";
import { latestPerCategory } from "./reporter";
import { auditEvalDefinitions } from "./quality";
import { createBaselineRun, planBaseline } from "./impact";
import { promoteCategoryBaseline } from "./promote";
import {
  codexExecArgs,
  EvalQuotaPausedError,
  evalWorkerConfig,
  executeMissingAnswers,
} from "./execute";

test("eval workers explicitly pin the approved model and reasoning effort", () => {
  const config = evalWorkerConfig({});
  assert.deepEqual(config, {
    model: "gpt-5.6-luna",
    reasoningEffort: "high",
  });
  assert.deepEqual(codexExecArgs("/repo", config), [
    "exec",
    "--ephemeral",
    "--ignore-user-config",
    "--ignore-rules",
    "--model",
    "gpt-5.6-luna",
    "--config",
    'model_reasoning_effort="high"',
    "--sandbox",
    "read-only",
    "-C",
    "/repo",
  ]);
  assert.deepEqual(
    evalWorkerConfig({
      EVALS_MODEL: "test-model",
      EVALS_REASONING_EFFORT: "low",
    }),
    { model: "test-model", reasoningEffort: "low" },
  );
});

async function fixture(): Promise<{
  root: string;
  cleanup: () => Promise<void>;
}> {
  const root = await mkdtemp(path.join(os.tmpdir(), "ags-evals-v2-"));
  await fs.ensureDir(
    path.join(root, "skills", "dart", "dart-tooling", "evals"),
  );
  await fs.writeJson(path.join(root, "skills", "metadata.json"), {
    categories: { dart: { version: "1.0.0", tag_prefix: "dart-v" } },
  });
  await writeFile(
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

async function writeCompleteAnswers(
  runDir: string,
  manifest: ReturnType<typeof loadManifest>,
): Promise<void> {
  const skill = manifest.skills[0];
  assert.ok(skill);
  for (const currentCase of skill.cases) {
    if (currentCase.kind === "eval") {
      await writeFile(
        answerPath(runDir, manifest, skill, currentCase.id, "baseline"),
        "generic formatter guidance",
      );
      await writeFile(
        answerPath(runDir, manifest, skill, currentCase.id, "with-skill"),
        "answer with the requested formatter guidance",
      );
      continue;
    }
    const answer =
      currentCase.expectedTrigger === "yes"
        ? `CASE: ${currentCase.id}\nTRIGGER: yes\nRelevant.`
        : `CASE: ${currentCase.id}\nTRIGGER: no\nUnrelated.`;
    await writeFile(
      answerPath(runDir, manifest, skill, currentCase.id),
      answer,
    );
  }
}

test("v2 manifests are scoped, collision-safe, resumable, and use aggregate answer paths", async () => {
  const { root, cleanup } = await fixture();
  try {
    const first = buildManifest("all", "9.9.9", {
      repoRoot: root,
      now: new Date("2099-01-01T00:00:00.000Z"),
    });
    const second = buildManifest("all", "9.9.9", {
      repoRoot: root,
      now: new Date("2099-01-01T00:00:00.000Z"),
    });

    assert.notEqual(first.manifest.runId, second.manifest.runId);
    assert.equal(first.manifest.schemaVersion, 2);
    assert.equal(first.manifest.scope.kind, "all");
    assert.equal(first.manifest.protocol.baseline, "prompt-only");
    assert.match(
      answerPath(
        first.runDir,
        first.manifest,
        first.manifest.skills[0],
        "eval-1",
        "baseline",
      ),
      /answers\/dart\/dart-tooling\/eval-1\.baseline\.md$/,
    );

    const resumed = resumeManifest(first.manifest.runId, { repoRoot: root });
    assert.equal(resumed.manifest.runId, first.manifest.runId);
    assert.deepEqual(resumed.manifest.skills, first.manifest.skills);
  } finally {
    await cleanup();
  }
});

test("v2 trigger case identifiers do not disclose the expected label", async () => {
  const { root, cleanup } = await fixture();
  try {
    const { manifest } = buildManifest("dart", "9.9.9", {
      repoRoot: root,
      runId: "dart-v9.9.9-2099-01-01-trigger-blinded",
    });
    const skill = manifest.skills[0];
    assert.ok(skill);
    const triggerCases = skill.cases.filter(
      (currentCase) => currentCase.kind === "trigger",
    );
    assert.ok(triggerCases.length > 0);
    assert.ok(
      triggerCases.every(
        (currentCase) =>
          !currentCase.id.includes("positive") &&
          !currentCase.id.includes("negative"),
      ),
    );
  } finally {
    await cleanup();
  }
});

test("selective aggregate manifests keep category-qualified prompt paths", async () => {
  const { root, cleanup } = await fixture();
  try {
    const { runDir, manifest } = buildManifest("all", "9.9.9", {
      repoRoot: root,
      runId: "all-v9.9.9-2099-01-01-selective-path",
      selectedSkills: new Set(["dart/dart-tooling"]),
    });
    assert.equal(manifest.scope.kind, "selective");
    assert.ok(
      await fs.pathExists(
        path.join(runDir, "prompts", "dart", "dart-tooling", "eval-1.md"),
      ),
    );
  } finally {
    await cleanup();
  }
});

test("v2 trigger prompts include only the frontmatter name and description", async () => {
  const { root, cleanup } = await fixture();
  try {
    const { runDir, manifest } = buildManifest("dart", "9.9.9", {
      repoRoot: root,
      runId: "dart-v9.9.9-2099-01-01-trigger-description",
    });
    const triggerCase = manifest.skills[0]?.cases.find(
      (currentCase) => currentCase.kind === "trigger",
    );
    assert.ok(triggerCase);
    const prompt = await readFile(
      path.join(runDir, "prompts", "dart-tooling", `${triggerCase.id}.md`),
      "utf8",
    );
    assert.match(prompt, /Dart tooling/);
    assert.doesNotMatch(prompt, /Use dart format/);
  } finally {
    await cleanup();
  }
});

test("eval audit reports missing eval prompts before manifest generation", async () => {
  const { root, cleanup } = await fixture();
  try {
    await fs.writeJson(
      path.join(root, "skills", "dart", "dart-tooling", "evals", "evals.json"),
      {
        evals: [
          {
            id: 1,
            assertions: [
              { type: "contains", value: "answer" },
              { type: "contains", value: "formatter" },
            ],
          },
        ],
        should_trigger: ["Format this Dart code with the project tool."],
        should_not_trigger: ["Design a database migration."],
      },
    );
    const issues = auditEvalDefinitions(root);
    assert.ok(issues.some((issue) => issue.kind === "missing-prompt"));
  } finally {
    await cleanup();
  }
});

test("eval audit rejects generic contains_any alternatives", async () => {
  const { root, cleanup } = await fixture();
  try {
    await fs.writeJson(
      path.join(root, "skills", "dart", "dart-tooling", "evals", "evals.json"),
      {
        evals: [
          {
            id: 1,
            prompt: "Format this",
            assertions: [
              { type: "contains_any", value: ["dart format", "name"] },
              { type: "contains", value: "format" },
            ],
          },
        ],
        should_trigger: ["Format Dart code."],
        should_not_trigger: ["Design a logo."],
      },
    );
    assert.ok(
      auditEvalDefinitions(root).some(
        (issue) => issue.kind === "generic-alternative",
      ),
    );
  } finally {
    await cleanup();
  }
});

test("v2 scoring snapshots inputs, calculates outcome and balanced trigger metrics, and verifies after source drift", async () => {
  const { root, cleanup } = await fixture();
  try {
    const { runDir, manifest } = buildManifest("dart", "9.9.9", {
      repoRoot: root,
      runId: "dart-v9.9.9-2099-01-01-test",
    });
    await writeCompleteAnswers(runDir, manifest);

    const results = scoreRun(runDir, { repoRoot: root });
    const skill = results.skills[0];
    assert.ok(skill);
    assert.ok(skill.casePassRate);
    assert.ok(skill.assertionPassRate);
    assert.equal(results.schemaVersion, 2);
    assert.equal(skill.casePassRate.baseline, 0);
    assert.equal(skill.casePassRate.withSkill, 1);
    assert.equal(skill.assertionPassRate.withSkill, 1);
    assert.equal(skill.triggerRecall, 1);
    assert.equal(skill.triggerSpecificity, 1);
    assert.equal(skill.balancedTriggerAccuracy, 1);
    await stat(path.join(runDir, "inputs.json"));

    await fs.writeJson(
      path.join(root, "skills", "dart", "dart-tooling", "evals", "evals.json"),
      {
        evals: [
          {
            id: 1,
            prompt: "changed",
            assertions: [{ type: "contains", value: "different" }],
          },
        ],
      },
    );
    assert.equal(verifyRun(manifest.runId, { repoRoot: root }).ok, true);
  } finally {
    await cleanup();
  }
});

test("v2 scoring refuses to publish results while any arm is pending", async () => {
  const { root, cleanup } = await fixture();
  try {
    const { runDir } = buildManifest("dart", "9.9.9", {
      repoRoot: root,
      runId: "dart-v9.9.9-2099-01-01-incomplete",
    });
    assert.throws(
      () => scoreRun(runDir, { repoRoot: root }),
      (error: unknown) =>
        error instanceof Error && /trigger-1\.md/i.test(error.message),
    );
    await assert.rejects(stat(path.join(runDir, "results.json")));
  } finally {
    await cleanup();
  }
});

test("legacy v1 manifests remain readable without being rewritten", async () => {
  const { root, cleanup } = await fixture();
  try {
    const runId = "dart-v1-2099-01-01";
    const runDir = path.join(root, "benchmarks", "evals", "runs", runId);
    await fs.ensureDir(path.join(runDir, "answers", "dart-tooling"));
    await fs.writeJson(path.join(runDir, "manifest.json"), {
      runId,
      category: "dart",
      version: "1.0.0",
      createdAt: "2099-01-01T00:00:00.000Z",
      metadata: {},
      skills: [
        {
          category: "dart",
          skillName: "dart-tooling",
          skillPath: "skills/dart/dart-tooling/SKILL.md",
          guardrailApplicable: false,
          cases: [],
        },
      ],
    });
    const before = await readFile(path.join(runDir, "manifest.json"), "utf8");
    const loaded = loadManifest(runDir);
    assert.equal(loaded.schemaVersion, 1);
    assert.equal(
      await readFile(path.join(runDir, "manifest.json"), "utf8"),
      before,
    );
  } finally {
    await cleanup();
  }
});

test("positive and negative trigger scoring rejects an always-no strategy", async () => {
  const { root, cleanup } = await fixture();
  try {
    const { runDir, manifest } = buildManifest("dart", "9.9.9", {
      repoRoot: root,
      runId: "dart-v9.9.9-2099-01-01-trigger-no",
    });
    await writeCompleteAnswers(runDir, manifest);
    const skill = manifest.skills[0];
    assert.ok(skill);
    const positive = skill.cases.find(
      (currentCase) => currentCase.expectedTrigger === "yes",
    );
    assert.ok(positive);
    await writeFile(
      answerPath(runDir, manifest, skill, positive.id),
      "TRIGGER: no\nNot activating.",
    );
    const result = scoreRun(runDir, { repoRoot: root });
    assert.equal(result.skills[0]?.triggerRecall, 0);
    assert.equal(result.skills[0]?.balancedTriggerAccuracy, 0.5);
  } finally {
    await cleanup();
  }
});

test("compromised baselines are typed and excluded from baseline and delta metrics", async () => {
  const { root, cleanup } = await fixture();
  try {
    const { runDir, manifest } = buildManifest("dart", "9.9.9", {
      repoRoot: root,
      runId: "dart-v9.9.9-2099-01-01-compromised",
    });
    const manifestPath = path.join(runDir, "manifest.json");
    const stored = await fs.readJson(manifestPath);
    stored.compromisedSkills = [
      {
        category: "dart",
        skillName: "dart-tooling",
        arm: "baseline",
        reason: "baseline-compromised",
      },
    ];
    await fs.writeJson(manifestPath, stored);
    await writeCompleteAnswers(runDir, manifest);
    const result = scoreRun(runDir, { repoRoot: root });
    assert.equal(result.skills[0]?.baselinePassRate, "n/a");
    assert.equal(result.skills[0]?.delta, "n/a");
    assert.equal(result.compromisedSkills?.[0]?.reason, "baseline-compromised");
  } finally {
    await cleanup();
  }
});

test("aggregate reporting projects categories before selecting the newest partition", () => {
  const makeSkill = (category: string, skillName: string) => ({
    category,
    skillName,
    guardrailApplicable: false,
    totalEvalCases: 1,
    baselinePassRate: 0,
    withSkillPassRate: 1,
    delta: 1,
    triggerPrecision: null,
    scores: [],
    incompleteArms: [],
  });
  const latest = latestPerCategory([
    {
      schemaVersion: 2,
      runId: "dart-v2",
      category: "dart",
      version: "2",
      scoredAt: "2099-01-01T00:00:00.000Z",
      metadata: {},
      skills: [makeSkill("dart", "dart-tooling")],
    },
    {
      schemaVersion: 2,
      runId: "all-v2",
      category: "all",
      version: "2",
      scoredAt: "2099-01-02T00:00:00.000Z",
      metadata: {},
      scope: { kind: "all", categories: ["dart", "flutter"] },
      skills: [
        makeSkill("dart", "dart-tooling"),
        makeSkill("flutter", "flutter-tooling"),
      ],
    },
  ]);
  assert.deepEqual([...latest.keys()].sort(), ["dart", "flutter"]);
  assert.equal(latest.get("dart")?.runId, "all-v2");
  assert.equal(latest.get("flutter")?.runId, "all-v2");
});

test("selective runs do not replace a complete category report projection", () => {
  const latest = latestPerCategory([
    {
      schemaVersion: 2,
      runId: "dart-complete-v2",
      category: "dart",
      version: "2",
      scoredAt: "2099-01-01T00:00:00.000Z",
      metadata: {},
      skills: [],
    },
    {
      schemaVersion: 2,
      runId: "all-selective-v2",
      category: "all",
      version: "2",
      scoredAt: "2099-01-02T00:00:00.000Z",
      metadata: {},
      scope: { kind: "selective", categories: ["dart"] },
      skills: [],
    },
  ]);
  assert.equal(latest.get("dart")?.runId, "dart-complete-v2");
});

test("incremental baseline reuses only evidence compatible with the changed source", async () => {
  const { root, cleanup } = await fixture();
  try {
    const initial = buildManifest("dart", "9.9.9", {
      repoRoot: root,
      runId: "dart-v9.9.9-2099-01-01-reference",
    });
    await writeCompleteAnswers(initial.runDir, initial.manifest);
    scoreRun(initial.runDir, { repoRoot: root });

    await writeFile(
      path.join(root, "skills", "dart", "dart-tooling", "SKILL.md"),
      "---\nname: dart-tooling\ndescription: Dart tooling\n---\nUse dart format and analyze output.\n",
    );
    const bodyPlan = planBaseline("dart", {
      repoRoot: root,
      baselineRunId: initial.manifest.runId,
    });
    assert.equal(bodyPlan.impacts[0]?.outcome, "generate");
    assert.equal(bodyPlan.impacts[0]?.activation, "reuse");
    assert.equal(bodyPlan.impacts[0]?.reuseBaselineOutcome, true);
    const bodyRun = createBaselineRun("dart", "9.9.9", {
      repoRoot: root,
      baselineRunId: initial.manifest.runId,
    });
    assert.ok(bodyRun.runDir && bodyRun.runId);
    const bodyManifest = loadManifest(bodyRun.runDir as string);
    const skill = bodyManifest.skills[0];
    assert.ok(skill);
    assert.ok(
      await fs.pathExists(
        answerPath(
          bodyRun.runDir as string,
          bodyManifest,
          skill,
          "eval-1",
          "baseline",
        ),
      ),
    );
    assert.equal(
      await fs.pathExists(
        answerPath(
          bodyRun.runDir as string,
          bodyManifest,
          skill,
          "eval-1",
          "with-skill",
        ),
      ),
      false,
    );
    assert.ok(
      await fs.pathExists(
        answerPath(bodyRun.runDir as string, bodyManifest, skill, "trigger-1"),
      ),
    );
    const resumed = createBaselineRun("dart", "9.9.9", {
      repoRoot: root,
      baselineRunId: initial.manifest.runId,
    });
    assert.equal(resumed.runId, bodyRun.runId);
    assert.equal(resumed.resumed, true);
    const generated = await executeMissingAnswers(bodyRun.runDir as string, {
      repoRoot: root,
      runner: async () => "answer with the requested formatter guidance",
    });
    assert.equal(generated, 1);
    assert.equal(
      scoreRun(bodyRun.runDir as string, { repoRoot: root }).skills[0]
        ?.incompleteArms.length,
      0,
    );
    const candidatePlan = planBaseline("dart", {
      repoRoot: root,
      baselineRunId: initial.manifest.runId,
    });
    assert.equal(candidatePlan.impacts[0]?.outcome, "reuse");
    const candidateReuse = createBaselineRun("dart", "9.9.9", {
      repoRoot: root,
      baselineRunId: initial.manifest.runId,
    });
    assert.ok(candidateReuse.reusedAnswers > 0);

    await writeFile(
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
            assertions: [
              { type: "contains", value: "answer" },
              { type: "contains", value: "guidance" },
            ],
          },
        ],
        should_trigger: ["Format this Dart code with the project tool."],
        should_not_trigger: ["Design a database migration."],
      },
    );
    const assertionPlan = planBaseline("dart", {
      repoRoot: root,
      baselineRunId: initial.manifest.runId,
    });
    assert.equal(assertionPlan.impacts[0]?.outcome, "reuse");
    const assertionRun = createBaselineRun("dart", "9.9.9", {
      repoRoot: root,
      baselineRunId: initial.manifest.runId,
    });
    assert.ok(assertionRun.runDir);
    const result = scoreRun(assertionRun.runDir as string, { repoRoot: root });
    assert.equal(result.skills[0]?.incompleteArms.length, 0);
  } finally {
    await cleanup();
  }
});

test("promotion requires a current complete category run and records review provenance", async () => {
  const { root, cleanup } = await fixture();
  try {
    const { runDir, manifest } = buildManifest("dart", "9.9.9", {
      repoRoot: root,
      runId: "dart-v9.9.9-2099-01-01-promote",
    });
    await writeCompleteAnswers(runDir, manifest);
    scoreRun(runDir, { repoRoot: root });
    const promoted = promoteCategoryBaseline(
      manifest.runId,
      "dart",
      "maintainer",
      "release gate reviewed",
      { repoRoot: root, now: new Date("2099-01-02T00:00:00.000Z") },
    );
    assert.equal(promoted.tag, "dart-v1.0.0");
    const registry = await fs.readJson(
      path.join(root, "benchmarks", "evals", "baselines.json"),
    );
    assert.equal(registry.categories.dart.runId, manifest.runId);
  } finally {
    await cleanup();
  }
});

test("missing eval answers run in a bounded worker pool", async () => {
  const { root, cleanup } = await fixture();
  try {
    const { runDir } = buildManifest("dart", "9.9.9", {
      repoRoot: root,
      runId: "dart-v9.9.9-2099-01-01-concurrency",
    });
    let active = 0;
    let maxActive = 0;
    const generated = await executeMissingAnswers(runDir, {
      repoRoot: root,
      concurrency: 3,
      runner: async () => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active -= 1;
        return "worker answer";
      },
    });
    assert.equal(generated, 4);
    assert.equal(maxActive, 3);
  } finally {
    await cleanup();
  }
});

test("an unusably short worker response is rejected without writing an answer", async () => {
  const { root, cleanup } = await fixture();
  try {
    const { runDir } = buildManifest("dart", "9.9.9", {
      repoRoot: root,
      runId: "dart-v9.9.9-2099-01-01-short-answer",
    });
    await assert.rejects(
      executeMissingAnswers(runDir, {
        repoRoot: root,
        concurrency: 1,
        runner: async () => "hybrid",
      }),
      /unusably short answer/i,
    );
    const manifest = loadManifest(runDir);
    const skill = manifest.skills[0];
    assert.ok(skill);
    assert.equal(
      await fs.pathExists(
        answerPath(runDir, manifest, skill, "eval-1", "baseline"),
      ),
      false,
    );
  } finally {
    await cleanup();
  }
});

test("a quota pause preserves completed answers and reports a resumable error", async () => {
  const { root, cleanup } = await fixture();
  try {
    const { runDir } = buildManifest("dart", "9.9.9", {
      repoRoot: root,
      runId: "dart-v9.9.9-2099-01-01-quota-pause",
    });
    let calls = 0;
    await assert.rejects(
      executeMissingAnswers(runDir, {
        repoRoot: root,
        concurrency: 1,
        runner: async () => {
          calls += 1;
          if (calls === 1) return "first answer";
          throw new EvalQuotaPausedError("Codex usage limit reached.");
        },
      }),
      (error: unknown) =>
        error instanceof EvalQuotaPausedError &&
        /Progress is saved; 3 fresh answer\(s\) remain/i.test(error.message),
    );
    assert.equal(calls, 2);
    const manifest = loadManifest(runDir);
    const skill = manifest.skills[0];
    assert.ok(skill);
    assert.ok(
      await fs.pathExists(
        answerPath(runDir, manifest, skill, "eval-1", "baseline"),
      ),
    );
    assert.equal(loadManifest(runDir).metadata.completedAt, undefined);
  } finally {
    await cleanup();
  }
});
