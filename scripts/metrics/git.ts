// scripts/metrics/git.ts
//
// REQ-001 / SRS-002: derive git-history indicators — deploy tags and commit
// timestamps. These are explicitly labeled proxies (`basis: "proxy"`), never
// measured deployments or incidents. Every reader fails open: a missing `.git`,
// an empty tag list, or a git failure is reported `unavailable` with the reason,
// never a zero guessed as a real answer (REQ-002).

import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import type { AvailableMetric, Metric } from "./types";

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

/** Git history is a labeled proxy: it is never reported with `measured` basis. */
export function proxy(value: string, trend: string, source: string, sampleSize: number | null, limitations: string[]): AvailableMetric {
  return { available: true, value, trend, source, basis: "proxy", sampleSize, coverage: "unknown", limitations };
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

  const deploymentFrequency: Metric = proxy(
    `${currentTags.length} deploy tag(s) in ${period.label}`,
    trendLabel(currentTags.length, allTags.length > 0 ? previousTags.length : undefined, " tags"),
    `git proxy: ${source}`,
    currentTags.length,
    ["Release tags are a git-history proxy for deployments, not observed production deploys."],
  );

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
    leadTimeForChanges = proxy(
      `median ${formatDuration(medianLead)} (n=${leadTimesHours.length} commits across ${currentTags.length} deploy(s))`,
      "n/a (single-period derivation; no comparable prior-period commit set persisted)",
      `git proxy: ${source}; commit range per deploy tag`,
      leadTimesHours.length,
      ["Commit date to tag date; review queueing and release approval are excluded."],
    );
  }

  let changeFailureRate: Metric;
  if (currentTags.length === 0) {
    changeFailureRate = { available: false, reason: `no deploy tags found in ${period.label} to classify`, source };
  } else {
    const failed = failedDeploys.filter(Boolean).length;
    const rate = failed / currentTags.length;
    changeFailureRate = proxy(
      `${(rate * 100).toFixed(0)}% (${failed}/${currentTags.length} deploy tags with a revert/fix commit since the prior tag)`,
      "n/a (single-period derivation; no comparable prior-period classification persisted)",
      `git proxy: ${source}; commit subjects matching /^(revert|fix)/i`,
      currentTags.length,
      [
        "Commit-subject heuristic, not an incident or rollback record; this is not a measured change failure rate.",
      ],
    );
  }

  const timeToRestore: Metric = {
    available: false,
    reason: "no incident record source in this repository (expects `artifacts/incidents/*.json`; none found)",
  };

  return { deploymentFrequency, leadTimeForChanges, changeFailureRate, timeToRestore, period };
}
