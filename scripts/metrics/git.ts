// scripts/metrics/git.ts
//
// REQ-001 / SRS-002: derive the DORA four from git history alone — deploy tags and
// commit timestamps. Every reader fails open: a missing `.git`, an empty tag list,
// or a git failure is reported `unavailable` with the reason, never a zero guessed
// as a real answer (REQ-002).

import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import type { Metric } from "./types";

/** Matches release tags this repo actually cuts: `cli-v2.6.2`, `android-v1.3.1`, bare `v1.2.3`. */
const DEPLOY_TAG_RE = /(^v\d+\.\d+\.\d+(-[0-9A-Za-z.]+)?$|-v\d+\.\d+\.\d+(-[0-9A-Za-z.]+)?$)/;

/** Subject-line heuristic for a commit that indicates a deploy needed a hotfix or rollback. */
const FAILURE_COMMIT_RE = /^(revert|fix)(\(|:| )/i;

export interface DeployTag {
  name: string;
  date: Date;
}

export interface CommitRef {
  hash: string;
  date: Date;
  subject: string;
}

export interface GitPeriod {
  currentSince: Date;
  currentUntil: Date;
  previousSince: Date;
  previousUntil: Date;
  label: string;
}

const DEFAULT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export function runGit(root: string, args: string[]): string | undefined {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return undefined;
  }
}

/** Resolves `--since <rev|date>` (or the default rolling 30d) into current/previous equal-length windows. */
export function resolvePeriod(root: string, sinceArg: string | undefined, now: Date = new Date()): GitPeriod {
  let currentSince: Date;
  if (!sinceArg) {
    currentSince = new Date(now.getTime() - DEFAULT_WINDOW_MS);
  } else {
    const asDate = new Date(sinceArg);
    if (!Number.isNaN(asDate.getTime())) {
      currentSince = asDate;
    } else {
      const out = runGit(root, ["log", "-1", "--format=%aI", sinceArg]);
      currentSince = out?.trim() ? new Date(out.trim()) : new Date(now.getTime() - DEFAULT_WINDOW_MS);
    }
  }
  const currentUntil = now;
  const windowMs = Math.max(currentUntil.getTime() - currentSince.getTime(), 1);
  const previousUntil = currentSince;
  const previousSince = new Date(currentSince.getTime() - windowMs);
  const days = Math.max(1, Math.round(windowMs / (24 * 60 * 60 * 1000)));
  return { currentSince, currentUntil, previousSince, previousUntil, label: `rolling ${days}d` };
}

/** All release-shaped tags in the repo (any date), sorted oldest first. `[]` when the repo has none. */
export function listDeployTags(root: string): DeployTag[] {
  const out = runGit(root, ["for-each-ref", "refs/tags", "--format=%(refname:short)|%(creatordate:iso-strict)"]);
  if (out === undefined) return [];
  return out
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, dateStr] = line.split("|");
      return { name, date: new Date(dateStr) };
    })
    .filter((t) => DEPLOY_TAG_RE.test(t.name) && !Number.isNaN(t.date.getTime()))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** Commits reachable from `to` but not `from` (or all history when `from` is undefined). */
function commitsBetween(root: string, from: string | undefined, to: string): CommitRef[] {
  const range = from ? `${from}..${to}` : to;
  const out = runGit(root, ["log", range, "--format=%H|%aI|%s"]);
  if (out === undefined) return [];
  return out
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [hash, dateStr, ...rest] = line.split("|");
      return { hash, date: new Date(dateStr), subject: rest.join("|") };
    })
    .filter((c) => !Number.isNaN(c.date.getTime()));
}

function inWindow(date: Date, since: Date, until: Date): boolean {
  return date.getTime() >= since.getTime() && date.getTime() < until.getTime();
}

function median(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function formatDuration(hours: number): string {
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

function trendLabel(current: number, previous: number | undefined, unit: string): string {
  if (previous === undefined) return "n/a (no prior period data)";
  if (current === previous) return `flat at ${current}${unit}`;
  const direction = current > previous ? "up" : "down";
  return `${direction} from ${previous}${unit} to ${current}${unit}`;
}

export interface FlowMetrics {
  deploymentFrequency: Metric;
  leadTimeForChanges: Metric;
  changeFailureRate: Metric;
  timeToRestore: Metric;
  period: GitPeriod;
}

/** REQ-001/SRS-002: derive the DORA four for `root` from git tags and commit history alone. */
export function readFlowMetrics(root: string, sinceArg: string | undefined, now: Date = new Date()): FlowMetrics {
  const period = resolvePeriod(root, sinceArg, now);
  const source = "git tags (`*-vX.Y.Z`, `git for-each-ref refs/tags`) and commit history (`git log`)";

  if (!fs.existsSync(path.join(root, ".git"))) {
    const reason = "no `.git` directory found; git history is unavailable";
    const unavailable: Metric = { available: false, reason, source };
    return {
      deploymentFrequency: unavailable,
      leadTimeForChanges: unavailable,
      changeFailureRate: unavailable,
      timeToRestore: { available: false, reason: "no incident record source in this repository" },
      period,
    };
  }

  const allTags = listDeployTags(root);
  const currentTags = allTags.filter((t) => inWindow(t.date, period.currentSince, period.currentUntil));
  const previousTags = allTags.filter((t) => inWindow(t.date, period.previousSince, period.previousUntil));

  const deploymentFrequency: Metric = {
    available: true,
    value: `${currentTags.length} deploy tag(s) in ${period.label}`,
    trend: trendLabel(currentTags.length, allTags.length > 0 ? previousTags.length : undefined, " tags"),
    source,
  };

  // Pair each tag with the one immediately before it (by date, across the whole tag list)
  // so "lead time" always means "since the previous deploy", not just the previous tag in-window.
  const leadTimesHours: number[] = [];
  const failedDeploys: boolean[] = [];
  for (const tag of currentTags) {
    const idx = allTags.findIndex((t) => t.name === tag.name);
    const prev = idx > 0 ? allTags[idx - 1] : undefined;
    const commits = commitsBetween(root, prev?.name, tag.name);
    for (const c of commits) {
      leadTimesHours.push((tag.date.getTime() - c.date.getTime()) / (60 * 60 * 1000));
    }
    failedDeploys.push(commits.some((c) => FAILURE_COMMIT_RE.test(c.subject)));
  }

  let leadTimeForChanges: Metric;
  const medianLead = median(leadTimesHours.filter((h) => h >= 0));
  if (currentTags.length === 0) {
    leadTimeForChanges = { available: false, reason: `no deploy tags found in ${period.label}`, source };
  } else if (medianLead === undefined) {
    leadTimeForChanges = {
      available: false,
      reason: "deploy tags found in period, but no commits between them and the prior deploy tag",
      source,
    };
  } else {
    leadTimeForChanges = {
      available: true,
      value: `median ${formatDuration(medianLead)} (n=${leadTimesHours.length} commits across ${currentTags.length} deploy(s))`,
      trend: "n/a (single-period derivation; no comparable prior-period commit set persisted)",
      source: `${source}; commit range per deploy tag`,
    };
  }

  let changeFailureRate: Metric;
  if (currentTags.length === 0) {
    changeFailureRate = { available: false, reason: `no deploy tags found in ${period.label} to classify`, source };
  } else {
    const failed = failedDeploys.filter(Boolean).length;
    const rate = failed / currentTags.length;
    changeFailureRate = {
      available: true,
      value: `${(rate * 100).toFixed(0)}% (${failed}/${currentTags.length} deploys with a revert/fix commit since the prior deploy)`,
      trend: "n/a (single-period derivation; no comparable prior-period classification persisted)",
      source: `${source}; commit subjects matching /^(revert|fix)/i`,
    };
  }

  const timeToRestore: Metric = {
    available: false,
    reason: "no incident record source in this repository (expects `artifacts/incidents/*.json`; none found)",
  };

  return { deploymentFrequency, leadTimeForChanges, changeFailureRate, timeToRestore, period };
}

/** Author-name heuristic for a commit produced by an AI agent rather than a human. */
const AGENT_AUTHOR_RE = /bot|agent|gpt|claude|codex|gemini|copilot|luna/i;

export interface AttributionCount {
  identityClass: "agent" | "human";
  changes: number;
}

/**
 * REQ-001/SRS-002 Attribution: classifies every commit author in `period` as
 * "agent" or "human" by name pattern — never by individual identity (Red Flag:
 * never rank individuals). `[]`-shaped (both counts 0) when there is no git
 * history or no commits in the period; the caller decides how to report that.
 */
export function attributionFromGit(root: string, period: GitPeriod): AttributionCount[] {
  const out = runGit(root, [
    "log",
    `--since=${period.currentSince.toISOString()}`,
    `--until=${period.currentUntil.toISOString()}`,
    "--format=%an",
  ]);
  const authors = out
    ? out
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
    : [];
  let agent = 0;
  let human = 0;
  for (const author of authors) {
    if (AGENT_AUTHOR_RE.test(author)) agent += 1;
    else human += 1;
  }
  return [
    { identityClass: "agent", changes: agent },
    { identityClass: "human", changes: human },
  ];
}
