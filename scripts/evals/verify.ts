import fs from "fs-extra";
import * as path from "path";
import { RESULTS_FILENAME, ROOT_DIR, RUNS_DIR } from "./constants";
import { loadManifest } from "./manifest";
import { assertInputsSnapshotIntegrity, loadRunInputs } from "./snapshot";
import { scoreRun } from "./scorer";
import { RunResults } from "./types";

export interface VerifyOptions {
  repoRoot?: string;
}

export interface VerifyOutcome {
  runId: string;
  ok: boolean;
  reason?: string;
  diffs?: string[];
}

function runsDirectory(repoRoot: string): string {
  return repoRoot === ROOT_DIR
    ? RUNS_DIR
    : path.join(repoRoot, "benchmarks", "evals", "runs");
}

function normalize(results: RunResults): unknown {
  const { scoredAt: _scoredAt, ...rest } = results;
  void _scoredAt;
  return rest;
}

function diffResults(committed: RunResults, recomputed: RunResults): string[] {
  if (
    JSON.stringify(normalize(committed)) ===
    JSON.stringify(normalize(recomputed))
  )
    return [];
  const diffs: string[] = [];
  const committedBySkill = new Map(
    committed.skills.map((skill) => [
      `${skill.category}/${skill.skillName}`,
      skill,
    ]),
  );
  for (const skill of recomputed.skills) {
    const key = `${skill.category}/${skill.skillName}`;
    const committedSkill = committedBySkill.get(key);
    if (!committedSkill) {
      diffs.push(
        `${key}: present in recomputed but not in committed results.json`,
      );
      continue;
    }
    if (JSON.stringify(committedSkill) !== JSON.stringify(skill)) {
      diffs.push(`${key}: committed score differs from recomputed score`);
    }
  }
  if (diffs.length === 0)
    diffs.push(
      "results differ outside per-skill details; inspect results.json directly",
    );
  return diffs;
}

export function verifyRun(
  runId: string,
  options: VerifyOptions = {},
): VerifyOutcome {
  const repoRoot = options.repoRoot ?? ROOT_DIR;
  const runDir = path.join(runsDirectory(repoRoot), runId);
  const resultsPath = path.join(runDir, RESULTS_FILENAME);
  if (!fs.existsSync(runDir))
    return { runId, ok: false, reason: `run directory not found: ${runDir}` };
  if (!fs.existsSync(resultsPath))
    return {
      runId,
      ok: false,
      reason: `no committed results.json at ${resultsPath}`,
    };

  const manifest = loadManifest(runDir);
  const inputs = loadRunInputs(runDir);
  if (manifest.schemaVersion === 2 && inputs === null) {
    return {
      runId,
      ok: false,
      reason: "v2 run is missing immutable inputs.json",
    };
  }
  if (manifest.schemaVersion === 2 && inputs) {
    try {
      assertInputsSnapshotIntegrity(manifest, inputs);
    } catch (error) {
      return {
        runId,
        ok: false,
        reason: error instanceof Error ? error.message : String(error),
      };
    }
  }

  const committed = fs.readJSONSync(resultsPath) as RunResults;
  let recomputed: RunResults;
  try {
    recomputed = scoreRun(runDir, {
      repoRoot,
      writeResults: false,
      writeManifest: false,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { runId, ok: false, reason };
  }

  const diffs = diffResults(committed, recomputed);
  if (diffs.length > 0) {
    return {
      runId,
      ok: false,
      reason: "recomputed scores differ from committed results.json",
      diffs,
    };
  }

  const suspicious = recomputed.skills.flatMap((skill) =>
    skill.scores
      .filter((score) => score.suspicious.length > 0)
      .map(
        (score) =>
          `${skill.skillName}/${score.id}.${score.arm}: ${score.suspicious.join("; ")}`,
      ),
  );
  if (suspicious.length > 0) {
    return {
      runId,
      ok: false,
      reason:
        "transcripts flagged as suspicious (possible copy-paste from expected_output)",
      diffs: suspicious,
    };
  }
  return { runId, ok: true };
}

export function verifyAllRuns(options: VerifyOptions = {}): VerifyOutcome[] {
  const repoRoot = options.repoRoot ?? ROOT_DIR;
  const runsDir = runsDirectory(repoRoot);
  if (!fs.existsSync(runsDir)) return [];
  return fs
    .readdirSync(runsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => verifyRun(entry.name, { repoRoot }));
}
