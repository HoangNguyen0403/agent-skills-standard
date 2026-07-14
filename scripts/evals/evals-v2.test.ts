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
  resolveRunId,
  resumeManifest,
} from "./manifest";
import { checkAssertion, scoreRun } from "./scorer";
import { verifyRun } from "./verify";
import { buildEvalsReportMarkdown, latestPerCategory } from "./reporter";
import { auditEvalDefinitions } from "./quality";
import { createBaselineRun, planBaseline } from "./impact";
import { promoteCategoryBaseline } from "./promote";
import { evaluateSkillReadiness } from "./readiness";
import type { SkillResult } from "./types";
import { composeRuns } from "./compose";
import { pruneV2Runs } from "./prune";
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

test("latest run reference resolves the newest completed run without copying its physical ID", async () => {
  const { root, cleanup } = await fixture();
  try {
    const runsDir = path.join(root, "benchmarks", "evals", "runs");
    const createRun = async (runId: string, createdAt: string) => {
      const runDir = path.join(runsDir, runId);
      await fs.ensureDir(runDir);
      await fs.writeJson(path.join(runDir, "manifest.json"), {
        runId,
        category: "all",
        version: "2.6.0",
        createdAt,
        metadata: { completedAt: `${createdAt}+00:00` },
        skills: [],
      });
      await fs.writeJson(path.join(runDir, "results.json"), {});
    };
    await createRun("all-v2.6.0-2026-07-13-old", "2026-07-13T00:00:00.000Z");
    await createRun("all-v2.6.0-2026-07-14-new", "2026-07-14T00:00:00.000Z");

    assert.equal(
      resolveRunId("latest", {
        repoRoot: root,
        version: "2.6.0",
        category: "all",
      }),
      "all-v2.6.0-2026-07-14-new",
    );
  } finally {
    await cleanup();
  }
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
    assert.equal(first.manifest.assertionSemanticsVersion, 2);
    assert.equal(first.manifest.metadata.evidenceMode, "fresh");
    assert.equal(first.manifest.metadata.freshAnswerCount, 0);
    assert.equal(first.manifest.metadata.reusedAnswerCount, 0);
    assert.deepEqual(first.manifest.compromisedSkills, []);
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

test("v2 manifests accept readable explicit run IDs", async () => {
  const { root, cleanup } = await fixture();
  try {
    const run = buildManifest("all", "9.9.9", {
      repoRoot: root,
      runId: "all-v9.9.9-final-136",
    });
    assert.equal(run.manifest.runId, "all-v9.9.9-final-136");
    assert.match(run.runDir, /all-v9\.9\.9-final-136$/);
    assert.throws(
      () =>
        buildManifest("all", "9.9.9", {
          repoRoot: root,
          runId: "../unsafe-run",
        }),
      /Invalid run ID/,
    );
  } finally {
    await cleanup();
  }
});

async function compositionFixture(): Promise<{
  root: string;
  cleanup: () => Promise<void>;
}> {
  const root = await mkdtemp(path.join(os.tmpdir(), "ags-evals-compose-"));
  await fs.ensureDir(path.join(root, "skills"));
  await fs.writeJson(path.join(root, "skills", "metadata.json"), {
    categories: { dart: { version: "1.0.0", tag_prefix: "dart-v" } },
  });
  for (const skillName of ["dart-tooling", "dart-language"]) {
    await fs.ensureDir(path.join(root, "skills", "dart", skillName, "evals"));
    await writeFile(
      path.join(root, "skills", "dart", skillName, "SKILL.md"),
      `---\nname: ${skillName}\ndescription: ${skillName}\n---\nUse the answer.\n`,
    );
    await fs.writeJson(
      path.join(root, "skills", "dart", skillName, "evals", "evals.json"),
      {
        evals: [
          {
            id: 1,
            prompt: `Explain ${skillName}.`,
            assertions: [{ type: "contains", value: "answer" }],
          },
        ],
      },
    );
  }
  return { root, cleanup: () => fs.remove(root) };
}

async function makeCompleteRun(
  root: string,
  runId: string,
  selectedSkills?: ReadonlySet<string>,
): Promise<{ runDir: string; manifest: ReturnType<typeof loadManifest> }> {
  const built = buildManifest("all", "2.6.0", {
    repoRoot: root,
    runId,
    selectedSkills,
  });
  for (const skill of built.manifest.skills) {
    for (const currentCase of skill.cases) {
      if (currentCase.kind === "eval") {
        await writeFile(
          answerPath(
            built.runDir,
            built.manifest,
            skill,
            currentCase.id,
            "baseline",
          ),
          "baseline answer",
        );
        await writeFile(
          answerPath(
            built.runDir,
            built.manifest,
            skill,
            currentCase.id,
            "with-skill",
          ),
          "answer from skill",
        );
      }
    }
  }
  scoreRun(built.runDir, { repoRoot: root });
  return { runDir: built.runDir, manifest: loadManifest(built.runDir) };
}

test("composition overlays selected skills, copies evidence, and records provenance", async () => {
  const { root, cleanup } = await compositionFixture();
  try {
    const base = await makeCompleteRun(root, "base-v2.6.0");
    const overlay = await makeCompleteRun(
      root,
      "overlay-v2.6.0",
      new Set(["dart/dart-language"]),
    );
    const output = composeRuns({
      repoRoot: root,
      baseRunId: base.manifest.runId,
      overlayRunId: overlay.manifest.runId,
      version: "2.6.0",
      outputRunId: "all-v2.6.0",
      expectedSkillCount: 2,
    });

    assert.equal(output.manifest.skills.length, 2);
    assert.equal(output.manifest.metadata.evidenceMode, "composite");
    assert.equal(
      output.manifest.provenance?.["dart/dart-language"]?.sourceRunId,
      overlay.manifest.runId,
    );
    assert.equal(
      output.manifest.provenance?.["dart/dart-tooling"]?.sourceRunId,
      base.manifest.runId,
    );
    await stat(path.join(output.runDir, "inputs.json"));
    await stat(
      path.join(
        output.runDir,
        "answers",
        "dart",
        "dart-language",
        "eval-1.baseline.md",
      ),
    );
    assert.equal(verifyRun(output.manifest.runId, { repoRoot: root }).ok, true);
  } finally {
    await cleanup();
  }
});

test("composition upgrades a compatible historical base to the v3 overlay protocol", async () => {
  const { root, cleanup } = await compositionFixture();
  try {
    const base = await makeCompleteRun(root, "base-v2.6.0");
    const baseManifestPath = path.join(base.runDir, "manifest.json");
    const baseManifest = fs.readJsonSync(baseManifestPath);
    baseManifest.protocol.instructionVersion = "governing-skill-v1";
    fs.writeJsonSync(baseManifestPath, baseManifest, { spaces: 2 });
    const overlay = await makeCompleteRun(
      root,
      "overlay-v2.6.0",
      new Set(["dart/dart-language"]),
    );

    const output = composeRuns({
      repoRoot: root,
      baseRunId: base.manifest.runId,
      overlayRunId: overlay.manifest.runId,
      version: "2.6.0",
      outputRunId: "all-v2.6.0",
      expectedSkillCount: 2,
    });

    assert.equal(
      output.manifest.protocol.instructionVersion,
      "governing-skill-v3",
    );
    assert.equal(
      output.manifest.provenance?.["dart/dart-tooling"]?.protocol
        .instructionVersion,
      "governing-skill-v1",
    );
  } finally {
    await cleanup();
  }
});

test("composition accepts verified pre-evidenceMode v2 history", async () => {
  const { root, cleanup } = await compositionFixture();
  try {
    const base = await makeCompleteRun(root, "historical-v2.6.0");
    for (const filename of ["manifest.json", "results.json"]) {
      const filePath = path.join(base.runDir, filename);
      const document = fs.readJsonSync(filePath);
      delete document.metadata.evidenceMode;
      delete document.metadata.freshAnswerCount;
      delete document.metadata.reusedAnswerCount;
      fs.writeJsonSync(filePath, document, { spaces: 2 });
    }
    const overlay = await makeCompleteRun(
      root,
      "overlay-v2.6.0",
      new Set(["dart/dart-language"]),
    );

    const output = composeRuns({
      repoRoot: root,
      baseRunId: base.manifest.runId,
      overlayRunId: overlay.manifest.runId,
      version: "2.6.0",
      outputRunId: "all-v2.6.0",
      expectedSkillCount: 2,
    });

    assert.equal(output.manifest.skills.length, 2);
    assert.equal(verifyRun(output.manifest.runId, { repoRoot: root }).ok, true);
  } finally {
    await cleanup();
  }
});

test("composition accepts a verified composite as a staged source", async () => {
  const { root, cleanup } = await compositionFixture();
  try {
    const base = await makeCompleteRun(root, "base-v2.6.0");
    const overlay = await makeCompleteRun(
      root,
      "overlay-v2.6.0",
      new Set(["dart/dart-language"]),
    );
    const staged = composeRuns({
      repoRoot: root,
      baseRunId: base.manifest.runId,
      overlayRunId: overlay.manifest.runId,
      version: "2.6.0",
      outputRunId: "staged-v2.6.0",
      expectedSkillCount: 2,
    });
    const final = composeRuns({
      repoRoot: root,
      baseRunId: staged.manifest.runId,
      overlayRunId: overlay.manifest.runId,
      version: "2.6.0",
      outputRunId: "final-v2.6.0",
      expectedSkillCount: 2,
    });

    assert.equal(final.manifest.metadata.evidenceMode, "composite");
    assert.equal(verifyRun(final.manifest.runId, { repoRoot: root }).ok, true);
  } finally {
    await cleanup();
  }
});

test("composition rejects incomplete, compromised, mismatched, duplicate, or missing evidence", async () => {
  const { root, cleanup } = await compositionFixture();
  try {
    const base = await makeCompleteRun(root, "base-v2.6.0");
    const overlay = await makeCompleteRun(
      root,
      "overlay-v2.6.0",
      new Set(["dart/dart-language"]),
    );
    const overlaySkill = overlay.manifest.skills[0];
    assert.ok(overlaySkill);
    fs.removeSync(
      answerPath(
        overlay.runDir,
        overlay.manifest,
        overlaySkill,
        "eval-1",
        "baseline",
      ),
    );
    assert.throws(
      () =>
        composeRuns({
          repoRoot: root,
          baseRunId: base.manifest.runId,
          overlayRunId: overlay.manifest.runId,
          version: "2.6.0",
          outputRunId: "all-v2.6.0",
          expectedSkillCount: 2,
        }),
      /not verified|incomplete|missing/i,
    );
    await writeFile(
      answerPath(
        overlay.runDir,
        overlay.manifest,
        overlaySkill,
        "eval-1",
        "baseline",
      ),
      "baseline answer",
    );
    scoreRun(overlay.runDir, { repoRoot: root });
    const overlayManifest = loadManifest(overlay.runDir);
    overlayManifest.compromisedSkills = [
      {
        category: "dart",
        skillName: "dart-language",
        arm: "baseline",
        reason: "baseline-compromised",
      },
    ];
    fs.writeJsonSync(
      path.join(overlay.runDir, "manifest.json"),
      overlayManifest,
      {
        spaces: 2,
      },
    );
    scoreRun(overlay.runDir, { repoRoot: root });
    assert.throws(
      () =>
        composeRuns({
          repoRoot: root,
          baseRunId: base.manifest.runId,
          overlayRunId: overlay.manifest.runId,
          version: "2.6.0",
          outputRunId: "all-v2.6.0",
          expectedSkillCount: 2,
        }),
      /compromised/i,
    );

    overlayManifest.compromisedSkills = [];
    overlayManifest.version = "9.9.9";
    fs.writeJsonSync(
      path.join(overlay.runDir, "manifest.json"),
      overlayManifest,
      {
        spaces: 2,
      },
    );
    assert.throws(
      () =>
        composeRuns({
          repoRoot: root,
          baseRunId: base.manifest.runId,
          overlayRunId: overlay.manifest.runId,
          version: "2.6.0",
          outputRunId: "all-v2.6.0",
          expectedSkillCount: 2,
        }),
      /version/i,
    );

    overlayManifest.version = "2.6.0";
    fs.writeJsonSync(
      path.join(overlay.runDir, "manifest.json"),
      overlayManifest,
      {
        spaces: 2,
      },
    );
    scoreRun(overlay.runDir, { repoRoot: root });
    assert.throws(
      () =>
        composeRuns({
          repoRoot: root,
          baseRunId: base.manifest.runId,
          overlayRunId: overlay.manifest.runId,
          version: "2.6.0",
          outputRunId: "all-v2.6.0-missing",
          expectedSkillCount: 3,
        }),
      /expected exactly 3/i,
    );

    overlayManifest.skills.push(overlayManifest.skills[0]!);
    fs.writeJsonSync(
      path.join(overlay.runDir, "manifest.json"),
      overlayManifest,
      {
        spaces: 2,
      },
    );
    assert.throws(
      () =>
        composeRuns({
          repoRoot: root,
          baseRunId: base.manifest.runId,
          overlayRunId: overlay.manifest.runId,
          version: "2.6.0",
          outputRunId: "all-v2.6.0",
          expectedSkillCount: 2,
        }),
      /duplicate/i,
    );
  } finally {
    await cleanup();
  }
});

test("prune is dry-run by default and requires verified canonical output to apply", async () => {
  const { root, cleanup } = await compositionFixture();
  try {
    const base = await makeCompleteRun(root, "base-v2.6.0");
    const overlay = await makeCompleteRun(
      root,
      "overlay-v2.6.0",
      new Set(["dart/dart-language"]),
    );
    const output = composeRuns({
      repoRoot: root,
      baseRunId: base.manifest.runId,
      overlayRunId: overlay.manifest.runId,
      version: "2.6.0",
      outputRunId: "all-v2.6.0",
      expectedSkillCount: 2,
    });
    const dryRun = pruneV2Runs({
      repoRoot: root,
      version: "2.6.0",
      keepRunId: output.manifest.runId,
      expectedSkillCount: 2,
    });
    assert.equal(dryRun.applied, false);
    assert.deepEqual(dryRun.deletedRunIds.sort(), [
      base.manifest.runId,
      overlay.manifest.runId,
    ]);
    assert.equal(fs.existsSync(base.runDir), true);
    const archiveDir = path.join(root, "benchmarks", "evals", "archive");
    await fs.ensureDir(archiveDir);
    for (const runId of [
      base.manifest.runId,
      overlay.manifest.runId,
      output.manifest.runId,
    ])
      await writeFile(path.join(archiveDir, `${runId}.md`), runId);
    await fs.writeJson(path.join(root, "benchmarks", "evals", "history.json"), {
      lastUpdated: "2099-01-01T00:00:00.000Z",
      records: [
        ...[
          base.manifest.runId,
          overlay.manifest.runId,
          output.manifest.runId,
        ].map((runId) => ({
          runId,
          category: "all",
          version: "2.6.0",
          date: "2099-01-01T00:00:00.000Z",
          skillCount: 2,
          avgBaselinePassRate: 0,
          avgWithSkillPassRate: 1,
          avgDelta: 1,
        })),
        {
          runId: "all-v2.5.0",
          category: "all",
          version: "2.5.0",
          date: "2098-01-01T00:00:00.000Z",
          skillCount: 2,
          avgBaselinePassRate: 0,
          avgWithSkillPassRate: 1,
          avgDelta: 1,
        },
      ],
    });
    const applied = pruneV2Runs({
      repoRoot: root,
      version: "2.6.0",
      keepRunId: output.manifest.runId,
      apply: true,
      expectedSkillCount: 2,
    });
    assert.equal(applied.applied, true);
    assert.equal(fs.existsSync(base.runDir), false);
    assert.equal(fs.existsSync(overlay.runDir), false);
    assert.equal(fs.existsSync(output.runDir), true);
    assert.equal(
      fs.existsSync(path.join(archiveDir, `${base.manifest.runId}.md`)),
      false,
    );
    assert.equal(
      fs.existsSync(path.join(archiveDir, `${overlay.manifest.runId}.md`)),
      false,
    );
    assert.equal(
      fs.existsSync(path.join(archiveDir, `${output.manifest.runId}.md`)),
      true,
    );
    const retainedHistory = fs.readJsonSync(
      path.join(root, "benchmarks", "evals", "history.json"),
    );
    assert.deepEqual(
      retainedHistory.records.map((record: { runId: string }) => record.runId),
      [output.manifest.runId, "all-v2.5.0"],
    );
    assert.throws(
      () =>
        pruneV2Runs({
          repoRoot: root,
          version: "2.6.0",
          keepRunId: "missing-v2.6.0",
          apply: true,
          expectedSkillCount: 2,
        }),
      /canonical|not found/i,
    );
  } finally {
    await cleanup();
  }
});

test("strict readiness requires case pass above 85 percent, not only assertions", () => {
  const skill: SkillResult = {
    category: "dart",
    skillName: "dart-tooling",
    guardrailApplicable: false,
    totalEvalCases: 3,
    baselinePassRate: 0.33,
    withSkillPassRate: 0.85,
    delta: 0.52,
    triggerPrecision: 1,
    casePassRate: { baseline: 0.33, withSkill: 0.85 },
    assertionPassRate: { baseline: 0.5, withSkill: 1 },
    triggerRecall: 1,
    triggerSpecificity: 1,
    balancedTriggerAccuracy: 1,
    scores: [],
    incompleteArms: [],
  };

  const failing = evaluateSkillReadiness(skill);
  assert.equal(failing.ready, false);
  assert.ok(failing.failures.includes("with-skill case pass must exceed 85%"));

  const passing = evaluateSkillReadiness({
    ...skill,
    withSkillPassRate: 1,
    casePassRate: { baseline: 0.33, withSkill: 1 },
  });
  assert.equal(passing.ready, true);
});

test("report distinguishes outcome readiness from activation readiness", () => {
  const result: SkillResult = {
    category: "dart",
    skillName: "dart-tooling",
    guardrailApplicable: false,
    totalEvalCases: 3,
    baselinePassRate: 0.33,
    withSkillPassRate: 0.67,
    delta: 0.34,
    triggerPrecision: 1,
    casePassRate: { baseline: 0.33, withSkill: 0.67 },
    assertionPassRate: { baseline: 0.5, withSkill: 1 },
    triggerRecall: 1,
    triggerSpecificity: 1,
    balancedTriggerAccuracy: 1,
    scores: [],
    incompleteArms: [],
  };

  const report = buildEvalsReportMarkdown([
    {
      schemaVersion: 2,
      runId: "dart-v9.9.9-test-report",
      category: "dart",
      version: "9.9.9",
      scoredAt: "2099-01-01T00:00:00.000Z",
      metadata: {
        evidenceMode: "fresh",
        model: "test-model",
        reasoningEffort: "high",
      },
      scope: { kind: "category", categories: ["dart"] },
      compromisedSkills: [],
      skills: [result],
    },
  ]);

  assert.match(report, /Outcome readiness.*NOT READY/s);
  assert.match(report, /Strict outcome-ready skills.*0\/1/);
  assert.match(report, /Activation-ready skills.*1\/1/);
});

test("report includes a residual matrix for failed non-baseline arms", () => {
  const report = buildEvalsReportMarkdown([
    {
      schemaVersion: 2,
      runId: "dart-v9.9.9-residual-report",
      category: "dart",
      version: "9.9.9",
      scoredAt: "2099-01-01T00:00:00.000Z",
      metadata: { evidenceMode: "fresh" },
      scope: { kind: "category", categories: ["dart"] },
      compromisedSkills: [],
      skills: [
        {
          category: "dart",
          skillName: "dart-tooling",
          guardrailApplicable: false,
          totalEvalCases: 1,
          baselinePassRate: 0,
          withSkillPassRate: 0,
          delta: 0,
          triggerPrecision: 1,
          casePassRate: { baseline: 0, withSkill: 0 },
          assertionPassRate: { baseline: 0, withSkill: 0 },
          triggerRecall: 1,
          triggerSpecificity: 1,
          balancedTriggerAccuracy: 1,
          scores: [
            {
              id: "eval-1",
              kind: "eval",
              arm: "with-skill",
              passed: false,
              missingAnswer: false,
              suspicious: [],
              failedAssertions: ["contains:dart format | formatter"],
            },
          ],
          incompleteArms: [],
        },
      ],
    },
  ]);

  assert.match(report, /Residual Failure Matrix/);
  assert.match(report, /contains:dart format \\\| formatter/);
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

test("v2 assertion semantics tolerate formatting and equivalent syntax but keep literals exact", () => {
  assert.equal(
    checkAssertion(
      { type: "contains", value: "once()->with(100)" },
      "shouldReceive('charge')\n  ->once()\n  ->with(100)",
      2,
    ),
    true,
  );
  assert.equal(
    checkAssertion(
      { type: "contains", value: "toSignal()" },
      "Use toSignal(observable) for component state.",
      2,
    ),
    true,
  );
  assert.equal(
    checkAssertion(
      { type: "contains", value: "output<T>()" },
      "Declare selected = output<string>();",
      2,
    ),
    true,
  );
  assert.equal(
    checkAssertion(
      { type: "contains", value: "Define ProductDetail(val productId" },
      "data class ProductDetail(val productId: Long)",
      2,
    ),
    true,
  );
  assert.equal(
    checkAssertion(
      { type: "contains", value: "Pattern Matching" },
      "Use pattern-matching switch expressions.",
      2,
    ),
    true,
  );
  assert.equal(
    checkAssertion(
      { type: "contains", value: "hardcode" },
      "Never hardcoding credentials is required.",
      2,
    ),
    true,
  );
  assert.equal(
    checkAssertion(
      { type: "contains", value: "@for (item of items; track item.id)" },
      "@for (product of products(); track product.id) { ... }",
      2,
    ),
    true,
  );
  assert.equal(
    checkAssertion(
      { type: "contains", value: "assertStatus(201)" },
      "assertStatus(200)",
      2,
    ),
    false,
  );
  assert.equal(
    checkAssertion(
      { type: "contains", value: "Never use @HostBinding" },
      "Never use `@HostBinding`; use host metadata.",
      1,
    ),
    false,
  );
});

test("v2 verification rejects a modified immutable input hash", async () => {
  const { root, cleanup } = await fixture();
  try {
    const { runDir, manifest } = buildManifest("dart", "9.9.9", {
      repoRoot: root,
      runId: "dart-v9.9.9-2099-01-01-tampered-inputs",
    });
    await writeCompleteAnswers(runDir, manifest);
    scoreRun(runDir, { repoRoot: root });
    const inputsPath = path.join(runDir, "inputs.json");
    const inputs = fs.readJsonSync(inputsPath);
    inputs.sources["dart/dart-tooling"].hashes.skill = "tampered";
    fs.writeJsonSync(inputsPath, inputs, { spaces: 2 });
    const outcome = verifyRun(manifest.runId, { repoRoot: root });
    assert.equal(outcome.ok, false);
    assert.match(outcome.reason ?? "", /hash mismatch|immutable input/i);
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
    assert.equal(bodyManifest.metadata.evidenceMode, "incremental");
    assert.ok((bodyManifest.metadata.reusedAnswerCount ?? 0) > 0);
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
    const completedBodyManifest = loadManifest(bodyRun.runDir as string);
    assert.equal(completedBodyManifest.metadata.freshAnswerCount, 1);
    assert.ok((completedBodyManifest.metadata.reusedAnswerCount ?? 0) > 0);
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
    assert.equal(assertionPlan.impacts[0]?.outcome, "regrade");
    const assertionRun = createBaselineRun("dart", "9.9.9", {
      repoRoot: root,
      baselineRunId: initial.manifest.runId,
    });
    assert.ok(assertionRun.runDir);
    assert.equal(
      loadManifest(assertionRun.runDir as string).metadata.evidenceMode,
      "regraded",
    );
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

test("promotion rejects a skill whose case pass rate is at or below 85 percent", async () => {
  const { root, cleanup } = await fixture();
  try {
    const { runDir, manifest } = buildManifest("dart", "9.9.9", {
      repoRoot: root,
      runId: "dart-v9.9.9-2099-01-01-promote-case-gate",
    });
    await writeCompleteAnswers(runDir, manifest);
    const skill = manifest.skills[0];
    assert.ok(skill);
    await writeFile(
      answerPath(runDir, manifest, skill, "eval-1", "with-skill"),
      "wrong",
    );
    scoreRun(runDir, { repoRoot: root });
    assert.throws(
      () =>
        promoteCategoryBaseline(
          manifest.runId,
          "dart",
          "maintainer",
          "release gate reviewed",
          { repoRoot: root },
        ),
      /with-skill case pass must exceed 85%/i,
    );
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
    const manifest = loadManifest(runDir);
    assert.equal(manifest.metadata.evidenceMode, "fresh");
    assert.equal(manifest.metadata.freshAnswerCount, 4);
    assert.equal(manifest.metadata.reusedAnswerCount, 0);
    assert.equal(maxActive, 3);
  } finally {
    await cleanup();
  }
});

test("a short worker response is preserved for outcome scoring", async () => {
  const { root, cleanup } = await fixture();
  try {
    const { runDir } = buildManifest("dart", "9.9.9", {
      repoRoot: root,
      runId: "dart-v9.9.9-2099-01-01-short-answer",
    });
    const generated = await executeMissingAnswers(runDir, {
      repoRoot: root,
      concurrency: 1,
      runner: async () => "Done.",
    });
    assert.equal(generated, 4);
    const manifest = loadManifest(runDir);
    const skill = manifest.skills[0];
    assert.ok(skill);
    assert.ok(
      await fs.pathExists(
        answerPath(runDir, manifest, skill, "eval-1", "baseline"),
      ),
    );
    const result = scoreRun(runDir, { repoRoot: root });
    assert.ok(
      result.skills[0]?.scores
        .filter((score) => score.kind !== "trigger")
        .every((score) => score.suspicious.length === 0),
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
    assert.equal(loadManifest(runDir).metadata.freshAnswerCount, 1);
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
    await executeMissingAnswers(runDir, {
      repoRoot: root,
      concurrency: 1,
      runner: async () => "resumed answer",
    });
    assert.equal(loadManifest(runDir).metadata.freshAnswerCount, 4);
  } finally {
    await cleanup();
  }
});
