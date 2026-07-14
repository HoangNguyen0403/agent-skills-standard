import fs from "fs-extra";
import * as path from "node:path";
import { ARCHIVE_DIR, HISTORY_JSON, ROOT_DIR, RUNS_DIR } from "./constants";
import { loadManifest } from "./manifest";
import { verifyRun } from "./verify";
import type { EvalsHistory } from "./types";
import { DEFAULT_COMPOSITE_SKILL_COUNT } from "./compose";

export interface PruneOptions {
  repoRoot?: string;
  version: string;
  keepRunId: string;
  apply?: boolean;
  expectedSkillCount?: number;
}

export interface PrunePlan {
  applied: boolean;
  keptRunId: string;
  deletedRunIds: string[];
  deletedArchivePaths: string[];
  deletedHistoryRunIds: string[];
}

function paths(repoRoot: string): {
  runsDir: string;
  archiveDir: string;
  historyPath: string;
} {
  if (repoRoot === ROOT_DIR)
    return {
      runsDir: RUNS_DIR,
      archiveDir: ARCHIVE_DIR,
      historyPath: HISTORY_JSON,
    };
  const evalsDir = path.join(repoRoot, "benchmarks", "evals");
  return {
    runsDir: path.join(evalsDir, "runs"),
    archiveDir: path.join(evalsDir, "archive"),
    historyPath: path.join(evalsDir, "history.json"),
  };
}

function isVersionRun(manifestPath: string, version: string): boolean {
  try {
    return loadManifest(path.dirname(manifestPath)).version === version;
  } catch {
    return false;
  }
}

export function pruneV2Runs(options: PruneOptions): PrunePlan {
  const repoRoot = options.repoRoot ?? ROOT_DIR;
  const locations = paths(repoRoot);
  const keepDir = path.join(locations.runsDir, options.keepRunId);
  if (!fs.existsSync(keepDir))
    throw new Error(`Canonical run not found: ${options.keepRunId}`);
  const keepManifest = loadManifest(keepDir);
  if (keepManifest.version !== options.version)
    throw new Error(
      `Canonical run ${options.keepRunId} does not use version ${options.version}`,
    );
  const expectedSkillCount =
    options.expectedSkillCount ?? DEFAULT_COMPOSITE_SKILL_COUNT;
  if (keepManifest.skills.length !== expectedSkillCount)
    throw new Error(
      `Canonical run has ${keepManifest.skills.length} skills; expected ${expectedSkillCount}`,
    );

  const runIds = fs.existsSync(locations.runsDir)
    ? fs
        .readdirSync(locations.runsDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .filter((runId) => runId !== options.keepRunId)
        .filter((runId) =>
          isVersionRun(
            path.join(locations.runsDir, runId, "manifest.json"),
            options.version,
          ),
        )
        .sort()
    : [];
  const archivePaths = fs.existsSync(locations.archiveDir)
    ? fs
        .readdirSync(locations.archiveDir, { withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => path.join(locations.archiveDir, entry.name))
        .filter(
          (archivePath) =>
            path.basename(archivePath, ".md") !== options.keepRunId,
        )
        .filter((archivePath) =>
          path.basename(archivePath).includes(`-v${options.version}`),
        )
        .sort()
    : [];
  const history = fs.existsSync(locations.historyPath)
    ? (fs.readJSONSync(locations.historyPath) as EvalsHistory)
    : { lastUpdated: new Date(0).toISOString(), records: [] };
  const historyRunIds = history.records
    .filter(
      (record) =>
        record.version === options.version &&
        record.runId !== options.keepRunId,
    )
    .map((record) => record.runId)
    .sort();

  if (options.apply) {
    const verification = verifyRun(options.keepRunId, { repoRoot });
    if (!verification.ok)
      throw new Error(
        `Canonical run is not verified; refusing prune: ${verification.reason ?? "unknown reason"}`,
      );
    for (const runId of runIds)
      fs.removeSync(path.join(locations.runsDir, runId));
    for (const archivePath of archivePaths) fs.removeSync(archivePath);
    history.records = history.records.filter(
      (record) =>
        record.version !== options.version ||
        record.runId === options.keepRunId,
    );
    fs.writeJSONSync(locations.historyPath, history, { spaces: 2 });
  }
  return {
    applied: options.apply === true,
    keptRunId: options.keepRunId,
    deletedRunIds: runIds,
    deletedArchivePaths: archivePaths,
    deletedHistoryRunIds: historyRunIds,
  };
}
