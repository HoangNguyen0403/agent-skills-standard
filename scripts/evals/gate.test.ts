import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import * as path from "node:path";
import test from "node:test";
import fs from "fs-extra";
import { gateOne } from "./gate";
import type { GateReport, GateRunOutcome } from "./gate";
import type {
  ArmName,
  CaseScore,
  CompromisedSkillRecord,
  EvalsHistory,
  GenerationProtocol,
  ManifestSkill,
  ManifestV2,
  RunMetadata,
  RunResults,
  SkillResult,
} from "./types";

const ISO = "2026-06-01T00:00:00.000Z";
const HISTORY: EvalsHistory = { lastUpdated: "", records: [] };

interface CaseSpec {
  id: string;
  kind: CaseScore["kind"];
  arm?: ArmName;
  passed: boolean;
  missingAnswer?: boolean;
  failedAssertions?: string[];
}

interface SkillSpec {
  key: string;
  cases: CaseSpec[];
  evals: Record<string, unknown>;
  guardrailApplicable?: boolean;
  withSkillPassRate?: number;
}

interface RunSpec {
  runId: string;
  baselineRunId?: string;
  provenance?: ManifestV2["provenance"];
  semantics?: 1 | 2;
  activation?: 2 | 3;
  evidenceMode?: RunMetadata["evidenceMode"];
  compromisedSkills?: CompromisedSkillRecord[];
}

const PROTOCOL: GenerationProtocol = {
  instructionVersion: "governing-skill-v3",
  isolation: "worker-per-arm",
  baseline: "prompt-only",
  withSkill: "prompt-plus-skill",
  trigger: "name-description-only",
};

function keyParts(key: string): { category: string; skillName: string } {
  const [category, skillName] = key.split("/");
  if (!category || !skillName) throw new Error(`Invalid skill key: ${key}`);
  return { category, skillName };
}

function armCase(
  id: string,
  kind: CaseScore["kind"],
  passed: boolean,
  options: Omit<CaseSpec, "id" | "kind" | "passed"> = {},
): CaseSpec {
  return { id, kind, passed, ...options };
}

function skillResult(spec: SkillSpec): SkillResult {
  const { category, skillName } = keyParts(spec.key);
  const withSkillPassRate = spec.withSkillPassRate ?? 0.95;
  return {
    category,
    skillName,
    guardrailApplicable: spec.guardrailApplicable ?? false,
    totalEvalCases: spec.cases.length,
    baselinePassRate: 0.8,
    withSkillPassRate,
    delta: 0.15,
    triggerPrecision: 1,
    casePassRate: { baseline: 0.8, withSkill: withSkillPassRate },
    assertionPassRate: { baseline: 0.8, withSkill: withSkillPassRate },
    triggerRecall: 1,
    triggerSpecificity: 1,
    balancedTriggerAccuracy: 1,
    scores: spec.cases.map((current) => ({
      id: current.id,
      kind: current.kind,
      arm: current.arm ?? "with-skill",
      passed: current.passed,
      missingAnswer: current.missingAnswer ?? false,
      suspicious: [],
      failedAssertions: current.failedAssertions ?? [],
    })),
    incompleteArms: [],
  };
}

function manifestSkill(spec: SkillSpec): ManifestSkill {
  const { category, skillName } = keyParts(spec.key);
  return {
    category,
    skillName,
    skillPath: `skills/${spec.key}/SKILL.md`,
    guardrailApplicable: spec.guardrailApplicable ?? false,
    cases: spec.cases.map((current) => ({
      id: current.id,
      kind: current.kind,
      arms:
        current.kind === "trigger"
          ? { "with-skill": "done" }
          : { baseline: "done", "with-skill": "done" },
    })),
  };
}

function runInputs(runId: string, skills: SkillSpec[]): Record<string, unknown> {
  const sources = skills.map((spec) => {
    const { category, skillName } = keyParts(spec.key);
    return [
      spec.key,
      {
        category,
        skillName,
        skillPath: `skills/${spec.key}/SKILL.md`,
        evalsPath: `skills/${spec.key}/evals/evals.json`,
        hashes: { skill: "skill-hash", evals: "evals-hash" },
        skillMarkdown: "",
        evals: spec.evals,
      },
    ];
  });
  return {
    schemaVersion: 2,
    runId,
    capturedAt: ISO,
    sources: Object.fromEntries(sources),
  };
}

async function writeRun(
  runsDir: string,
  spec: RunSpec,
  skills: SkillSpec[],
): Promise<string> {
  const runDir = path.join(runsDir, spec.runId);
  await fs.ensureDir(runDir);
  const compromisedSkills = spec.compromisedSkills ?? [];
  const metadata: RunMetadata =
    spec.evidenceMode === undefined ? {} : { evidenceMode: spec.evidenceMode };
  const results: RunResults = {
    schemaVersion: 2,
    runId: spec.runId,
    category: "all",
    version: "2.0.0",
    scoredAt: ISO,
    metadata,
    compromisedSkills,
    skills: skills.map(skillResult),
    ...(spec.baselineRunId === undefined
      ? {}
      : { baselineRunId: spec.baselineRunId }),
  };
  const manifest: ManifestV2 = {
    schemaVersion: 2,
    runId: spec.runId,
    category: "all",
    version: "2.0.0",
    metadata,
    scope: { kind: "all", categories: ["alpha"] },
    protocol: PROTOCOL,
    sourceHashes: {},
    compromisedSkills,
    skills: skills.map(manifestSkill),
    ...(spec.provenance === undefined ? {} : { provenance: spec.provenance }),
    assertionSemanticsVersion: spec.semantics ?? 2,
    activationEvidenceVersion: spec.activation ?? 3,
  };
  await fs.writeJson(path.join(runDir, "results.json"), results);
  await fs.writeJson(path.join(runDir, "manifest.json"), manifest);
  await fs.writeJson(path.join(runDir, "inputs.json"), runInputs(spec.runId, skills));
  return runDir;
}

async function withRunsDir(
  body: (runsDir: string) => Promise<void>,
): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "ags-gate-cases-"));
  try {
    const runsDir = path.join(root, "runs");
    await fs.ensureDir(runsDir);
    await body(runsDir);
  } finally {
    await fs.remove(root);
  }
}

async function withCliRepo(
  body: (fixture: { root: string; runsDir: string }) => Promise<void>,
): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "ags-gate-cli-"));
  try {
    const repoRoot = path.resolve(__dirname, "../..");
    await fs.copy(path.join(repoRoot, "scripts"), path.join(root, "scripts"));
    await fs.copy(
      path.join(repoRoot, "package.json"),
      path.join(root, "package.json"),
    );
    await fs.ensureSymlink(
      path.join(repoRoot, "node_modules"),
      path.join(root, "node_modules"),
      "junction",
    );
    const runsDir = path.join(root, "benchmarks", "evals", "runs");
    await fs.ensureDir(runsDir);
    await fs.writeJson(
      path.join(root, "benchmarks", "evals", "history.json"),
      HISTORY,
    );
    await body({ root, runsDir });
  } finally {
    await fs.remove(root);
  }
}

function runGateCli(root: string, runId: string, ...flags: string[]) {
  return spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      path.join(root, "scripts", "evals", "index.ts"),
      "gate",
      "--run",
      runId,
      ...flags,
    ],
    { cwd: root, encoding: "utf8" },
  );
}

async function corruptFailedAssertions(
  runDir: string,
  value: unknown,
): Promise<void> {
  const file = path.join(runDir, "results.json");
  const results = (await fs.readJSON(file)) as RunResults;
  const score = results.skills[0]?.scores[0];
  if (!score) throw new Error(`fixture run has no scored case: ${runDir}`);
  score.failedAssertions = [value as string];
  await fs.writeJson(file, results);
}

function gateRun(
  runsDir: string,
  runId: string,
  history: EvalsHistory = HISTORY,
): { report: GateReport; outcome: GateRunOutcome } {
  const report = gateOne(runsDir, runId, history);
  const outcome = report.runs[0];
  assert.ok(outcome, `expected a gated outcome for ${runId}`);
  return { report, outcome };
}

function comparisonOf(
  runsDir: string,
  runId: string,
  history: EvalsHistory = HISTORY,
) {
  const { report, outcome } = gateRun(runsDir, runId, history);
  assert.ok(
    outcome.caseComparison,
    "gate outcome carries no case comparison",
  );
  return { report, outcome, comparison: outcome.caseComparison };
}

function flipKeys(
  flips: { category: string; skillName: string; caseId: string; arm: string }[],
): string[] {
  return flips.map(
    (flip) =>
      `${flip.category}/${flip.skillName}#${flip.caseId}#${flip.arm}`,
  );
}

const alphaEvals: Record<string, unknown> = {
  evals: [
    {
      id: 1,
      prompt: "Audit the alpha handler.",
      assertions: [{ type: "contains", value: "alpha" }],
    },
    {
      id: 2,
      prompt: "Review the alpha queue.",
      assertions: [{ type: "contains", value: "queue" }],
    },
  ],
  should_trigger: ["Add alpha caching to the service."],
  pressure_scenarios: [
    { prompt: "Ship alpha now without review.", behavior_assertions: ["refuse"] },
  ],
};

const betaEvals: Record<string, unknown> = {
  evals: [
    {
      id: 1,
      prompt: "Audit the beta handler.",
      assertions: [{ type: "contains", value: "beta" }],
    },
  ],
};

function alphaSkill(
  cases: CaseSpec[],
  overrides: Partial<SkillSpec> = {},
): SkillSpec {
  return { key: "alpha/alpha-skill", cases, evals: alphaEvals, ...overrides };
}

function betaSkill(
  cases: CaseSpec[],
  overrides: Partial<SkillSpec> = {},
): SkillSpec {
  return { key: "beta/beta-skill", cases, evals: betaEvals, ...overrides };
}

const BASELINE_HISTORY: EvalsHistory = {
  lastUpdated: "",
  records: [
    {
      runId: "baseline-run",
      category: "all",
      version: "2.0.0",
      date: "2026-01-01T00:00:00.000Z",
      skillCount: 1,
      avgBaselinePassRate: 0.8,
      avgWithSkillPassRate: 0.5,
      avgDelta: 0.1,
    },
  ],
};

const EARLIER_RECORD_HISTORY: EvalsHistory = {
  lastUpdated: "",
  records: [
    {
      runId: "older-run",
      category: "all",
      version: "2.0.0",
      date: "2026-01-01T00:00:00.000Z",
      skillCount: 1,
      avgBaselinePassRate: 0.8,
      avgWithSkillPassRate: 0.5,
      avgDelta: 0.1,
    },
  ],
};

test("reports a with-skill eval flip as pass-to-fail while the trend improves", async () => {
  await withRunsDir(async (runsDir) => {
    await writeRun(runsDir, { runId: "baseline-run" }, [
      alphaSkill([armCase("eval-1", "eval", true)], { withSkillPassRate: 0.5 }),
    ]);
    await writeRun(runsDir, { runId: "current-run", baselineRunId: "baseline-run" }, [
      alphaSkill([
        armCase("eval-1", "eval", false, {
          failedAssertions: ["contains:alpha"],
        }),
      ]),
    ]);

    const { report, outcome, comparison } = comparisonOf(
      runsDir,
      "current-run",
      BASELINE_HISTORY,
    );

    assert.equal(report.ok, true);
    assert.equal(outcome.trend.previousRunId, "baseline-run");
    assert.equal(outcome.trend.direction, "improved");
    assert.equal(comparison.state, "compared");
    assert.equal(comparison.baselineRunId, "baseline-run");
    assert.deepEqual(flipKeys(comparison.passToFail), [
      "alpha/alpha-skill#eval-1#with-skill",
    ]);
    assert.deepEqual(comparison.passToFail[0]?.failedAssertions, [
      "contains:alpha",
    ]);
    assert.equal(comparison.failToPass, 0);
    assert.equal(comparison.unchanged, 0);
    assert.equal(comparison.added, 0);
    assert.equal(comparison.removed, 0);
  });
});

test("reports a pressure flip as pass-to-fail", async () => {
  await withRunsDir(async (runsDir) => {
    await writeRun(runsDir, { runId: "baseline-run" }, [
      alphaSkill([armCase("pressure-1", "pressure", true)], {
        guardrailApplicable: true,
      }),
    ]);
    await writeRun(runsDir, { runId: "current-run", baselineRunId: "baseline-run" }, [
      alphaSkill([armCase("pressure-1", "pressure", false)], {
        guardrailApplicable: true,
      }),
    ]);

    const { comparison } = comparisonOf(runsDir, "current-run");

    assert.equal(comparison.state, "compared");
    assert.deepEqual(flipKeys(comparison.passToFail), [
      "alpha/alpha-skill#pressure-1#with-skill",
    ]);
  });
});

test("counts a matched eval arm whose assertions changed as definition-changed", async () => {
  await withRunsDir(async (runsDir) => {
    const changedEvals: Record<string, unknown> = {
      evals: [
        {
          id: 1,
          prompt: "Audit the alpha handler.",
          assertions: [{ type: "contains", value: "beta" }],
        },
      ],
    };
    await writeRun(runsDir, { runId: "baseline-run" }, [
      alphaSkill([armCase("eval-1", "eval", true)]),
    ]);
    await writeRun(runsDir, { runId: "current-run", baselineRunId: "baseline-run" }, [
      alphaSkill([armCase("eval-1", "eval", false)], { evals: changedEvals }),
    ]);

    const { comparison } = comparisonOf(runsDir, "current-run");

    assert.equal(comparison.state, "compared");
    assert.deepEqual(comparison.passToFail, []);
    assert.equal(comparison.definitionChanged, 1);
    assert.equal(comparison.unchanged, 0);
  });
});

test("counts a trigger arm whose prompt text changed as definition-changed", async () => {
  await withRunsDir(async (runsDir) => {
    const changedEvals: Record<string, unknown> = {
      ...alphaEvals,
      should_trigger: ["Add alpha caching to the service now."],
    };
    await writeRun(runsDir, { runId: "baseline-run" }, [
      alphaSkill([armCase("trigger-1", "trigger", true)]),
    ]);
    await writeRun(runsDir, { runId: "current-run", baselineRunId: "baseline-run" }, [
      alphaSkill([armCase("trigger-1", "trigger", false)], { evals: changedEvals }),
    ]);

    const { comparison } = comparisonOf(runsDir, "current-run");

    assert.equal(comparison.state, "compared");
    assert.deepEqual(comparison.passToFail, []);
    assert.equal(comparison.definitionChanged, 1);
  });
});

test("compares a skill whose protocol matches and flags only the differing skill", async () => {
  await withRunsDir(async (runsDir) => {
    const baselineSkills = [
      alphaSkill([armCase("eval-1", "eval", true)]),
      betaSkill([armCase("eval-1", "eval", true)]),
    ];
    const currentSkills = [
      alphaSkill([armCase("eval-1", "eval", false)]),
      betaSkill([armCase("eval-1", "eval", false)]),
    ];
    const alphaProvenance = {
      sourceRunId: "earlier-run",
      sourceHash: { skill: "skill-hash", evals: "evals-hash" },
      protocol: { ...PROTOCOL, instructionVersion: "neutral-skill-v4" as const },
      evidenceMode: "fresh" as const,
    };
    const betaProvenance = {
      sourceRunId: "earlier-run",
      sourceHash: { skill: "skill-hash", evals: "evals-hash" },
      protocol: PROTOCOL,
      evidenceMode: "fresh" as const,
    };
    await writeRun(runsDir, { runId: "baseline-run" }, baselineSkills);
    await writeRun(
      runsDir,
      {
        runId: "current-run",
        baselineRunId: "baseline-run",
        provenance: {
          "alpha/alpha-skill": alphaProvenance,
          "beta/beta-skill": betaProvenance,
        },
      },
      currentSkills,
    );

    const { comparison } = comparisonOf(runsDir, "current-run");

    assert.equal(comparison.state, "compared");
    assert.deepEqual(flipKeys(comparison.passToFail), [
      "beta/beta-skill#eval-1#with-skill",
    ]);
    assert.equal(comparison.protocolMismatch, 1);
    assert.equal(comparison.protocolUnresolved, 0);
  });
});

test("reports protocol-unresolved when the instruction protocol is undefined in both runs", async () => {
  await withRunsDir(async (runsDir) => {
    await writeRun(runsDir, { runId: "baseline-run", evidenceMode: "composite" }, [
      alphaSkill([armCase("eval-1", "eval", true)]),
    ]);
    await writeRun(
      runsDir,
      {
        runId: "current-run",
        baselineRunId: "baseline-run",
        evidenceMode: "composite",
      },
      [alphaSkill([armCase("eval-1", "eval", false)])],
    );

    const { comparison } = comparisonOf(runsDir, "current-run");

    assert.equal(comparison.state, "compared");
    assert.deepEqual(comparison.passToFail, []);
    assert.equal(comparison.protocolUnresolved, 1);
    assert.equal(comparison.protocolMismatch, 0);
  });
});

test("reports no-baseline and compares nothing without a declared baseline", async () => {
  await withRunsDir(async (runsDir) => {
    await writeRun(runsDir, { runId: "earlier-run" }, [
      alphaSkill([armCase("eval-1", "eval", true)]),
    ]);
    await writeRun(runsDir, { runId: "current-run" }, [
      alphaSkill([armCase("eval-1", "eval", false)]),
    ]);

    const { comparison } = comparisonOf(
      runsDir,
      "current-run",
      EARLIER_RECORD_HISTORY,
    );

    assert.equal(comparison.state, "no-baseline");
    assert.equal(comparison.baselineRunId, null);
    assert.deepEqual(comparison.passToFail, []);
    assert.equal(comparison.unchanged, 0);
    assert.equal(comparison.added, 0);
    assert.equal(comparison.removed, 0);
    assert.equal(comparison.excluded, 0);
    assert.equal(comparison.failToPass, 0);
  });
});

test("reports unavailable naming the missing baseline evidence and preserves gate results", async () => {
  await withRunsDir(async (runsDir) => {
    const breaching = [alphaSkill([armCase("eval-1", "eval", true)], {
      withSkillPassRate: 0.5,
    })];
    await writeRun(runsDir, { runId: "plain-run" }, breaching);

    for (const missing of ["results.json", "inputs.json", "manifest.json"]) {
      const baselineRunId = `baseline-${missing}`;
      const baselineDir = await writeRun(
        runsDir,
        { runId: baselineRunId },
        breaching,
      );
      await fs.remove(path.join(baselineDir, missing));
      const currentRunId = `current-${missing}`;
      await writeRun(
        runsDir,
        { runId: currentRunId, baselineRunId },
        breaching,
      );

      const { report, outcome, comparison } = comparisonOf(runsDir, currentRunId);
      const plain = gateRun(runsDir, "plain-run").report;

      assert.equal(comparison.state, "unavailable");
      assert.match(comparison.reason ?? "", new RegExp(missing.replace(".", "\\.")));
      assert.equal(report.ok, plain.ok);
      assert.deepEqual(outcome.breaches, plain.runs[0]?.breaches);
      assert.deepEqual(outcome.trend, plain.runs[0]?.trend);
      assert.equal(report.ok, false);
    }
  });
});

test("reports unavailable without throwing when the run's own evidence is missing or malformed", async () => {
  await withRunsDir(async (runsDir) => {
    await writeRun(runsDir, { runId: "baseline-run" }, [
      alphaSkill([armCase("eval-1", "eval", true)]),
    ]);
    const variants = ["inputs.json", "manifest.json"].flatMap((file) => [
      {
        name: `missing ${file}`,
        apply: (runDir: string) => fs.remove(path.join(runDir, file)),
        expected: file,
      },
      {
        name: `malformed ${file}`,
        apply: (runDir: string) =>
          fs.writeFile(path.join(runDir, file), "{ not valid json"),
        expected: file,
      },
    ]);

    for (const passRate of [0.95, 0.5]) {
      for (const variant of variants) {
        const runId = `current-${passRate}-${variant.name.replace(/\s+/g, "-")}`;
        const runDir = await writeRun(
          runsDir,
          { runId, baselineRunId: "baseline-run" },
          [
            alphaSkill([armCase("eval-1", "eval", false)], {
              withSkillPassRate: passRate,
            }),
          ],
        );
        await variant.apply(runDir);

        const { report, outcome } = gateRun(runsDir, runId);

        assert.equal(
          outcome.caseComparison?.state,
          "unavailable",
          `${variant.name} at pass rate ${passRate}`,
        );
        assert.match(
          outcome.caseComparison?.reason ?? "",
          new RegExp(variant.expected.replace(".", "\\.")),
        );
        assert.equal(outcome.ready, passRate > 0.85);
        assert.equal(report.ok, passRate > 0.85);
      }
    }
  });
});

test("counts a current-only case arm as added", async () => {
  await withRunsDir(async (runsDir) => {
    await writeRun(runsDir, { runId: "baseline-run" }, [
      alphaSkill([armCase("eval-1", "eval", true)]),
    ]);
    await writeRun(runsDir, { runId: "current-run", baselineRunId: "baseline-run" }, [
      alphaSkill([
        armCase("eval-1", "eval", true),
        armCase("eval-2", "eval", false, { failedAssertions: ["contains:queue"] }),
      ]),
    ]);

    const { comparison } = comparisonOf(runsDir, "current-run");

    assert.deepEqual(comparison.passToFail, []);
    assert.equal(comparison.added, 1);
    assert.equal(comparison.unchanged, 1);
    assert.equal(comparison.removed, 0);
  });
});

test("counts a baseline-only case arm as removed", async () => {
  await withRunsDir(async (runsDir) => {
    await writeRun(runsDir, { runId: "baseline-run" }, [
      alphaSkill([
        armCase("eval-1", "eval", true),
        armCase("eval-2", "eval", true),
      ]),
    ]);
    await writeRun(runsDir, { runId: "current-run", baselineRunId: "baseline-run" }, [
      alphaSkill([armCase("eval-1", "eval", true)]),
    ]);

    const { comparison } = comparisonOf(runsDir, "current-run");

    assert.deepEqual(comparison.passToFail, []);
    assert.equal(comparison.removed, 1);
    assert.equal(comparison.added, 0);
    assert.equal(comparison.unchanged, 1);
  });
});

test("excludes a matched arm with a missing answer in either run", async () => {
  await withRunsDir(async (runsDir) => {
    await writeRun(runsDir, { runId: "baseline-run" }, [
      alphaSkill([armCase("eval-1", "eval", true, { missingAnswer: true })]),
    ]);
    await writeRun(runsDir, { runId: "current-run", baselineRunId: "baseline-run" }, [
      alphaSkill([armCase("eval-1", "eval", false)]),
    ]);

    const { comparison } = comparisonOf(runsDir, "current-run");

    assert.deepEqual(comparison.passToFail, []);
    assert.equal(comparison.excluded, 1);
  });

  await withRunsDir(async (runsDir) => {
    await writeRun(runsDir, { runId: "baseline-run" }, [
      alphaSkill([armCase("eval-1", "eval", true)]),
    ]);
    await writeRun(runsDir, { runId: "current-run", baselineRunId: "baseline-run" }, [
      alphaSkill([armCase("eval-1", "eval", false, { missingAnswer: true })]),
    ]);

    const { comparison } = comparisonOf(runsDir, "current-run");

    assert.deepEqual(comparison.passToFail, []);
    assert.equal(comparison.excluded, 1);
  });
});

test("excludes a matched arm when the skill and arm are compromised in either run", async () => {
  const compromised: CompromisedSkillRecord = {
    category: "alpha",
    skillName: "alpha-skill",
    arm: "with-skill",
    reason: "generation-protocol-violation",
  };

  await withRunsDir(async (runsDir) => {
    await writeRun(runsDir, { runId: "baseline-run" }, [
      alphaSkill([armCase("eval-1", "eval", true)]),
    ]);
    await writeRun(
      runsDir,
      {
        runId: "current-run",
        baselineRunId: "baseline-run",
        compromisedSkills: [compromised],
      },
      [alphaSkill([armCase("eval-1", "eval", false)])],
    );

    const { comparison } = comparisonOf(runsDir, "current-run");

    assert.deepEqual(comparison.passToFail, []);
    assert.equal(comparison.excluded, 1);
  });

  await withRunsDir(async (runsDir) => {
    await writeRun(
      runsDir,
      { runId: "baseline-run", compromisedSkills: [compromised] },
      [alphaSkill([armCase("eval-1", "eval", true)])],
    );
    await writeRun(runsDir, { runId: "current-run", baselineRunId: "baseline-run" }, [
      alphaSkill([armCase("eval-1", "eval", false)]),
    ]);

    const { comparison } = comparisonOf(runsDir, "current-run");

    assert.deepEqual(comparison.passToFail, []);
    assert.equal(comparison.excluded, 1);
  });
});

test("refuses a baseline run id that escapes the run store", async () => {
  await withRunsDir(async (runsDir) => {
    await writeRun(path.dirname(runsDir), { runId: "outside" }, [
      alphaSkill([armCase("eval-1", "eval", true)]),
    ]);
    await writeRun(runsDir, { runId: "current-run", baselineRunId: "../outside" }, [
      alphaSkill([armCase("eval-1", "eval", false)]),
    ]);

    const { comparison } = comparisonOf(runsDir, "current-run");

    assert.equal(comparison.state, "unavailable");
    assert.match(comparison.reason ?? "", /baselineRunId/);
    assert.deepEqual(comparison.passToFail, []);
    assert.equal(comparison.unchanged, 0);
    assert.equal(comparison.excluded, 0);
  });
});

test("refuses a baseline whose results declare a different run id", async () => {
  await withRunsDir(async (runsDir) => {
    const baselineDir = await writeRun(runsDir, { runId: "baseline-run" }, [
      alphaSkill([armCase("eval-1", "eval", true)]),
    ]);
    const resultsFile = path.join(baselineDir, "results.json");
    const baselineResults = (await fs.readJSON(resultsFile)) as RunResults;
    baselineResults.runId = "other-run";
    await fs.writeJson(resultsFile, baselineResults);
    await writeRun(runsDir, { runId: "current-run", baselineRunId: "baseline-run" }, [
      alphaSkill([armCase("eval-1", "eval", false)]),
    ]);

    const { comparison } = comparisonOf(runsDir, "current-run");

    assert.equal(comparison.state, "unavailable");
    assert.match(comparison.reason ?? "", /baseline-run/);
    assert.deepEqual(comparison.passToFail, []);
    assert.equal(comparison.unchanged, 0);
  });
});

test("reports unavailable instead of failing the gate when a case score is malformed", async () => {
  await withCliRepo(async ({ root, runsDir }) => {
    for (const side of ["current", "baseline"] as const) {
      const baselineDir = await writeRun(
        runsDir,
        { runId: `baseline-${side}` },
        [alphaSkill([armCase("eval-1", "eval", true)])],
      );
      const currentDir = await writeRun(
        runsDir,
        { runId: `current-${side}`, baselineRunId: `baseline-${side}` },
        [
          alphaSkill([
            armCase("eval-1", "eval", false, {
              failedAssertions: ["contains:alpha"],
            }),
          ]),
        ],
      );
      await corruptFailedAssertions(
        side === "current" ? currentDir : baselineDir,
        { toString: null },
      );

      const result = runGateCli(root, `current-${side}`, "--json");

      assert.equal(result.status, 0, result.stderr);
      assert.doesNotMatch(result.stderr, /Eval run failed/);
      const report = JSON.parse(result.stdout) as GateReport;
      assert.equal(report.ok, true);
      assert.equal(report.runs[0]?.caseComparison?.state, "unavailable");
      assert.match(
        report.runs[0]?.caseComparison?.reason ?? "",
        new RegExp(`current-${side}|baseline-${side}`),
      );
    }
  });
});

test("renders an unavailable comparison without throwing on malformed scores", async () => {
  await withCliRepo(async ({ root, runsDir }) => {
    await writeRun(runsDir, { runId: "baseline-run" }, [
      alphaSkill([armCase("eval-1", "eval", true)]),
    ]);
    const currentDir = await writeRun(
      runsDir,
      { runId: "current-run", baselineRunId: "baseline-run" },
      [alphaSkill([armCase("eval-1", "eval", false)])],
    );
    await corruptFailedAssertions(currentDir, { toString: null });

    const result = runGateCli(root, "current-run");

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /case comparison: unavailable/);
    assert.doesNotMatch(result.stderr, /Eval run failed/);
  });
});
test("keeps a malformed baseline id from breaking passing text output", async () => {
  await withCliRepo(async ({ root, runsDir }) => {
    await writeRun(runsDir, { runId: "baseline-run" }, [
      alphaSkill([armCase("eval-1", "eval", true)]),
    ]);
    const currentDir = await writeRun(
      runsDir,
      { runId: "current-run", baselineRunId: "baseline-run" },
      [alphaSkill([armCase("eval-1", "eval", true)])],
    );
    const resultsFile = path.join(currentDir, "results.json");
    const results = (await fs.readJSON(resultsFile)) as RunResults;
    (results as unknown as Record<string, unknown>).baselineRunId = {
      toString: null,
    };
    await fs.writeJson(resultsFile, results);

    const result = runGateCli(root, "current-run");

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /case comparison: unavailable/);
  });
});

test("uses the gated directory for current evidence and rejects a mismatched embedded run id", async () => {
  await withRunsDir(async (runsDir) => {
    await writeRun(runsDir, { runId: "baseline-run" }, [
      alphaSkill([armCase("eval-1", "eval", true)]),
    ]);
    await writeRun(runsDir, { runId: "other-run" }, [
      alphaSkill([armCase("eval-1", "eval", true)]),
    ]);
    const currentDir = await writeRun(
      runsDir,
      { runId: "current-run", baselineRunId: "baseline-run" },
      [alphaSkill([armCase("eval-1", "eval", false)])],
    );
    const resultsFile = path.join(currentDir, "results.json");
    const results = (await fs.readJSON(resultsFile)) as RunResults;
    results.runId = "other-run";
    await fs.writeJson(resultsFile, results);

    const { report, outcome, comparison } = comparisonOf(runsDir, "current-run");

    assert.equal(comparison.state, "unavailable");
    assert.deepEqual(comparison.passToFail, []);
    assert.equal(report.ok, outcome.ready);
    assert.equal(outcome.ready, true);
  });
});

test("rejects an embedded run id that escapes the run store", async () => {
  await withRunsDir(async (runsDir) => {
    await writeRun(path.dirname(runsDir), { runId: "outside" }, [
      alphaSkill([armCase("eval-1", "eval", true)]),
    ]);
    await writeRun(runsDir, { runId: "baseline-run" }, [
      alphaSkill([armCase("eval-1", "eval", true)]),
    ]);
    const currentDir = await writeRun(
      runsDir,
      { runId: "current-run", baselineRunId: "baseline-run" },
      [alphaSkill([armCase("eval-1", "eval", false)])],
    );
    const resultsFile = path.join(currentDir, "results.json");
    const results = (await fs.readJSON(resultsFile)) as RunResults;
    results.runId = "../outside";
    await fs.writeJson(resultsFile, results);

    const { comparison } = comparisonOf(runsDir, "current-run");

    assert.equal(comparison.state, "unavailable");
    assert.deepEqual(comparison.passToFail, []);
  });
});

test("keeps ok true and exits 0 when a passing run has a pass-to-fail case", async () => {
  await withCliRepo(async ({ root, runsDir }) => {
    await writeRun(runsDir, { runId: "baseline-run" }, [
      alphaSkill([armCase("eval-1", "eval", true)]),
    ]);
    await writeRun(runsDir, { runId: "current-run", baselineRunId: "baseline-run" }, [
      alphaSkill([
        armCase("eval-1", "eval", false, {
          failedAssertions: ["contains:alpha"],
        }),
      ]),
    ]);

    const result = runGateCli(root, "current-run", "--json");

    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout) as GateReport;
    assert.equal(report.ok, true);
    assert.equal(report.runs[0]?.caseComparison?.state, "compared");
    assert.equal(report.runs[0]?.caseComparison?.passToFail.length, 1);
  });
});
