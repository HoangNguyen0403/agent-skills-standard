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

async function fixture(): Promise<{
  root: string;
  cleanup: () => Promise<void>;
}> {
  const root = await mkdtemp(path.join(os.tmpdir(), "ags-evals-v2-"));
  await fs.ensureDir(
    path.join(root, "skills", "dart", "dart-tooling", "evals"),
  );
  await fs.writeJson(path.join(root, "skills", "metadata.json"), {
    categories: { dart: { version: "1.0.0" } },
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
        ? "TRIGGER: yes\nRelevant."
        : "TRIGGER: no\nUnrelated.";
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
