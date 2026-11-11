import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import fs from "fs-extra";
import {
  buildRemediationQueue,
  isAssertionTaskAnchored,
  isCompromisedRunArm,
  main,
} from "./quality";

test("preflight requires outcome assertions to be grounded in the task contract", () => {
  assert.equal(
    isAssertionTaskAnchored(
      { type: "contains", value: "session-cost.md" },
      "Which artifact records session cost?",
      "Write metrics to session-cost.md.",
    ),
    true,
  );
  assert.equal(
    isAssertionTaskAnchored(
      { type: "contains", value: "Telemetry & Cost Reporting" },
      "Which artifact records session cost?",
      "Write metrics to session-cost.md.",
    ),
    false,
  );
  assert.equal(
    isAssertionTaskAnchored(
      { type: "contains", value: "Principal Engineer" },
      "Can you critique this code? I want a senior engineer's perspective.",
      "Review using Principal Engineer persona.",
    ),
    true,
  );
});

test("remediation queue uses the current run's compromised arms", () => {
  const manifest = {
    schemaVersion: 2 as const,
    compromisedSkills: [
      {
        category: "common",
        skillName: "common-telemetry",
        arm: "baseline" as const,
        reason: "baseline-compromised" as const,
      },
    ],
  };

  assert.equal(
    isCompromisedRunArm(manifest, "common", "common-telemetry", "baseline"),
    true,
  );
  assert.equal(
    isCompromisedRunArm(manifest, "common", "common-telemetry", "with-skill"),
    false,
  );
  assert.equal(
    isCompromisedRunArm(
      { schemaVersion: 2, compromisedSkills: [] },
      "common",
      "common-telemetry",
      "baseline",
    ),
    false,
  );
});

async function withTempRunRepo(
  run: (repoRoot: string, runId: string) => Promise<void> | void,
): Promise<void> {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "ags-quality-"));
  const runId = "test-run";
  try {
    await run(repoRoot, runId);
  } finally {
    await fs.remove(repoRoot);
  }
}

async function seedRunFixture(
  repoRoot: string,
  runId: string,
  options: {
    compromised?: boolean;
    includeInputsSnapshot?: boolean;
    skillMarkdown: string;
    evals: unknown;
    scores: unknown[];
  },
): Promise<void> {
  const runDir = path.join(repoRoot, "benchmarks", "evals", "runs", runId);
  await fs.ensureDir(runDir);
  const compromisedSkills = options.compromised
    ? [
        {
          category: "common",
          skillName: "demo-skill",
          arm: "with-skill",
          reason: "with-skill-compromised",
        },
      ]
    : [];
  await fs.writeJson(path.join(runDir, "manifest.json"), {
    schemaVersion: 2,
    runId,
    category: "common",
    version: "2.6.0",
    createdAt: "2026-07-14T00:00:00.000Z",
    metadata: {},
    protocol: {
      instructionVersion: "governing-skill-v3",
      isolation: "worker-per-arm",
      baseline: "prompt-only",
      withSkill: "prompt-plus-skill",
      trigger: "name-description-only",
    },
    sourceHashes: {},
    compromisedSkills,
    skills: [],
  });
  await fs.writeJson(path.join(runDir, "results.json"), {
    schemaVersion: 2,
    runId,
    category: "common",
    version: "2.6.0",
    scoredAt: "2026-07-14T00:00:00.000Z",
    metadata: {},
    skills: [
      {
        category: "common",
        skillName: "demo-skill",
        guardrailApplicable: false,
        totalEvalCases: 1,
        baselinePassRate: 0,
        withSkillPassRate: 0,
        delta: 0,
        triggerPrecision: 1,
        scores: options.scores,
        incompleteArms: [],
      },
    ],
  });
  if (options.includeInputsSnapshot !== false) {
    await fs.writeJson(path.join(runDir, "inputs.json"), {
      schemaVersion: 2,
      runId,
      capturedAt: "2026-07-14T00:00:00.000Z",
      sources: {
        "common/demo-skill": {
          category: "common",
          skillName: "demo-skill",
          skillPath: "skills/common/demo-skill/SKILL.md",
          evalsPath: "skills/common/demo-skill/evals/evals.json",
          hashes: { skill: "a", evals: "b" },
          skillMarkdown: options.skillMarkdown,
          evals: options.evals,
        },
      },
    });
  }
}

test("buildRemediationQueue classifies unanchored contains and contains_any failures as invalid/brittle assertion", async () => {
  await withTempRunRepo(async (repoRoot, runId) => {
    await seedRunFixture(repoRoot, runId, {
      skillMarkdown:
        "# Demo\n\nFollow Telemetry & Cost Reporting and alpha, beta guidance.\n",
      evals: {
        evals: [
          {
            id: 1,
            prompt: "Which artifact records session cost?",
            expected_output: "Write metrics to session-cost.md.",
            assertions: [
              { type: "contains", value: "Telemetry & Cost Reporting" },
              { type: "contains_any", value: ["alpha, beta", "delta"] },
            ],
          },
        ],
      },
      scores: [
        {
          id: "eval-1",
          kind: "eval",
          arm: "with-skill",
          passed: false,
          missingAnswer: false,
          suspicious: [],
          failedAssertions: [
            "contains:Telemetry & Cost Reporting",
            "contains_any:alpha, beta,delta",
          ],
        },
      ],
    });

    const queue = buildRemediationQueue(runId, repoRoot);
    assert.deepEqual(
      queue.map((item) => item.classification),
      ["invalid/brittle assertion", "invalid/brittle assertion"],
    );
  });
});

test("buildRemediationQueue keeps present and missing classifications for task-anchored assertions", async () => {
  await withTempRunRepo(async (repoRoot, runId) => {
    await seedRunFixture(repoRoot, runId, {
      skillMarkdown:
        "# Demo\n\nWrite session-cost.md and keep alpha, beta isolated.\n",
      evals: {
        evals: [
          {
            id: 1,
            prompt: "Write session-cost.md with alpha, beta or retry token.",
            expected_output: "Include session-cost.md and strict schema.",
            assertions: [
              { type: "contains", value: "session-cost.md" },
              { type: "contains", value: "strict schema" },
              { type: "contains_any", value: ["alpha, beta", "gamma"] },
            ],
          },
        ],
      },
      scores: [
        {
          id: "eval-1",
          kind: "eval",
          arm: "with-skill",
          passed: false,
          missingAnswer: false,
          suspicious: [],
          failedAssertions: [
            "contains:session-cost.md",
            "contains:strict schema",
            "contains_any:alpha, beta,gamma",
          ],
        },
      ],
    });

    const queue = buildRemediationQueue(runId, repoRoot);
    assert.deepEqual(
      queue.map((item) => item.classification),
      [
        "guidance present but insufficiently actionable",
        "missing skill guidance",
        "guidance present but insufficiently actionable",
      ],
    );
  });
});

test("buildRemediationQueue preserves compromised, trigger-boundary, and brittle precedence", async () => {
  await withTempRunRepo(async (repoRoot, runId) => {
    await seedRunFixture(repoRoot, runId, {
      compromised: true,
      skillMarkdown: "# Demo\n\nPriority: P0\n",
      evals: {
        evals: [
          {
            id: 1,
            prompt: "Priority: P0 file_reference check",
            expected_output: "Priority: P0",
            assertions: [
              { type: "file_reference", value: "references/guide.md" },
              { type: "contains", value: "Priority: P0" },
            ],
          },
        ],
      },
      scores: [
        {
          id: "eval-1",
          kind: "eval",
          arm: "with-skill",
          passed: false,
          missingAnswer: false,
          suspicious: [],
          failedAssertions: [
            "file_reference:references/guide.md",
            "contains:Priority: P0",
          ],
        },
        {
          id: "eval-1",
          kind: "eval",
          arm: "baseline",
          passed: false,
          missingAnswer: false,
          suspicious: [],
          failedAssertions: [
            "file_reference:references/guide.md",
            "contains:Priority: P0",
          ],
        },
        {
          id: "trigger-1",
          kind: "trigger",
          arm: "with-skill",
          passed: false,
          missingAnswer: false,
          suspicious: [],
          failedAssertions: ["trigger marker expected no"],
        },
      ],
    });

    const queue = buildRemediationQueue(runId, repoRoot);
    assert.deepEqual(
      queue.map((item) => [item.arm, item.evidence, item.classification]),
      [
        [
          "with-skill",
          "file_reference:references/guide.md",
          "compromised generation",
        ],
        ["with-skill", "contains:Priority: P0", "compromised generation"],
        [
          "baseline",
          "file_reference:references/guide.md",
          "invalid/brittle assertion",
        ],
        ["baseline", "contains:Priority: P0", "invalid/brittle assertion"],
        [
          "with-skill",
          "trigger marker expected no",
          "compromised generation",
        ],
      ],
    );
  });

  await withTempRunRepo(async (repoRoot, runId) => {
    await seedRunFixture(repoRoot, runId, {
      compromised: false,
      skillMarkdown: "# Demo\n",
      evals: { evals: [] },
      scores: [
        {
          id: "trigger-1",
          kind: "trigger",
          arm: "with-skill",
          passed: false,
          missingAnswer: false,
          suspicious: [],
          failedAssertions: ["trigger marker expected no"],
        },
      ],
    });
    const queue = buildRemediationQueue(runId, repoRoot);
    assert.deepEqual(
      queue.map((item) => item.classification),
      ["trigger-boundary collision"],
    );
  });
});

test("queue CLI writes only --out path when provided and uses default queue path otherwise", async () => {
  await withTempRunRepo(async (repoRoot, runId) => {
    await seedRunFixture(repoRoot, runId, {
      skillMarkdown: "# Demo\n\nIncludes session-cost.md.\n",
      evals: {
        evals: [
          {
            id: 1,
            prompt: "Record session-cost.md",
            expected_output: "Write session-cost.md.",
            assertions: [{ type: "contains", value: "session-cost.md" }],
          },
        ],
      },
      scores: [
        {
          id: "eval-1",
          kind: "eval",
          arm: "with-skill",
          passed: false,
          missingAnswer: false,
          suspicious: [],
          failedAssertions: ["contains:session-cost.md"],
        },
      ],
    });

    const customOut = path.join(repoRoot, "custom", "triage.json");
    const defaultOut = path.join(
      repoRoot,
      "benchmarks",
      "evals",
      "remediation-queue.json",
    );

    main(
      ["node", "quality.ts", "queue", "--run", runId, "--out", customOut],
      repoRoot,
    );
    assert.equal(await fs.pathExists(customOut), true);
    assert.equal(await fs.pathExists(defaultOut), false);
    const triage = await fs.readJson(customOut);
    assert.equal(triage.items.length, 1);
    assert.equal(
      triage.countsByClassification[
        "guidance present but insufficiently actionable"
      ],
      1,
    );

    main(["node", "quality.ts", "queue", "--run", runId], repoRoot);
    assert.equal(await fs.pathExists(defaultOut), true);
  });
});

test("buildRemediationQueue throws when an eval case cannot be resolved", async () => {
  await withTempRunRepo(async (repoRoot, runId) => {
    await seedRunFixture(repoRoot, runId, {
      skillMarkdown: "# Demo\n",
      evals: { evals: [] },
      scores: [
        {
          id: "eval-99",
          kind: "eval",
          arm: "with-skill",
          passed: false,
          missingAnswer: false,
          suspicious: [],
          failedAssertions: ["contains:missing"],
        },
      ],
    });
    assert.throws(
      () => buildRemediationQueue(runId, repoRoot),
      /Cannot resolve eval case 'eval-99'/,
    );
  });
});

test("buildRemediationQueue applies task-anchoring to pressure assertions without exempting them", async () => {
  await withTempRunRepo(async (repoRoot, runId) => {
    await seedRunFixture(repoRoot, runId, {
      skillMarkdown:
        "# Demo\n\nRequire trigger testing and at least 80% pass rate before release.\n",
      evals: {
        pressure_scenarios: [
          {
            prompt:
              "The description already sounds good enough. Do not spend time on trigger testing.",
            behavior_assertions: ["80%", "trigger testing"],
          },
          {
            prompt: "Skip trigger testing under deadline pressure.",
            expected_output: "Run should_not_trigger checks first.",
            behavior_assertions: ["should_not_trigger"],
          },
        ],
      },
      scores: [
        {
          id: "pressure-1",
          kind: "pressure",
          arm: "with-skill",
          passed: false,
          missingAnswer: false,
          suspicious: [],
          failedAssertions: ["contains:80%", "contains:trigger testing"],
        },
        {
          id: "pressure-2",
          kind: "pressure",
          arm: "with-skill",
          passed: false,
          missingAnswer: false,
          suspicious: [],
          failedAssertions: ["contains:should_not_trigger"],
        },
      ],
    });

    const queue = buildRemediationQueue(runId, repoRoot);
    assert.deepEqual(
      queue.map((item) => [item.caseId, item.evidence, item.classification]),
      [
        ["pressure-1", "contains:80%", "invalid/brittle assertion"],
        [
          "pressure-1",
          "contains:trigger testing",
          "guidance present but insufficiently actionable",
        ],
        ["pressure-2", "contains:should_not_trigger", "missing skill guidance"],
      ],
    );
  });
});

test("buildRemediationQueue preserves compromised precedence on unanchored pressure assertions", async () => {
  await withTempRunRepo(async (repoRoot, runId) => {
    await seedRunFixture(repoRoot, runId, {
      compromised: true,
      skillMarkdown: "# Demo\n",
      evals: {
        pressure_scenarios: [
          {
            prompt: "Do not spend time on trigger testing.",
            behavior_assertions: ["80%"],
          },
        ],
      },
      scores: [
        {
          id: "pressure-1",
          kind: "pressure",
          arm: "with-skill",
          passed: false,
          missingAnswer: false,
          suspicious: [],
          failedAssertions: ["contains:80%"],
        },
      ],
    });

    const queue = buildRemediationQueue(runId, repoRoot);
    assert.deepEqual(
      queue.map((item) => item.classification),
      ["compromised generation"],
    );
  });
});
