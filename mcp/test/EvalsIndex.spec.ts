import { createHash } from "node:crypto";
import fs from "fs-extra";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  listEvalRuns,
  readEvalsReport,
  verifyEvalRun,
} from "../src/services/EvalsIndex";
import { getEvalReport, verifyEvalRunTool } from "../src/tools";
import { SessionTracker } from "../src/services/SessionTracker";
import { SkillIndex } from "../src/services/SkillIndex";

const RUN_ID = "dart-v9.9.9-2099-01-01";

async function fixture(): Promise<{
  root: string;
  runDir: string;
  cleanup: () => Promise<void>;
}> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ags-evals-fixture-"));
  const skillDir = path.join(root, "skills", "dart", "dart-tooling");
  await fs.ensureDir(path.join(skillDir, "evals"));
  await fs.writeJson(path.join(skillDir, "evals", "evals.json"), {
    skill_name: "dart-tooling",
    evals: [
      {
        id: 1,
        prompt: "some prompt",
        assertions: [{ type: "contains", value: "dart format" }],
      },
    ],
  });

  const runDir = path.join(root, "benchmarks", "evals", "runs", RUN_ID);
  await fs.ensureDir(path.join(runDir, "answers", "dart-tooling"));
  await fs.writeJson(path.join(runDir, "manifest.json"), {
    runId: RUN_ID,
    category: "dart",
    version: "9.9.9",
    metadata: {},
    skills: [
      {
        category: "dart",
        skillName: "dart-tooling",
        cases: [
          {
            id: "eval-1",
            kind: "eval",
            arms: { baseline: "done", "with-skill": "done" },
          },
        ],
      },
    ],
  });
  await fs.writeFile(
    path.join(runDir, "answers", "dart-tooling", "eval-1.baseline.md"),
    "just run the formatter somehow",
  );
  await fs.writeFile(
    path.join(runDir, "answers", "dart-tooling", "eval-1.with-skill.md"),
    "run dart format . --line-length 80",
  );
  await fs.writeJson(path.join(runDir, "results.json"), {
    runId: RUN_ID,
    category: "dart",
    version: "9.9.9",
    scoredAt: new Date().toISOString(),
    metadata: {},
    skills: [
      {
        category: "dart",
        skillName: "dart-tooling",
        guardrailApplicable: false,
        totalEvalCases: 1,
        baselinePassRate: 0,
        withSkillPassRate: 1,
        delta: 1,
        triggerPrecision: null,
        scores: [],
        incompleteArms: [],
      },
    ],
  });

  return {
    root,
    runDir,
    cleanup: () => fs.remove(root),
  };
}

function resourceHash(encodedResource: string): string {
  const bytes = Buffer.from(encodedResource, "base64");
  return createHash("sha256").update(bytes).digest("hex");
}

async function v2Fixture(withResourceFingerprints: boolean): Promise<{
  root: string;
  runId: string;
  runDir: string;
  cleanup: () => Promise<void>;
}> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ags-mcp-evals-v2-"));
  const runId = "all-v2-9.9.9-2099-01-01-test";
  const runDir = path.join(root, "benchmarks", "evals", "runs", runId);
  const sourceKey = "dart/dart-tooling";
  const skillMarkdown = "old skill";
  const evals = {
    evals: [{ id: 1, assertions: [{ type: "contains", value: "answer" }] }],
  };
  const skillMarkdownBase64 = Buffer.from(skillMarkdown).toString("base64");
  const evalsBase64 = Buffer.from(JSON.stringify(evals)).toString("base64");
  const resources = {
    "SKILL.md": skillMarkdownBase64,
    "references/guide.md": Buffer.from("use the formatter guide").toString(
      "base64",
    ),
  };
  await fs.ensureDir(path.join(runDir, "answers", "dart", "dart-tooling"));
  await fs.writeJson(path.join(runDir, "manifest.json"), {
    schemaVersion: 2,
    runId,
    category: "all",
    version: "9.9.9",
    metadata: {},
    scope: { kind: "all", categories: ["dart"] },
    protocol: {
      isolation: "worker-per-arm",
      baseline: "prompt-only",
      withSkill: "prompt-plus-skill",
      trigger: "name-description-only",
    },
    sourceHashes: {
      [sourceKey]: {
        skill: resourceHash(skillMarkdownBase64),
        evals: resourceHash(evalsBase64),
      },
    },
    ...(withResourceFingerprints ? { inputProvenanceVersion: 1 } : {}),
    ...(withResourceFingerprints
      ? {
          resourceFingerprints: {
            [sourceKey]: {
              version: 1,
              resources: {
                "SKILL.md": resourceHash(resources["SKILL.md"]),
                "references/guide.md": resourceHash(
                  resources["references/guide.md"],
                ),
              },
            },
          },
        }
      : {}),
    compromisedSkills: [],
    skills: [
      {
        category: "dart",
        skillName: "dart-tooling",
        cases: [
          {
            id: "eval-1",
            kind: "eval",
            arms: { baseline: "done", "with-skill": "done" },
          },
        ],
      },
    ],
  });
  await fs.writeJson(path.join(runDir, "inputs.json"), {
    schemaVersion: 2,
    runId,
    capturedAt: "2099-01-01T00:00:00.000Z",
    sources: {
      [sourceKey]: {
        category: "dart",
        skillName: "dart-tooling",
        skillMarkdown,
        skillMarkdownBase64,
        evals,
        evalsBase64,
        ...(withResourceFingerprints ? { resources } : {}),
      },
    },
  });
  await fs.writeFile(
    path.join(runDir, "answers", "dart", "dart-tooling", "eval-1.baseline.md"),
    "generic formatter guidance",
  );
  await fs.writeFile(
    path.join(
      runDir,
      "answers",
      "dart",
      "dart-tooling",
      "eval-1.with-skill.md",
    ),
    "answer with formatter guidance",
  );
  await fs.writeJson(path.join(runDir, "results.json"), {
    schemaVersion: 2,
    runId,
    category: "all",
    version: "9.9.9",
    scoredAt: "2099-01-01T00:00:00.000Z",
    metadata: {},
    skills: [
      {
        category: "dart",
        skillName: "dart-tooling",
        baselinePassRate: 0,
        withSkillPassRate: 1,
        delta: 1,
        casePassRate: { baseline: 0, withSkill: 1 },
        assertionPassRate: { baseline: 0, withSkill: 1 },
        triggerRecall: null,
        triggerSpecificity: null,
        balancedTriggerAccuracy: null,
      },
    ],
  });
  return { root, runId, runDir, cleanup: () => fs.remove(root) };
}

describe("EvalsIndex", () => {
  let root: string;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const f = await fixture();
    root = f.root;
    cleanup = f.cleanup;
  });

  afterEach(async () => {
    await cleanup();
  });

  it("listEvalRuns finds committed runs", () => {
    expect(listEvalRuns(root)).toEqual([RUN_ID]);
  });

  it("listEvalRuns returns [] when no runs dir exists", async () => {
    const empty = await fs.mkdtemp(path.join(os.tmpdir(), "ags-empty-"));
    expect(listEvalRuns(empty)).toEqual([]);
    await fs.remove(empty);
  });

  it("verifies legacy v1 runs without resource fingerprints", () => {
    expect(verifyEvalRun(root, RUN_ID).ok).toBe(true);
  });

  it("verifyEvalRun fails when a transcript is tampered with after scoring", async () => {
    const runDir = path.join(root, "benchmarks", "evals", "runs", RUN_ID);
    await fs.writeFile(
      path.join(runDir, "answers", "dart-tooling", "eval-1.baseline.md"),
      "actually mentions dart format now",
    );
    const outcome = verifyEvalRun(root, RUN_ID);
    expect(outcome.ok).toBe(false);
    expect(outcome.diffs?.[0]).toContain("dart-tooling");
  });

  it("verifyEvalRun fails cleanly for an unknown run id", () => {
    const outcome = verifyEvalRun(root, "does-not-exist");
    expect(outcome.ok).toBe(false);
    expect(outcome.reason).toMatch(/not found/);
  });

  it("readEvalsReport returns null when evals-report.md is absent", () => {
    expect(readEvalsReport(root)).toBeNull();
  });

  it("readEvalsReport returns file contents when present", async () => {
    await fs.writeFile(path.join(root, "evals-report.md"), "# Live Evals\n");
    expect(readEvalsReport(root)).toContain("# Live Evals");
  });

  it("verifies legacy v2 runs without resource fingerprints", async () => {
    const v2 = await v2Fixture(false);

    expect(verifyEvalRun(v2.root, v2.runId).ok).toBe(true);

    await v2.cleanup();
  });

  it("verifies v2 resource provenance when snapshot bytes match manifest hashes", async () => {
    const v2 = await v2Fixture(true);

    expect(verifyEvalRun(v2.root, v2.runId).ok).toBe(true);

    await v2.cleanup();
  });

  it("rejects v2 resource fingerprints without resource provenance", async () => {
    const v2 = await v2Fixture(true);
    const inputsPath = path.join(v2.runDir, "inputs.json");
    const inputs = await fs.readJson(inputsPath);
    delete inputs.sources["dart/dart-tooling"].resources;
    await fs.writeJson(inputsPath, inputs);

    const outcome = verifyEvalRun(v2.root, v2.runId);

    expect(outcome.ok).toBe(false);
    expect(outcome.reason).toBe(
      "immutable source provenance differs from manifest",
    );
    expect(outcome.diffs).toContain(
      "Missing immutable resource provenance for dart/dart-tooling",
    );

    await v2.cleanup();
  });

  it("rejects tampered v2 resource bytes even when manifest hashes remain unchanged", async () => {
    const v2 = await v2Fixture(true);
    const inputsPath = path.join(v2.runDir, "inputs.json");
    const inputs = await fs.readJson(inputsPath);
    inputs.sources["dart/dart-tooling"].resources["references/guide.md"] =
      Buffer.from("tampered formatter guide").toString("base64");
    await fs.writeJson(inputsPath, inputs);

    const outcome = verifyEvalRun(v2.root, v2.runId);

    expect(outcome.ok).toBe(false);
    expect(outcome.diffs).toContain(
      "Immutable resource mismatch for dart/dart-tooling/references/guide.md",
    );

    await v2.cleanup();
  });

  it("rejects parsed eval assertions that diverge from committed raw source bytes", async () => {
    const v2 = await v2Fixture(true);
    const inputsPath = path.join(v2.runDir, "inputs.json");
    const inputs = await fs.readJson(inputsPath);
    inputs.sources["dart/dart-tooling"].evals.evals[0].assertions = [
      { type: "contains", value: "formatter" },
    ];
    await fs.writeJson(inputsPath, inputs);

    const outcome = verifyEvalRun(v2.root, v2.runId);

    expect(outcome.ok).toBe(false);
    expect(outcome.diffs).toContain(
      "Raw eval snapshot mismatch for dart/dart-tooling",
    );
    await v2.cleanup();
  });

  it("rejects parsed skill bodies that diverge from committed raw source bytes", async () => {
    const v2 = await v2Fixture(true);
    const inputsPath = path.join(v2.runDir, "inputs.json");
    const inputs = await fs.readJson(inputsPath);
    inputs.sources["dart/dart-tooling"].skillMarkdown = "tampered skill body";
    await fs.writeJson(inputsPath, inputs);

    const outcome = verifyEvalRun(v2.root, v2.runId);

    expect(outcome.ok).toBe(false);
    expect(outcome.diffs).toContain(
      "Raw skill snapshot mismatch for dart/dart-tooling",
    );
    await v2.cleanup();
  });
});

describe("verify_eval_run / get_eval_report tools", () => {
  let root: string;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const f = await fixture();
    root = f.root;
    cleanup = f.cleanup;
  });

  afterEach(async () => {
    await cleanup();
  });

  async function ctxFor(projectRoot: string, skillsDir: string | null = null) {
    const index = new SkillIndex(
      skillsDir,
      skillsDir ? path.join(skillsDir, "metadata.json") : undefined,
    );
    await index.load();
    return {
      projectRoot,
      index,
      tracker: new SessionTracker(),
      setup: { kind: "ready" as const },
    };
  }

  it("verifyEvalRunTool reports success for a valid committed run", async () => {
    const result = await verifyEvalRunTool(
      { run_id: RUN_ID },
      await ctxFor(root, path.join(root, "skills")),
    );
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain("verified");
  });

  it("verifyEvalRunTool guides the user when no runs exist", async () => {
    const empty = await fs.mkdtemp(path.join(os.tmpdir(), "ags-empty-"));
    const result = await verifyEvalRunTool({}, await ctxFor(empty));
    expect(result.content[0].text).toMatch(/No eval runs found/);
    await fs.remove(empty);
  });

  it("getEvalReport guides the user when no report exists yet", async () => {
    const result = await getEvalReport({}, await ctxFor(root));
    expect(result.content[0].text).toMatch(/No .evals-report\.md. found/);
  });

  it("getEvalReport returns the report when present", async () => {
    await fs.writeFile(path.join(root, "evals-report.md"), "# Live Evals\n");
    const result = await getEvalReport({}, await ctxFor(root));
    expect(result.content[0].text).toContain("# Live Evals");
  });
});
