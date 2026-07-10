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

  it("verifyEvalRun passes when recomputed scores match committed results.json", () => {
    const outcome = verifyEvalRun(root, RUN_ID);
    expect(outcome.ok).toBe(true);
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
