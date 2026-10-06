import assert from "node:assert/strict";
import crypto from "node:crypto";
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
import { CURRENT_INSTRUCTION_VERSION } from "./constants";
import { checkAssertion, scoreRun } from "./scorer";
import { verifyRun } from "./verify";
import { buildEvalsReportMarkdown, latestPerCategory } from "./reporter";
import { auditEvalDefinitions } from "./quality";
import { createBaselineRun, planBaseline } from "./impact";
import { promoteCategoryBaseline } from "./promote";
import { evaluateSkillReadiness } from "./readiness";
import type {
  EvalsHistory,
  InstructionVersion,
  RunResults,
  SkillProvenance,
  SkillResult,
} from "./types";
import { composeRuns } from "./compose";
import { pruneV2Runs } from "./prune";
import {
  codexExecArgs,
  EvalQuotaPausedError,
  evalWorkerConfig,
  executeMissingAnswers,
  isolatedInstruction,
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
    "--json",
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
test("composition rejects a composite with a missing selected leaf before writing output", async () => {
  const { root, cleanup } = await compositionFixture();
  try {
    const base = await makeCompleteRun(root, "base-v2.6.0");
    const overlay = await makeCompleteRun(
      root,
      "overlay-v2.6.0",
      new Set(["dart/dart-language"]),
    );
    const partial = composeRuns({
      repoRoot: root,
      baseRunId: base.manifest.runId,
      overlayRunId: overlay.manifest.runId,
      version: "2.6.0",
      outputRunId: "partial-v2.6.0",
      expectedSkillCount: 2,
    });
    const manifestPath = path.join(partial.runDir, "manifest.json");
    const resultsPath = path.join(partial.runDir, "results.json");
    const manifest = fs.readJsonSync(manifestPath);
    const results = fs.readJsonSync(resultsPath);
    delete manifest.provenance["dart/dart-tooling"];
    delete results.provenance["dart/dart-tooling"];
    fs.writeJsonSync(manifestPath, manifest, { spaces: 2 });
    fs.writeJsonSync(resultsPath, results, { spaces: 2 });
    assert.equal(verifyRun(partial.manifest.runId, { repoRoot: root }).ok, true);

    const sourceDigests = (runDir: string): Record<string, string> =>
      Object.fromEntries(
        fs
          .readdirSync(runDir, { recursive: true })
          .map(String)
          .filter((relative) =>
            fs.statSync(path.join(runDir, relative)).isFile(),
          )
          .map((relative) => [
            relative,
            crypto
              .createHash("sha256")
              .update(fs.readFileSync(path.join(runDir, relative)))
              .digest("hex"),
          ]),
      );
    const before = [base.runDir, overlay.runDir, partial.runDir].map(
      sourceDigests,
    );
    const outputRunId = "must-not-exist-v2.6.0";
    assert.throws(() =>
      composeRuns({
        repoRoot: root,
        baseRunId: partial.manifest.runId,
        overlayRunId: overlay.manifest.runId,
        version: "2.6.0",
        outputRunId,
        expectedSkillCount: 2,
      }),
    );
    assert.equal(
      fs.existsSync(path.join(root, "benchmarks", "evals", "runs", outputRunId)),
      false,
    );
    assert.deepEqual(
      [base.runDir, overlay.runDir, partial.runDir].map(sourceDigests),
      before,
    );
  } finally {
    await cleanup();
  }
});

test("composition does not infer leaf provenance for a marked composite without a provenance map", async () => {
  const { root, cleanup } = await compositionFixture();
  try {
    const base = await makeCompleteRun(root, "base-v2.6.0");
    const overlay = await makeCompleteRun(
      root,
      "overlay-v2.6.0",
      new Set(["dart/dart-language"]),
    );
    const composite = composeRuns({
      repoRoot: root,
      baseRunId: base.manifest.runId,
      overlayRunId: overlay.manifest.runId,
      version: "2.6.0",
      outputRunId: "unmapped-composite-v2.6.0",
      expectedSkillCount: 2,
    });
    const manifestPath = path.join(composite.runDir, "manifest.json");
    const resultsPath = path.join(composite.runDir, "results.json");
    const manifest = fs.readJsonSync(manifestPath);
    const results = fs.readJsonSync(resultsPath);
    delete manifest.provenance;
    delete results.provenance;
    fs.writeJsonSync(manifestPath, manifest, { spaces: 2 });
    fs.writeJsonSync(resultsPath, results, { spaces: 2 });
    assert.equal(verifyRun(composite.manifest.runId, { repoRoot: root }).ok, true);

    assert.throws(() =>
      composeRuns({
        repoRoot: root,
        baseRunId: composite.manifest.runId,
        overlayRunId: overlay.manifest.runId,
        version: "2.6.0",
        outputRunId: "must-not-infer-v2.6.0",
        expectedSkillCount: 2,
      }),
    );
    assert.equal(
      fs.existsSync(
        path.join(
          root,
          "benchmarks",
          "evals",
          "runs",
          "must-not-infer-v2.6.0",
        ),
      ),
      false,
    );
  } finally {
    await cleanup();
  }
});

test("baseline planning reuses compatible evidence from a physical v4 run without leaf provenance", async () => {
  const { root, cleanup } = await compositionFixture();
  try {
    const physical = await makeCompleteRun(root, "physical-v2.6.0");
    const evalsPath = path.join(
      root,
      "skills",
      "dart",
      "dart-tooling",
      "evals",
      "evals.json",
    );
    const evals = fs.readJsonSync(evalsPath);
    evals.evals[0].assertions = [
      { type: "contains", value: "baseline" },
    ];
    fs.writeJsonSync(evalsPath, evals);
    const plan = planBaseline("all", {
      repoRoot: root,
      baselineRunId: physical.manifest.runId,
    });
    const impact = plan.impacts.find((entry) => entry.key === "dart/dart-tooling");
    assert.ok(impact, "expected dart/dart-tooling impact");
    assert.equal(impact.outcome, "regrade");
    assert.equal(impact.activation, "reuse");
  } finally {
    await cleanup();
  }
});

test("baseline planning generates when a composite leaf protocol is unresolved", async () => {
  const { root, cleanup } = await compositionFixture();
  try {
    const base = await makeCompleteRun(root, "base-v2.6.0");
    const overlay = await makeCompleteRun(
      root,
      "overlay-v2.6.0",
      new Set(["dart/dart-language"]),
    );
    const composite = composeRuns({
      repoRoot: root,
      baseRunId: base.manifest.runId,
      overlayRunId: overlay.manifest.runId,
      version: "2.6.0",
      outputRunId: "partial-v2.6.0",
      expectedSkillCount: 2,
    });
    fs.removeSync(base.runDir);
    fs.removeSync(overlay.runDir);
    const manifestPath = path.join(composite.runDir, "manifest.json");
    const resultsPath = path.join(composite.runDir, "results.json");
    const manifest = fs.readJsonSync(manifestPath);
    const results = fs.readJsonSync(resultsPath);
    delete manifest.provenance["dart/dart-tooling"];
    delete results.provenance["dart/dart-tooling"];
    fs.writeJsonSync(manifestPath, manifest, { spaces: 2 });
    fs.writeJsonSync(resultsPath, results, { spaces: 2 });
    assert.equal(verifyRun(composite.manifest.runId, { repoRoot: root }).ok, true);

    const evalsPath = path.join(
      root,
      "skills",
      "dart",
      "dart-tooling",
      "evals",
      "evals.json",
    );
    const evals = fs.readJsonSync(evalsPath);
    evals.evals[0].assertions = [
      { type: "contains", value: "changed assertion" },
    ];
    fs.writeJsonSync(evalsPath, evals);

    const plan = planBaseline("all", {
      repoRoot: root,
      baselineRunId: composite.manifest.runId,
    });
    const impact = plan.impacts.find((entry) => entry.key === "dart/dart-tooling");
    assert.ok(impact, "expected dart/dart-tooling impact");
    assert.equal(impact.outcome, "generate");
    assert.equal(impact.activation, "generate");
    assert.equal(impact.reuseBaselineOutcome, false);
  } finally {
    await cleanup();
  }
});

test("baseline planning does not treat a composite with no provenance map as physical v4 evidence", async () => {
  const { root, cleanup } = await compositionFixture();
  try {
    const base = await makeCompleteRun(root, "base-v2.6.0");
    const overlay = await makeCompleteRun(
      root,
      "overlay-v2.6.0",
      new Set(["dart/dart-language"]),
    );
    const composite = composeRuns({
      repoRoot: root,
      baseRunId: base.manifest.runId,
      overlayRunId: overlay.manifest.runId,
      version: "2.6.0",
      outputRunId: "unmapped-composite-v2.6.0",
      expectedSkillCount: 2,
    });
    fs.removeSync(base.runDir);
    fs.removeSync(overlay.runDir);
    const manifestPath = path.join(composite.runDir, "manifest.json");
    const resultsPath = path.join(composite.runDir, "results.json");
    const manifest = fs.readJsonSync(manifestPath);
    const results = fs.readJsonSync(resultsPath);
    delete manifest.provenance;
    delete results.provenance;
    fs.writeJsonSync(manifestPath, manifest, { spaces: 2 });
    fs.writeJsonSync(resultsPath, results, { spaces: 2 });
    assert.equal(verifyRun(composite.manifest.runId, { repoRoot: root }).ok, true);

    const evalsPath = path.join(
      root,
      "skills",
      "dart",
      "dart-tooling",
      "evals",
      "evals.json",
    );
    const evals = fs.readJsonSync(evalsPath);
    evals.evals[0].assertions = [
      { type: "contains", value: "changed assertion" },
    ];
    fs.writeJsonSync(evalsPath, evals);
    const plan = planBaseline("all", {
      repoRoot: root,
      baselineRunId: composite.manifest.runId,
    });
    const impact = plan.impacts.find((entry) => entry.key === "dart/dart-tooling");
    assert.ok(impact, "expected dart/dart-tooling impact");
    assert.equal(impact.outcome, "generate");
    assert.equal(impact.activation, "generate");
    assert.equal(impact.reuseBaselineOutcome, false);
  } finally {
    await cleanup();
  }
});

test("composition upgrades a compatible historical base to the overlay protocol while recording provenance", async () => {
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
      CURRENT_INSTRUCTION_VERSION,
    );
    assert.equal(
      output.manifest.provenance?.["dart/dart-tooling"]?.protocol
        .instructionVersion,
      "governing-skill-v1",
    );
    assert.equal(
      output.manifest.provenance?.["dart/dart-language"]?.protocol
        .instructionVersion,
      CURRENT_INSTRUCTION_VERSION,
    );
    assert.equal(output.manifest.metadata.protocolProvenance, "mixed");
    assert.equal(output.manifest.metadata.isHomogeneousProtocol, false);
  } finally {
    await cleanup();
  }
});
test("composite recovery refuses to regenerate a missing historical lane", async () => {
  const { root, cleanup } = await compositionFixture();
  try {
    const base = await makeCompleteRun(root, "historical-base-v2.6.0");
    const historicalManifestPath = path.join(base.runDir, "manifest.json");
    const historicalManifest = fs.readJsonSync(historicalManifestPath);
    historicalManifest.protocol.instructionVersion = "governing-skill-v1";
    fs.writeJsonSync(historicalManifestPath, historicalManifest, { spaces: 2 });
    const overlay = await makeCompleteRun(
      root,
      "current-overlay-v2.6.0",
      new Set(["dart/dart-language"]),
    );
    const composite = composeRuns({
      repoRoot: root,
      baseRunId: base.manifest.runId,
      overlayRunId: overlay.manifest.runId,
      version: "2.6.0",
      outputRunId: "immutable-composite-v2.6.0",
      expectedSkillCount: 2,
    });
    const missingLane = path.join(
      composite.runDir,
      "answers",
      "dart",
      "dart-tooling",
      "eval-1.baseline.md",
    );
    fs.removeSync(missingLane);
    const manifestPath = path.join(composite.runDir, "manifest.json");
    const manifestBefore = fs.readFileSync(manifestPath);
    const resultsPath = path.join(composite.runDir, "results.json");
    const resultsBefore = fs.readFileSync(resultsPath);
    let runnerCalls = 0;

    await assert.rejects(
      executeMissingAnswers(composite.runDir, {
        repoRoot: root,
        runner: async () => {
          runnerCalls += 1;
          return "regenerated historical lane";
        },
      }),
      /composite.*immutable|immutable.*composite/i,
    );

    assert.equal(runnerCalls, 0);
    assert.equal(fs.existsSync(missingLane), false);
    assert.deepEqual(fs.readFileSync(manifestPath), manifestBefore);
    assert.deepEqual(fs.readFileSync(resultsPath), resultsBefore);
    assert.equal(
      composite.manifest.provenance?.["dart/dart-tooling"]?.protocol
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

function makeProtocolSkill(category: string, skillName: string): SkillResult {
  return {
    category,
    skillName,
    guardrailApplicable: false,
    totalEvalCases: 1,
    baselinePassRate: 1,
    withSkillPassRate: 1,
    delta: 0,
    triggerPrecision: 1,
    casePassRate: { baseline: 1, withSkill: 1 },
    assertionPassRate: { baseline: 1, withSkill: 1 },
    triggerRecall: 1,
    triggerSpecificity: 1,
    balancedTriggerAccuracy: 1,
    scores: [],
    incompleteArms: [],
  };
}

function makeProtocolProvenance(
  sourceRunId: string,
  instructionVersion: InstructionVersion,
): SkillProvenance {
  return {
    sourceRunId,
    sourceHash: { skill: "skill-hash", evals: "evals-hash" },
    protocol: {
      instructionVersion,
      isolation: "worker-per-arm",
      baseline: "prompt-only",
      withSkill: "prompt-plus-skill",
      trigger: "name-description-only",
    },
    evidenceMode: "fresh",
  };
}

function makeProtocolReportRun(
  runId: string,
  category: string,
  scoredAt: string,
  skills: SkillResult[],
  provenance: Record<string, SkillProvenance>,
): RunResults {
  const categories = [...new Set(skills.map((skill) => skill.category))].sort();
  return {
    schemaVersion: 2,
    runId,
    category,
    version: "1.0.0",
    scoredAt,
    metadata: {
      evidenceMode: "composite",
      protocolProvenance: "neutral-skill-v4",
    },
    scope: {
      kind: category === "all" ? "all" : "category",
      categories,
    },
    compromisedSkills: [],
    provenance,
    skills,
  };
}

function tableRowCells(
  report: string,
  section: string,
  firstCell: string,
): string[] {
  const sectionStart = report.indexOf(section);
  assert.notEqual(sectionStart, -1, `missing report section ${section}`);
  const row = report
    .slice(sectionStart)
    .split("\n")
    .find((line) => {
      if (!line.startsWith("|")) return false;
      const cells = line
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.replaceAll("**", "").replaceAll("`", "").trim());
      return cells[0] === firstCell;
    });
  assert.ok(row, `missing table row ${firstCell}`);
  return row
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.replaceAll("**", "").replaceAll("`", "").trim());
}

test("report preserves mixed and unresolved provenance within one group", () => {
  const report = buildEvalsReportMarkdown([
    makeProtocolReportRun(
      "group-partial-provenance",
      "all",
      "2099-01-01T00:00:00.000Z",
      [
        makeProtocolSkill("dart", "dart-v1"),
        makeProtocolSkill("dart", "dart-v4"),
        makeProtocolSkill("dart", "dart-unresolved"),
      ],
      {
        "dart/dart-v1": makeProtocolProvenance(
          "historical-v1",
          "governing-skill-v1",
        ),
        "dart/dart-v4": makeProtocolProvenance(
          "current-v4",
          "neutral-skill-v4",
        ),
      },
    ),
  ]);

  assert.equal(
    tableRowCells(report, "## 🔢 Executive Summary", "Protocol provenance")[1],
    "mixed",
  );
  assert.equal(
    tableRowCells(
      report,
      "## 🔢 Executive Summary",
      "Unresolved protocol contributors",
    )[1],
    "1",
  );
  assert.equal(
    tableRowCells(report, "## 📋 Per-Skill Detail", "dart-unresolved")[2],
    "unknown",
  );
});

test("report unions known protocols across categories and retains unresolved contributors", () => {
  const report = buildEvalsReportMarkdown([
    makeProtocolReportRun(
      "category-a-partial",
      "angular",
      "2099-01-01T00:00:00.000Z",
      [
        makeProtocolSkill("angular", "angular-v1"),
        makeProtocolSkill("angular", "angular-unresolved"),
      ],
      {
        "angular/angular-v1": makeProtocolProvenance(
          "historical-v1",
          "governing-skill-v1",
        ),
      },
    ),
    makeProtocolReportRun(
      "category-b-known",
      "dart",
      "2099-01-02T00:00:00.000Z",
      [makeProtocolSkill("dart", "dart-v4")],
      {
        "dart/dart-v4": makeProtocolProvenance(
          "current-v4",
          "neutral-skill-v4",
        ),
      },
    ),
  ]);

  assert.equal(
    tableRowCells(report, "## 🔢 Executive Summary", "Protocol provenance")[1],
    "mixed",
  );
  assert.equal(
    tableRowCells(
      report,
      "## 🔢 Executive Summary",
      "Unresolved protocol contributors",
    )[1],
    "1",
  );
  assert.equal(
    tableRowCells(report, "## 📦 Per-Category Results", "dart")[3],
    "neutral-skill-v4",
  );
  assert.equal(
    tableRowCells(report, "## 📋 Per-Skill Detail", "angular-v1")[2],
    "governing-skill-v1",
  );
  assert.equal(
    tableRowCells(report, "## 📋 Per-Skill Detail", "angular-unresolved")[2],
    "unknown",
  );
});

test("physical history uses complete-run provenance, not the selected category projection", () => {
  const physicalRun = makeProtocolReportRun(
    "physical-partial-run",
    "all",
    "2026-01-01T00:00:00.000Z",
    [
      makeProtocolSkill("angular", "angular-v1"),
      makeProtocolSkill("angular", "angular-unresolved"),
      makeProtocolSkill("dart", "dart-v4"),
    ],
    {
      "angular/angular-v1": makeProtocolProvenance(
        "historical-v1",
        "governing-skill-v1",
      ),
      "dart/dart-v4": makeProtocolProvenance("current-v4", "neutral-skill-v4"),
    },
  );
  const laterAngular = makeProtocolReportRun(
    "later-angular-v4",
    "angular",
    "2099-01-01T00:00:00.000Z",
    [makeProtocolSkill("angular", "angular-v4")],
    {
      "angular/angular-v4": makeProtocolProvenance(
        "current-v4",
        "neutral-skill-v4",
      ),
    },
  );
  const history: EvalsHistory = {
    lastUpdated: physicalRun.scoredAt,
    records: [
      {
        runId: physicalRun.runId,
        category: "all",
        version: physicalRun.version,
        date: physicalRun.scoredAt,
        skillCount: physicalRun.skills.length,
        avgBaselinePassRate: 1,
        avgWithSkillPassRate: 1,
        avgDelta: 0,
        protocolProvenance: "neutral-skill-v4",
      },
    ],
  };
  const historicalStateBefore = Buffer.from(
    JSON.stringify({ physicalRun, history }),
  );

  const report = buildEvalsReportMarkdown([physicalRun, laterAngular], history);

  assert.equal(
    tableRowCells(report, "## 🔢 Executive Summary", "Protocol provenance")[1],
    "neutral-skill-v4",
  );
  const historyRow = tableRowCells(
    report,
    "## 📜 Physical Run History",
    physicalRun.runId,
  );
  assert.equal(historyRow[8], "mixed");
  assert.equal(historyRow[9], "1");
  assert.deepEqual(
    Buffer.from(JSON.stringify({ physicalRun, history })),
    historicalStateBefore,
  );
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

test("v2 snapshots deterministically fingerprint package resources and detect byte tampering", async () => {
  const { root, cleanup } = await fixture();
  try {
    const resourcePath = path.join(
      root,
      "skills",
      "dart",
      "dart-tooling",
      "references",
      "formatter.md",
    );
    await fs.outputFile(resourcePath, "Use the project formatter.\n");
    const { runDir, manifest } = buildManifest("dart", "9.9.9", {
      repoRoot: root,
      runId: "dart-v9.9.9-resource-snapshot",
    });
    const fingerprint = manifest.resourceFingerprints?.["dart/dart-tooling"];
    assert.equal(fingerprint?.version, 1);
    assert.deepEqual(
      Object.keys(fingerprint?.resources ?? {}),
      [...Object.keys(fingerprint?.resources ?? {})].sort((left, right) =>
        left.localeCompare(right),
      ),
    );
    assert.ok(fingerprint?.resources["references/formatter.md"]);
    assert.ok(fingerprint?.resources["SKILL.md"]);
    assert.ok(!fingerprint?.resources["evals/evals.json"]);
    await writeCompleteAnswers(runDir, manifest);
    scoreRun(runDir, { repoRoot: root });

    const inputsPath = path.join(runDir, "inputs.json");
    const inputs = fs.readJsonSync(inputsPath);
    inputs.sources["dart/dart-tooling"].resources["references/formatter.md"] =
      Buffer.from("Tampered resource bytes.\n").toString("base64");
    fs.writeJsonSync(inputsPath, inputs, { spaces: 2 });

    const outcome = verifyRun(manifest.runId, { repoRoot: root });
    assert.equal(outcome.ok, false);
    assert.match(outcome.reason ?? "", /resource.*mismatch/i);
  } finally {
    await cleanup();
  }
});

test("registry attribution drift invalidates evidence unless overridden by package attribution", async () => {
  const { root, cleanup } = await fixture();
  try {
    await fs.outputFile(path.join(root, "LICENSE"), "Registry license one\n");
    const initial = buildManifest("dart", "9.9.9", {
      repoRoot: root,
      runId: "dart-registry-attribution",
    });
    await writeCompleteAnswers(initial.runDir, initial.manifest);
    scoreRun(initial.runDir, { repoRoot: root });
    await fs.writeFile(path.join(root, "LICENSE"), "Registry license two\n");
    const changed = planBaseline("dart", {
      repoRoot: root,
      baselineRunId: initial.manifest.runId,
    });
    assert.equal(changed.impacts[0]?.outcome, "generate");

    await fs.outputFile(
      path.join(root, "skills/dart/dart-tooling/License"),
      "Package-specific license\n",
    );
    const overridden = buildManifest("dart", "9.9.9", {
      repoRoot: root,
      runId: "dart-package-attribution",
    });
    await writeCompleteAnswers(overridden.runDir, overridden.manifest);
    scoreRun(overridden.runDir, { repoRoot: root });
    await fs.writeFile(path.join(root, "LICENSE"), "Registry license three\n");
    const unchanged = planBaseline("dart", {
      repoRoot: root,
      baselineRunId: overridden.manifest.runId,
    });
    assert.deepEqual(unchanged.impacts, []);
  } finally {
    await cleanup();
  }
});

test("package resource changes regenerate with-skill evidence but retain prompt-only and activation reuse", async () => {
  const { root, cleanup } = await fixture();
  try {
    const resourcePath = path.join(
      root,
      "skills",
      "dart",
      "dart-tooling",
      "references",
      "formatter.md",
    );
    await fs.outputFile(resourcePath, "Use the project formatter.\n");
    const initial = buildManifest("dart", "9.9.9", {
      repoRoot: root,
      runId: "dart-v9.9.9-resource-reference",
    });
    await writeCompleteAnswers(initial.runDir, initial.manifest);
    scoreRun(initial.runDir, { repoRoot: root });

    await writeFile(resourcePath, "Use the project formatter with analysis.\n");
    const plan = planBaseline("dart", {
      repoRoot: root,
      baselineRunId: initial.manifest.runId,
    });
    assert.equal(plan.impacts[0]?.outcome, "generate");
    assert.equal(plan.impacts[0]?.activation, "reuse");
    assert.equal(plan.impacts[0]?.reuseBaselineOutcome, true);

    const next = createBaselineRun("dart", "9.9.9", {
      repoRoot: root,
      baselineRunId: initial.manifest.runId,
    });
    assert.ok(next.runDir);
    const manifest = loadManifest(next.runDir);
    const skill = manifest.skills[0];
    assert.ok(skill);
    assert.equal(
      await fs.pathExists(
        answerPath(next.runDir, manifest, skill, "eval-1", "baseline"),
      ),
      true,
    );
    assert.equal(
      await fs.pathExists(
        answerPath(next.runDir, manifest, skill, "eval-1", "with-skill"),
      ),
      false,
    );
    assert.equal(
      await fs.pathExists(
        answerPath(next.runDir, manifest, skill, "trigger-1"),
      ),
      true,
    );
  } finally {
    await cleanup();
  }
});

test("promotion requires whole-package provenance and re-verifies immutable inputs and results", async () => {
  const { root, cleanup } = await fixture();
  try {
    const { runDir, manifest } = buildManifest("dart", "9.9.9", {
      repoRoot: root,
      runId: "dart-v9.9.9-resource-promotion",
    });
    await writeCompleteAnswers(runDir, manifest);
    scoreRun(runDir, { repoRoot: root });

    const manifestPath = path.join(runDir, "manifest.json");
    const legacyManifest = fs.readJsonSync(manifestPath);
    delete legacyManifest.resourceFingerprints;
    fs.writeJsonSync(manifestPath, legacyManifest, { spaces: 2 });
    assert.equal(verifyRun(manifest.runId, { repoRoot: root }).ok, true);
    assert.throws(
      () =>
        promoteCategoryBaseline(
          manifest.runId,
          "dart",
          "maintainer",
          "release gate reviewed",
          { repoRoot: root },
        ),
      /resource provenance/i,
    );

    fs.writeJsonSync(manifestPath, manifest, { spaces: 2 });
    const inputsPath = path.join(runDir, "inputs.json");
    const originalInputs = fs.readJsonSync(inputsPath);
    const tamperedInputs = structuredClone(originalInputs);
    tamperedInputs.sources["dart/dart-tooling"].resources["SKILL.md"] =
      Buffer.from("tampered").toString("base64");
    fs.writeJsonSync(inputsPath, tamperedInputs, { spaces: 2 });
    assert.throws(
      () =>
        promoteCategoryBaseline(
          manifest.runId,
          "dart",
          "maintainer",
          "release gate reviewed",
          { repoRoot: root },
        ),
      /not verified|resource.*mismatch/i,
    );
    fs.writeJsonSync(inputsPath, originalInputs, { spaces: 2 });
    const withSkillAnswer = answerPath(
      runDir,
      manifest,
      manifest.skills[0]!,
      "eval-1",
      "with-skill",
    );
    await fs.remove(withSkillAnswer);
    assert.throws(
      () =>
        promoteCategoryBaseline(
          manifest.runId,
          "dart",
          "maintainer",
          "release gate reviewed",
          { repoRoot: root },
        ),
      /not verified|incomplete/i,
    );
    await writeFile(withSkillAnswer, "tampered transcript");
    assert.throws(
      () =>
        promoteCategoryBaseline(
          manifest.runId,
          "dart",
          "maintainer",
          "release gate reviewed",
          { repoRoot: root },
        ),
      /not verified|recomputed scores/i,
    );
  } finally {
    await cleanup();
  }
});

test("v2 verification binds scored source objects to raw skill and eval bytes", async () => {
  const { root, cleanup } = await fixture();
  try {
    const { runDir, manifest } = buildManifest("dart", "9.9.9", {
      repoRoot: root,
      runId: "dart-v9.9.9-raw-source-integrity",
    });
    await writeCompleteAnswers(runDir, manifest);
    scoreRun(runDir, { repoRoot: root });

    const inputsPath = path.join(runDir, "inputs.json");
    const inputs = fs.readJsonSync(inputsPath);
    const source = inputs.sources["dart/dart-tooling"];
    source.skillMarkdownBase64 = Buffer.from(
      await readFile(
        path.join(root, "skills", "dart", "dart-tooling", "SKILL.md"),
      ),
    ).toString("base64");
    source.evalsBase64 = Buffer.from(
      await readFile(
        path.join(
          root,
          "skills",
          "dart",
          "dart-tooling",
          "evals",
          "evals.json",
        ),
      ),
    ).toString("base64");

    source.skillMarkdown = "Tampered skill body.";
    fs.writeJsonSync(inputsPath, inputs, { spaces: 2 });
    let outcome = verifyRun(manifest.runId, { repoRoot: root });
    assert.equal(outcome.ok, false);
    assert.match(outcome.reason ?? "", /raw skill snapshot mismatch/i);

    source.skillMarkdown = Buffer.from(
      source.skillMarkdownBase64,
      "base64",
    ).toString("utf8");
    source.evals.evals[0].assertions = [
      { type: "contains", value: "formatter" },
    ];
    fs.writeJsonSync(inputsPath, inputs, { spaces: 2 });
    outcome = verifyRun(manifest.runId, { repoRoot: root });
    assert.equal(outcome.ok, false);
    assert.match(outcome.reason ?? "", /raw eval snapshot mismatch/i);
  } finally {
    await cleanup();
  }
});

test("resumeManifest and executeMissingAnswers reject historical protocol mismatches", async () => {
  const { root, cleanup } = await fixture();
  try {
    const { runDir, manifest } = buildManifest("dart", "9.9.9", {
      repoRoot: root,
      now: new Date("2099-01-01T00:00:00.000Z"),
    });
    const manifestPath = path.join(runDir, "manifest.json");
    const rawManifest = fs.readJsonSync(manifestPath);
    rawManifest.protocol.instructionVersion = "governing-skill-v3";
    fs.writeJsonSync(manifestPath, rawManifest, { spaces: 2 });

    assert.throws(
      () => resumeManifest(manifest.runId, { repoRoot: root }),
      /protocol version mismatch.*governing-skill-v3/i,
    );

    await assert.rejects(
      () =>
        executeMissingAnswers(runDir, {
          repoRoot: root,
          runner: async () => "answer",
        }),
      /Cannot execute answers for protocol 'governing-skill-v3'/i,
    );
  } finally {
    await cleanup();
  }
});

test("planBaseline and evidence compatibility exclude historical coached answers from fresh neutral runs", async () => {
  const { root, cleanup } = await fixture();
  try {
    const initial = buildManifest("dart", "9.9.9", {
      repoRoot: root,
      now: new Date("2099-01-01T00:00:00.000Z"),
    });
    const manifestPath = path.join(initial.runDir, "manifest.json");
    const rawManifest = fs.readJsonSync(manifestPath);
    rawManifest.protocol.instructionVersion = "governing-skill-v3";
    fs.writeJsonSync(manifestPath, rawManifest, { spaces: 2 });

    // Fill answers so run appears complete
    for (const skill of initial.manifest.skills) {
      for (const c of skill.cases) {
        const arms: Array<"baseline" | "with-skill" | undefined> =
          c.kind === "trigger" ? [undefined] : ["baseline", "with-skill"];
        for (const arm of arms) {
          const p = answerPath(initial.runDir, initial.manifest, skill, c.id, arm);
          fs.ensureDirSync(path.dirname(p));
          fs.writeFileSync(p, "answer\n");
        }
      }
    }
    scoreRun(initial.runDir, { repoRoot: root });

    const plan = planBaseline("dart", {
      repoRoot: root,
      baselineRunId: initial.manifest.runId,
    });
    for (const impact of plan.impacts) {
      assert.equal(impact.outcome, "generate");
      assert.equal(impact.activation, "generate");
      assert.equal(impact.reuseBaselineOutcome, false);
      assert.match(impact.reason, /generation protocol/i);
    }

    const baselineRun = createBaselineRun("dart", "9.9.9", {
      repoRoot: root,
      baselineRunId: initial.manifest.runId,
    });
    assert.equal(baselineRun.reusedAnswers, 0);
    const createdManifest = loadManifest(baselineRun.runDir as string);
    assert.equal(createdManifest.metadata.evidenceMode, "fresh");
    assert.equal(createdManifest.protocol.instructionVersion, CURRENT_INSTRUCTION_VERSION);
  } finally {
    await cleanup();
  }
});

test("promoteCategoryBaseline rejects promotion of historical protocol runs", async () => {
  const { root, cleanup } = await fixture();
  try {
    const { runDir, manifest } = buildManifest("dart", "9.9.9", {
      repoRoot: root,
      now: new Date("2099-01-01T00:00:00.000Z"),
    });
    for (const skill of manifest.skills) {
      for (const c of skill.cases) {
        const arms: Array<"baseline" | "with-skill" | undefined> =
          c.kind === "trigger" ? [undefined] : ["baseline", "with-skill"];
        for (const arm of arms) {
          const p = answerPath(runDir, manifest, skill, c.id, arm);
          fs.ensureDirSync(path.dirname(p));
          fs.writeFileSync(p, "answer mentions dart format\n");
        }
      }
    }
    scoreRun(runDir, { repoRoot: root });
    const manifestPath = path.join(runDir, "manifest.json");
    const rawManifest = fs.readJsonSync(manifestPath);
    rawManifest.protocol.instructionVersion = "governing-skill-v3";
    fs.writeJsonSync(manifestPath, rawManifest, { spaces: 2 });

    assert.throws(
      () =>
        promoteCategoryBaseline(manifest.runId, "dart", "reviewer", "reason", {
          repoRoot: root,
        }),
      /Promotion requires current generation protocol neutral-skill-v4/i,
    );
  } finally {
    await cleanup();
  }
});
test("createBaselineRun resumes only incomplete candidates with matching impacts, keys, and protocol", async () => {
  const { root, cleanup } = await fixture();
  try {
    const initial = buildManifest("dart", "9.9.9", {
      repoRoot: root,
      now: new Date("2099-01-01T00:00:00.000Z"),
    });
    for (const skill of initial.manifest.skills) {
      for (const currentCase of skill.cases) {
        const arms: Array<"baseline" | "with-skill" | undefined> =
          currentCase.kind === "trigger"
            ? [undefined]
            : ["baseline", "with-skill"];
        for (const arm of arms) {
          const answer = answerPath(
            initial.runDir,
            initial.manifest,
            skill,
            currentCase.id,
            arm,
          );
          fs.ensureDirSync(path.dirname(answer));
          fs.writeFileSync(answer, "answer\n");
        }
      }
    }
    scoreRun(initial.runDir, { repoRoot: root });

    await writeFile(
      path.join(root, "skills", "dart", "dart-tooling", "evals", "evals.json"),
      JSON.stringify({
        evals: [
          {
            id: 1,
            prompt: "How should this Dart code be formatted?",
            assertions: [{ type: "contains", value: "changed answer" }],
          },
        ],
        should_trigger: ["Format this Dart code with the project tool."],
        should_not_trigger: ["Design a database migration."],
      }),
    );
    const plan = planBaseline("dart", {
      repoRoot: root,
      baselineRunId: initial.manifest.runId,
    });
    assert.ok(plan.impacts.length > 0, "fixture must produce a candidate impact");

    const mismatchedCandidate = buildManifest("dart", "9.9.9", {
      repoRoot: root,
      baselineRunId: initial.manifest.runId,
      runId: "dart-incomplete-mismatched",
      selectedSkills: new Set(),
    });
    const run1 = createBaselineRun("dart", "9.9.9", {
      repoRoot: root,
      baselineRunId: initial.manifest.runId,
    });
    assert.notEqual(run1.runId, mismatchedCandidate.manifest.runId);
    if (run1.runDir) fs.removeSync(run1.runDir);

    const historicalCandidate = buildManifest("dart", "9.9.9", {
      repoRoot: root,
      baselineRunId: initial.manifest.runId,
      runId: "dart-incomplete-v3",
      selectedSkills: new Set(plan.impacts.map((impact) => impact.key)),
    });
    const histPath = path.join(historicalCandidate.runDir, "manifest.json");
    const histManifest = fs.readJsonSync(histPath);
    histManifest.protocol.instructionVersion = "governing-skill-v3";
    fs.writeJsonSync(histPath, histManifest, { spaces: 2 });
    const run2 = createBaselineRun("dart", "9.9.9", {
      repoRoot: root,
      baselineRunId: initial.manifest.runId,
    });
    assert.notEqual(run2.runId, historicalCandidate.manifest.runId);
    if (run2.runDir) fs.removeSync(run2.runDir);

    const matchingCandidate = buildManifest("dart", "9.9.9", {
      repoRoot: root,
      baselineRunId: initial.manifest.runId,
      runId: "dart-incomplete-matching",
      selectedSkills: new Set(plan.impacts.map((impact) => impact.key)),
    });
    const run3 = createBaselineRun("dart", "9.9.9", {
      repoRoot: root,
      baselineRunId: initial.manifest.runId,
    });
    assert.equal(run3.resumed, true);
    assert.equal(run3.runId, matchingCandidate.manifest.runId);
  } finally {
    await cleanup();
  }
});

test("historical v1 and v3 runs remain readable and verifiable without mutation", async () => {
  const { root, cleanup } = await fixture();
  try {
    // 1. Construct genuine v1 fixture (no schemaVersion, no inputs.json)
    const v1RunId = "dart-v1.0.0-historical";
    const v1Dir = path.join(root, "benchmarks", "evals", "runs", v1RunId);
    const v1Skill = {
      category: "dart",
      skillName: "dart-tooling",
      skillPath: "skills/dart/dart-tooling/SKILL.md",
      guardrailApplicable: false,
      cases: [
        {
          id: "eval-1",
          kind: "eval" as const,
          arms: { baseline: "done" as const, "with-skill": "done" as const },
        },
      ],
    };
    const v1Manifest = {
      runId: v1RunId,
      category: "dart",
      version: "1.0.0",
      metadata: { agent: "v1-agent" },
      skills: [v1Skill],
    };
    const v1AnswersDir = path.join(v1Dir, "answers", "dart-tooling");
    fs.ensureDirSync(v1AnswersDir);
    const v1Transcript =
      "Independent historical v1 answer transcript; no expected output was copied.";
    fs.writeFileSync(
      path.join(v1AnswersDir, "eval-1.baseline.md"),
      v1Transcript,
    );
    fs.writeFileSync(
      path.join(v1AnswersDir, "eval-1.with-skill.md"),
      v1Transcript,
    );
    fs.writeJsonSync(path.join(v1Dir, "manifest.json"), v1Manifest, {
      spaces: 2,
    });
    scoreRun(v1Dir, { repoRoot: root });

    // 2. Construct genuine v3 fixture (schemaVersion 2, governing-skill-v3, inputs.json)
    const v3RunId = "dart-v2.6.0-historical";
    const { runDir: v3Dir, manifest: v3Built } = buildManifest("dart", "2.6.0", {
      repoRoot: root,
      runId: v3RunId,
    });
    for (const skill of v3Built.skills) {
      for (const currentCase of skill.cases) {
        const arms: Array<"baseline" | "with-skill" | undefined> =
          currentCase.kind === "trigger"
            ? [undefined]
            : ["baseline", "with-skill"];
        for (const arm of arms) {
          const answer = answerPath(
            v3Dir,
            v3Built,
            skill,
            currentCase.id,
            arm,
          );
          fs.ensureDirSync(path.dirname(answer));
          const transcript =
            currentCase.kind === "trigger"
              ? `CASE: ${currentCase.id}\nTRIGGER: ${currentCase.expectedTrigger}\nIndependent historical v3 trigger transcript.`
              : "Independent historical v3 answer transcript; no expected output was copied.";
          fs.writeFileSync(answer, transcript);
        }
      }
    }
    const v3ManifestPath = path.join(v3Dir, "manifest.json");
    const v3Raw = fs.readJsonSync(v3ManifestPath);
    v3Raw.protocol.instructionVersion = "governing-skill-v3";
    fs.writeJsonSync(v3ManifestPath, v3Raw, { spaces: 2 });
    scoreRun(v3Dir, { repoRoot: root });

    // Digest helper for asserting zero file mutations
    const getFileDigests = (dir: string): Record<string, string> => {
      const files = fs
        .readdirSync(dir, { recursive: true })
        .map(String)
        .filter((f) => fs.statSync(path.join(dir, f)).isFile());
      const result: Record<string, string> = {};
      for (const file of files.sort()) {
        result[file] = crypto
          .createHash("sha256")
          .update(fs.readFileSync(path.join(dir, file)))
          .digest("hex");
      }
      return result;
    };

    // Record digests before verification
    const v1Before = getFileDigests(v1Dir);
    const v3Before = getFileDigests(v3Dir);

    // Run nonwriting verifyRun on both
    const v1Verify = verifyRun(v1RunId, { repoRoot: root });
    assert.equal(v1Verify.ok, true, `v1 verifyRun failed: ${v1Verify.reason}`);

    const v3Verify = verifyRun(v3RunId, { repoRoot: root });
    assert.equal(v3Verify.ok, true, `v3 verifyRun failed: ${v3Verify.reason}`);

    // Verify files remain byte-exact identical (zero mutation)
    assert.deepEqual(
      getFileDigests(v1Dir),
      v1Before,
      "v1 fixture files mutated during verifyRun",
    );
    assert.deepEqual(
      getFileDigests(v3Dir),
      v3Before,
      "v3 fixture files mutated during verifyRun",
    );

    // Verify manifests still hold their historical protocol labels
    const v1Loaded = loadManifest(v1Dir);
    assert.equal(v1Loaded.schemaVersion, 1);
    assert.equal(
      Object.hasOwn(
        fs.readJsonSync(path.join(v1Dir, "manifest.json")),
        "schemaVersion",
      ),
      false,
    );

    const v3Loaded = loadManifest(v3Dir);
    assert.equal(v3Loaded.protocol?.instructionVersion, "governing-skill-v3");
  } finally {
    await cleanup();
  }
});

test("mixed composite reports source protocols per category and keep the notice outside the summary table", async () => {
  const { root, cleanup } = await compositionFixture();
  try {
    const metadataPath = path.join(root, "skills", "metadata.json");
    const metadata = fs.readJsonSync(metadataPath);
    metadata.categories.angular = { version: "1.0.0", tag_prefix: "angular-v" };
    fs.writeJsonSync(metadataPath, metadata, { spaces: 2 });
    const angularSkillDir = path.join(root, "skills", "angular", "angular-tooling");
    fs.ensureDirSync(path.join(angularSkillDir, "evals"));
    fs.writeFileSync(
      path.join(angularSkillDir, "SKILL.md"),
      "---\nname: angular-tooling\ndescription: Angular tooling\n---\nUse Angular.\n",
    );
    fs.writeJsonSync(
      path.join(angularSkillDir, "evals", "evals.json"),
      {
        evals: [
          {
            id: 1,
            prompt: "Explain Angular tooling.",
            assertions: [{ type: "contains", value: "answer" }],
          },
        ],
      },
    );

    const base = await makeCompleteRun(root, "base-v2.6.0");
    const baseManifestPath = path.join(base.runDir, "manifest.json");
    const baseManifest = fs.readJsonSync(baseManifestPath);
    baseManifest.protocol.instructionVersion = "governing-skill-v1";
    fs.writeJsonSync(baseManifestPath, baseManifest, { spaces: 2 });
    const overlay = await makeCompleteRun(
      root,
      "overlay-v2.6.0",
      new Set(["dart/dart-language", "angular/angular-tooling"]),
    );

    const output = composeRuns({
      repoRoot: root,
      baseRunId: base.manifest.runId,
      overlayRunId: overlay.manifest.runId,
      version: "2.6.0",
      outputRunId: "all-v2.6.0",
      expectedSkillCount: 3,
    });

    const report = buildEvalsReportMarkdown([output.results]);
    assert.match(
      report,
      /Measured transcript-assertion evidence, not structural or executable task verification/i,
    );
    assert.match(report, /Protocol provenance.*mixed/i);
    assert.match(report, /Cross-Protocol Composite Notice/i);
    assert.match(
      report,
      /Aggregate pass rates represent a heterogeneous composite, not a homogeneous comparison/i,
    );
    assert.match(report, /\| dart \| .* \| mixed \|/);
    assert.match(report, /\| angular \| .* \| neutral-skill-v4 \|/);
    assert.match(report, /dart-tooling.*governing-skill-v1/);
    assert.match(report, /dart-language.*neutral-skill-v4/);
    assert.match(report, /angular-tooling.*neutral-skill-v4/);

    const summaryStart = report.indexOf("## 🔢 Executive Summary");
    const summaryEnd = report.indexOf("## 📦 Per-Category Results", summaryStart);
    const summary = report.slice(summaryStart, summaryEnd);
    const lastSummaryRow = summary.indexOf("| Skills meeting ≥90% recall and specificity |");
    const notice = summary.indexOf("> ⚠️ **Cross-Protocol Composite Notice**");
    assert.ok(lastSummaryRow >= 0);
    assert.ok(notice > lastSummaryRow, "notice must follow the complete summary table");
    const neutralDartProvenance = Object.fromEntries(
      Object.entries(output.results.provenance ?? {})
        .filter(([key]) => key.startsWith("dart/"))
        .map(([key, source]) => [
          key,
          {
            ...source,
            protocol: {
              ...source.protocol,
              instructionVersion: CURRENT_INSTRUCTION_VERSION,
            },
          },
        ]),
    );
    const laterNeutralDart = {
      ...output.results,
      runId: "dart-neutral-later",
      category: "dart",
      scoredAt: "2099-01-01T00:00:00.000Z",
      metadata: {
        ...output.results.metadata,
        protocolProvenance: CURRENT_INSTRUCTION_VERSION,
      },
      provenance: neutralDartProvenance,
      skills: output.results.skills.filter((skill) => skill.category === "dart"),
    };
    const selectedReport = buildEvalsReportMarkdown(
      [output.results, laterNeutralDart],
      {
        lastUpdated: laterNeutralDart.scoredAt,
        records: [
          {
            runId: output.results.runId,
            category: "all",
            version: output.results.version,
            date: output.results.scoredAt,
            skillCount: output.results.skills.length,
            avgBaselinePassRate: 0,
            avgWithSkillPassRate: 0,
            avgDelta: 0,
            evidenceMode: "composite",
            protocolProvenance: "mixed",
          },
        ],
      },
    );
    assert.match(
      selectedReport,
      /Protocol provenance \| \*\*neutral-skill-v4\*\*/,
    );
    assert.doesNotMatch(selectedReport, /Cross-Protocol Composite Notice/);
    assert.match(
      selectedReport,
      /\| `all-v2\.6\.0` \| all \| .* \| mixed \|/,
      "physical history must retain the source composite's mixed protocol",
    );
  } finally {
    await cleanup();
  }
});
test("isolatedInstruction and executeMissingAnswers use identical paired instructions without anchor or pressure coaching", async () => {
  const taskPrompt = "Format this code with 2 spaces indentation.";
  const skillContent = "---\nname: dart-tooling\n---\nUse dart format.";

  const baselinePrompt = isolatedInstruction(taskPrompt, undefined);
  const withSkillPrompt = isolatedInstruction(taskPrompt, skillContent);
  const pressureBaselinePrompt = isolatedInstruction(taskPrompt, undefined, "pressure");
  const evalBaselinePrompt = isolatedInstruction(taskPrompt, undefined, "eval");

  assert.equal(
    pressureBaselinePrompt,
    evalBaselinePrompt,
    "Pressure and eval cases must receive identical instructions without coaching",
  );

  assert.doesNotMatch(baselinePrompt, /Canonical response anchors/i);
  assert.doesNotMatch(baselinePrompt, /Remediation anchors/i);
  assert.doesNotMatch(baselinePrompt, /pressure-resistance/i);
  assert.doesNotMatch(baselinePrompt, /shortcut/i);

  assert.equal(
    withSkillPrompt,
    `${baselinePrompt}\n\n# Loaded skill\n${skillContent}`,
    "With-skill prompt must differ from baseline prompt ONLY by the loaded skill section",
  );

  // Verify with executeMissingAnswers and runner capture
  const { root, cleanup } = await fixture();
  try {
    const { runDir, manifest } = buildManifest("dart", "9.9.9", {
      repoRoot: root,
      now: new Date("2099-01-01T00:00:00.000Z"),
    });
    const promptsSeen: Record<string, string> = {};
    await executeMissingAnswers(runDir, {
      repoRoot: root,
      concurrency: 1,
      runner: async (p) => {
        if (p.includes("# Task\nHow should this Dart code be formatted?")) {
          promptsSeen[p.includes("# Loaded skill") ? "withSkill" : "baseline"] =
            p;
        }
        return "answer";
      },
    });
    assert.ok(promptsSeen.baseline);
    assert.ok(promptsSeen.withSkill);
    const loadedSkill = fs.readFileSync(
      path.join(root, "skills", "dart", "dart-tooling", "SKILL.md"),
      "utf8",
    );
    assert.equal(
      promptsSeen.withSkill,
      `${promptsSeen.baseline}\n\n# Loaded skill\n${loadedSkill}`,
      "Runner with-skill prompt must append only the exact loaded skill section to the same-task baseline",
    );
  } finally {
    await cleanup();
  }
});
