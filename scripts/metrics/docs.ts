// scripts/metrics/docs.ts
//
// REQ-001/SRS-002: BRD/PRD/SRS stage indicators derived from `docs/brd/`,
// `docs/prd/`, `docs/srs/` filenames and their git commit history — per
// `references/metrics-schema.md` "Derivation Notes" (BRD survival rate,
// requirement rework after the first task-list commit). Fails open: an absent
// directory, or a repo with no git history, yields `unavailable` with the reason.

import fs from "fs";
import path from "path";
import { runGit } from "./git";
import type { Metric, StageIndicatorRow } from "./types";

/** Slug -> file path (relative to `root`) for `<prefix>-<slug>.md` files directly under `docs/<dir>`. */
function slugFiles(root: string, dir: string, prefix: string): Map<string, string> {
  const dirPath = path.join(root, "docs", dir);
  const result = new Map<string, string>();
  if (!fs.existsSync(dirPath)) return result;
  const re = new RegExp(`^${prefix}-(.+)\\.md$`);
  for (const name of fs.readdirSync(dirPath)) {
    const match = re.exec(name);
    if (match) result.set(match[1], path.posix.join("docs", dir, name));
  }
  return result;
}

/** First commit date (oldest, following renames) for a file, or `undefined` if it has no git history. */
function firstCommitDate(root: string, relativePath: string): Date | undefined {
  const out = runGit(root, ["log", "--follow", "--format=%aI", "--reverse", "--", relativePath]);
  const firstLine = out?.split("\n").find((l) => l.trim().length > 0);
  if (!firstLine) return undefined;
  const date = new Date(firstLine.trim());
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** Commit dates (newest first) for a file; `[]` when it has no git history. */
function commitDates(root: string, relativePath: string): Date[] {
  const out = runGit(root, ["log", "--format=%aI", "--", relativePath]);
  if (!out) return [];
  return out
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => new Date(l))
    .filter((d) => !Number.isNaN(d.getTime()));
}

/** Lagging BRD indicator: BRDs (`docs/brd/brd-<slug>.md`) that reached a committed PRD, of those committed. */
export function brdSurvivalRate(root: string): StageIndicatorRow {
  const source = "docs/brd/*.md, docs/prd/*.md filenames";
  const brds = slugFiles(root, "brd", "brd");
  const prds = slugFiles(root, "prd", "prd");
  let metric: Metric;
  if (brds.size === 0) {
    metric = { available: false, reason: "no docs/brd/*.md files committed", source };
  } else {
    const survived = [...brds.keys()].filter((slug) => prds.has(slug)).length;
    metric = {
      available: true,
      value: `${survived}/${brds.size} BRDs reached a committed PRD`,
      trend: "n/a (single-period derivation; no comparable prior-period snapshot persisted)",
      source,
    };
  }
  return { stage: "BRD", indicator: "BRD survival rate into PRD", metric_result: metric };
}

/** Leading PRD/SRS indicator: median days from a slug's first BRD commit to its first PRD, then first SRS, commit. */
export function requirementCommitDeltas(root: string): StageIndicatorRow {
  const source = "git log --follow --format=%aI (first commit per docs/{brd,prd,srs}/*.md)";
  if (!fs.existsSync(path.join(root, ".git"))) {
    return {
      stage: "PRD / SRS",
      indicator: "BRD to PRD to SRS commit deltas",
      metric_result: { available: false, reason: "no `.git` directory found; git history is unavailable", source },
    };
  }
  const brds = slugFiles(root, "brd", "brd");
  const prds = slugFiles(root, "prd", "prd");
  const srsList = slugFiles(root, "srs", "srs");

  const brdToPrdDays: number[] = [];
  const prdToSrsDays: number[] = [];
  for (const [slug, brdPath] of brds) {
    const prdPath = prds.get(slug);
    if (!prdPath) continue;
    const brdDate = firstCommitDate(root, brdPath);
    const prdDate = firstCommitDate(root, prdPath);
    if (brdDate && prdDate) brdToPrdDays.push((prdDate.getTime() - brdDate.getTime()) / (24 * 60 * 60 * 1000));
    const srsPath = srsList.get(slug);
    if (!srsPath || !prdDate) continue;
    const srsDate = firstCommitDate(root, srsPath);
    if (srsDate) prdToSrsDays.push((srsDate.getTime() - prdDate.getTime()) / (24 * 60 * 60 * 1000));
  }

  let metric: Metric;
  if (brdToPrdDays.length === 0 && prdToSrsDays.length === 0) {
    metric = {
      available: false,
      reason: "no slug has both a committed BRD and PRD (or PRD and SRS) to measure a delta between",
      source,
    };
  } else {
    const avg = (values: number[]) => (values.length > 0 ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1) : "n/a");
    metric = {
      available: true,
      value: `avg BRD→PRD ${avg(brdToPrdDays)}d (n=${brdToPrdDays.length}), avg PRD→SRS ${avg(prdToSrsDays)}d (n=${prdToSrsDays.length})`,
      trend: "n/a (single-period derivation; no comparable prior-period snapshot persisted)",
      source,
    };
  }
  return { stage: "PRD / SRS", indicator: "BRD to PRD to SRS commit deltas", metric_result: metric };
}

/** Lagging PRD/SRS indicator: commits to a slug's PRD/SRS docs after its first `srs-task-list-<slug>.md` commit. */
export function requirementRework(root: string): StageIndicatorRow {
  const source = "git log --format=%aI (docs/prd/prd-<slug>.md, docs/srs/srs-<slug>.md vs docs/srs/srs-task-list-<slug>.md)";
  if (!fs.existsSync(path.join(root, ".git"))) {
    return {
      stage: "PRD / SRS",
      indicator: "requirement rework after first task-list commit",
      metric_result: { available: false, reason: "no `.git` directory found; git history is unavailable", source },
    };
  }
  const taskLists = slugFiles(root, "srs", "srs-task-list");
  if (taskLists.size === 0) {
    return {
      stage: "PRD / SRS",
      indicator: "requirement rework after first task-list commit",
      metric_result: { available: false, reason: "no docs/srs/srs-task-list-*.md files committed", source },
    };
  }
  const prds = slugFiles(root, "prd", "prd");
  const srsList = slugFiles(root, "srs", "srs");

  let reworkCommits = 0;
  let slugsWithTaskList = 0;
  for (const [slug, taskListPath] of taskLists) {
    const firstTaskListDate = firstCommitDate(root, taskListPath);
    if (!firstTaskListDate) continue;
    slugsWithTaskList += 1;
    for (const relatedPath of [prds.get(slug), srsList.get(slug)]) {
      if (!relatedPath) continue;
      reworkCommits += commitDates(root, relatedPath).filter((d) => d.getTime() > firstTaskListDate.getTime()).length;
    }
  }

  const metric: Metric = {
    available: true,
    value: `${reworkCommits} rework commit(s) across ${slugsWithTaskList} task-listed slug(s)`,
    trend: "n/a (single-period derivation; no comparable prior-period snapshot persisted)",
    source,
  };
  return { stage: "PRD / SRS", indicator: "requirement rework after first task-list commit", metric_result: metric };
}
