// scripts/metrics/github-export.ts
//
// REQ-AFC-07 / AC-AFC-13: read-only GitHub export of delivery observations into
// `artifacts/metrics/delivery-observations.json` (`schema_version: 1`,
// `source_kind: "host-export"`). Every value comes from `gh`/git; a field the
// export cannot establish is omitted rather than guessed, and the assembled file
// must pass `scripts/metrics/delivery.ts` validation or nothing is written.
//
// Mapping (SRS-AFC-07):
//   change_id = `pr-<number>`, revision = merge-time head SHA
//   submission          attempt 1 at PR createdAt
//   correction          one round per CHANGES_REQUESTED review followed by >=1 commit before merge
//   acceptance          merged => accepted at mergedAt, authority `merge:<merge_commit_sha>`
//                       closed unmerged => rejected at closedAt
//   deployment          successful production run of publish.yml / deploy-server.yml /
//                       deploy-website.yml (`gha:<workflow>:<run_id>`), first_change_at =
//                       earliest createdAt among PRs merged into the tagged commit since the
//                       previous production SHA of the same workflow (git ancestors)
//   not exported        review, decision-wait, defect, cost (no GitHub source) — coverage
//                       `kinds` lists only exported kinds so those rows stay unavailable
//
// Selection and completeness rules this file is responsible for:
//   - PRs are observed by decision time (merged/closed) inside [since, until), so a PR
//     opened earlier still carries its full created -> decision lifecycle.
//   - A deployment's membership is commit ancestry only: merge commit is an ancestor of
//     the current production SHA and not of the previous production SHA (same workflow).
//   - Deployment runs are cohorted by completion time, so a run created before `since`
//     but completed inside the window is exported.
//   - Coverage never claims anything past the run's as-of instant; a future `--until`
//     is rejected before anything is written.
//   - GitHub caps a PR's commit listing at 250 and a filtered workflow-run search at
//     1,000 results. A capped commit listing marks that change's correction coverage
//     incomplete; a capped run search is partitioned by date or fails closed.
//
// No titles, bodies, comments, or reviewer identities are read into the export.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DELIVERY_OBSERVATIONS_PATH, readDeliveryObservations } from "./delivery";
import { resolveRepo, runGh, type GhRunner } from "./pr-baseline";
import type { DeliveryCoverage, DeliveryEvent, DeliveryObservationFile } from "./types";

/** Workflows whose successful production completion is a deployment observation. */
export const DEPLOYMENT_WORKFLOWS = ["publish.yml", "deploy-server.yml", "deploy-website.yml"] as const;
export type DeploymentWorkflow = (typeof DEPLOYMENT_WORKFLOWS)[number];

/** Only these kinds are exported; every other metric stays unavailable by coverage. */
export const EXPORTED_KINDS = ["submission", "correction", "acceptance", "deployment"] as const;

const MS_PER_DAY = 86_400_000;
/** GitHub's PR commit-listing cap; at the cap the listing is not known to be complete. */
const PR_COMMIT_LIST_LIMIT = 250;
/** GitHub's filtered workflow-run search cap. */
const RUN_SEARCH_LIMIT = 1000;
/** Lower bound for partitioning an unbounded run search; no GitHub run predates it. */
const RUN_SEARCH_FLOOR = "2008-01-01T00:00:00.000Z";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isoDate(value: unknown, label: string): string {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) throw new Error(`${label} must be a UTC ISO timestamp`);
  return value;
}

// ---------------------------------------------------------------------------
// Raw payload shapes (snake_case at the GitHub boundary)
// ---------------------------------------------------------------------------

export interface RawPull {
  number: number;
  createdAt: string;
  mergedAt: string | null;
  closedAt: string | null;
  headSha: string;
  mergeCommitSha: string | null;
}

export interface RawReview {
  id: number;
  state: string;
  submittedAt: string;
}

export interface RawCommit {
  sha: string;
  committedAt: string;
}

export interface RawRun {
  id: number;
  conclusion: string | null;
  event: string;
  headSha: string;
  createdAt: string;
  completedAt: string;
}

/** A PR's commit listing plus whether GitHub returned it in full (cap: 250). */
export interface CommitListing {
  commits: RawCommit[];
  complete: boolean;
}

export function validatePull(entry: unknown, index: number): RawPull {
  if (!isRecord(entry)) throw new Error(`malformed pull entry at index ${index}`);
  if (typeof entry.number !== "number" || !Number.isInteger(entry.number) || entry.number <= 0) {
    throw new Error(`malformed pull entry at index ${index}: number`);
  }
  const head = entry.head;
  if (!isRecord(head) || typeof head.sha !== "string" || !head.sha) {
    throw new Error(`malformed pull entry #${entry.number}: head.sha`);
  }
  const mergedAt = entry.merged_at === null || entry.merged_at === undefined ? null : isoDate(entry.merged_at, `pull #${entry.number} merged_at`);
  const closedAt = entry.closed_at === null || entry.closed_at === undefined ? null : isoDate(entry.closed_at, `pull #${entry.number} closed_at`);
  if (!mergedAt && !closedAt) throw new Error(`malformed pull entry #${entry.number}: neither merged_at nor closed_at`);
  return {
    number: entry.number,
    createdAt: isoDate(entry.created_at, `pull #${entry.number} created_at`),
    mergedAt,
    closedAt,
    headSha: head.sha,
    mergeCommitSha: typeof entry.merge_commit_sha === "string" && entry.merge_commit_sha ? entry.merge_commit_sha : null,
  };
}

export function validateReview(entry: unknown, index: number): RawReview {
  if (!isRecord(entry)) throw new Error(`malformed review entry at index ${index}`);
  if (typeof entry.id !== "number" || !Number.isInteger(entry.id)) throw new Error(`malformed review entry at index ${index}: id`);
  if (typeof entry.state !== "string" || !entry.state) throw new Error(`malformed review ${entry.id}: state`);
  return { id: entry.id, state: entry.state, submittedAt: isoDate(entry.submitted_at, `review ${entry.id} submitted_at`) };
}

export function validateCommit(entry: unknown, index: number): RawCommit {
  if (!isRecord(entry)) throw new Error(`malformed commit entry at index ${index}`);
  if (typeof entry.sha !== "string" || !entry.sha) throw new Error(`malformed commit entry at index ${index}: sha`);
  const commit = entry.commit;
  if (!isRecord(commit) || !isRecord(commit.committer) || typeof commit.committer.date !== "string") {
    throw new Error(`malformed commit ${entry.sha}: commit.committer.date`);
  }
  return { sha: entry.sha, committedAt: isoDate(commit.committer.date, `commit ${entry.sha} committer.date`) };
}

/**
 * A workflow run as the runs API returns it: no `inputs`, so a manual dispatch of
 * `deploy-website.yml` cannot be classified production vs preview from this payload.
 */
export function validateRun(entry: unknown, index: number): RawRun {
  if (!isRecord(entry)) throw new Error(`malformed workflow run at index ${index}`);
  if (typeof entry.id !== "number" || !Number.isInteger(entry.id)) throw new Error(`malformed workflow run at index ${index}: id`);
  if (typeof entry.event !== "string" || !entry.event) throw new Error(`malformed workflow run ${entry.id}: event`);
  if (typeof entry.head_sha !== "string" || !entry.head_sha) throw new Error(`malformed workflow run ${entry.id}: head_sha`);
  return {
    id: entry.id,
    conclusion: typeof entry.conclusion === "string" ? entry.conclusion : null,
    event: entry.event,
    headSha: entry.head_sha,
    createdAt: isoDate(entry.created_at, `workflow run ${entry.id} created_at`),
    completedAt: isoDate(entry.updated_at, `workflow run ${entry.id} updated_at`),
  };
}

// ---------------------------------------------------------------------------
// Injectable GitHub boundary
// ---------------------------------------------------------------------------

export interface RunRange {
  sinceIso?: string;
  beforeIso?: string;
}

/**
 * The exporter's only external boundary. Implementations throw on transport or
 * malformed responses; the CLI then exits non-zero without writing anything.
 */
export interface GitHubFetcher {
  /** Every closed PR; the builder selects by merge/close time and commit ancestry. */
  listClosedPulls(): Promise<RawPull[]>;
  listReviews(pullNumber: number): Promise<RawReview[]>;
  listCommits(pullNumber: number): Promise<CommitListing>;
  listRuns(workflow: DeploymentWorkflow, range: RunRange): Promise<RawRun[]>;
  isAncestor(ancestorSha: string, descendantSha: string): Promise<boolean>;
}

function firstLine(text: string): string {
  return text.split("\n").map((line) => line.trim()).filter(Boolean)[0]?.slice(0, 200) ?? "unknown error";
}

/** Exit status of a failed `execFileSync` call, when the platform error carries one. */
function exitStatus(error: unknown): number | undefined {
  if (error && typeof error === "object" && "status" in error) {
    return typeof error.status === "number" ? error.status : undefined;
  }
  return undefined;
}

function ghFailure(error: unknown): string {
  if (error && typeof error === "object" && "stderr" in error) {
    const { stderr } = error;
    if (typeof stderr === "string" && stderr.trim()) return firstLine(stderr);
    if (stderr instanceof Uint8Array) return firstLine(Buffer.from(stderr).toString("utf8"));
  }
  return error instanceof Error ? firstLine(error.message) : String(error);
}

function ghJson(run: GhRunner, args: string[], label: string): unknown {
  let output: string;
  try {
    output = run(args);
  } catch (error) {
    throw new Error(`${label}: ${ghFailure(error)}`);
  }
  try {
    return JSON.parse(output.trim() || "null");
  } catch {
    throw new Error(`${label}: gh returned invalid JSON`);
  }
}

function ghText(run: GhRunner, args: string[], label: string): string {
  try {
    return run(args).trim();
  } catch (error) {
    throw new Error(`${label}: ${ghFailure(error)}`);
  }
}

/** `gh api --paginate --slurp` returns one entry per page; array endpoints page an array. */
function flattenPages(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label}: expected a JSON array`);
  return value.flatMap((page) => (Array.isArray(page) ? page : [page]));
}

/** GitHub's `created` filter expects seconds precision, e.g. `2026-08-01T00:00:00Z`. */
function queryIso(iso: string): string {
  return new Date(iso).toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function createGhFetcher(repo: string, run: GhRunner = runGh, cwd: string = process.cwd()): GitHubFetcher {
  const fetchRunRange = async (workflow: DeploymentWorkflow, fromIso: string, toIso: string): Promise<RawRun[]> => {
    const created = `${queryIso(fromIso)}..${queryIso(toIso)}`;
    const value = ghJson(
      run,
      [
        "api",
        "--paginate",
        "--slurp",
        `repos/${repo}/actions/workflows/${workflow}/runs?status=success&per_page=100&created=${encodeURIComponent(created)}`,
      ],
      `workflow runs ${workflow}`,
    );
    const pages = Array.isArray(value) ? value : [];
    let totalCount = 0;
    const runs: RawRun[] = [];
    for (const page of pages) {
      if (!isRecord(page) || !Array.isArray(page.workflow_runs)) {
        throw new Error(`workflow runs ${workflow}: malformed page`);
      }
      if (typeof page.total_count === "number") totalCount = Math.max(totalCount, page.total_count);
      page.workflow_runs.forEach((entry, index) => runs.push(validateRun(entry, index)));
    }
    if (totalCount <= RUN_SEARCH_LIMIT && runs.length < RUN_SEARCH_LIMIT) return runs;

    // The search is capped, so this result is not known to be exhaustive: partition
    // the `created` range until each part is under the cap, or fail closed.
    const span = Date.parse(toIso) - Date.parse(fromIso);
    if (span <= MS_PER_DAY) {
      throw new Error(
        `workflow runs ${workflow}: more than ${RUN_SEARCH_LIMIT} results between ${fromIso} and ${toIso}; cannot partition further`,
      );
    }
    const midIso = new Date(Date.parse(fromIso) + Math.floor(span / 2)).toISOString();
    return [
      ...(await fetchRunRange(workflow, fromIso, midIso)),
      ...(await fetchRunRange(workflow, midIso, toIso)),
    ];
  };

  return {
    async listClosedPulls() {
      const value = ghJson(
        run,
        ["api", "--paginate", "--slurp", `repos/${repo}/pulls?state=closed&per_page=100`],
        "pull list",
      );
      return flattenPages(value, "pull list").map(validatePull);
    },
    async listReviews(pullNumber) {
      const value = ghJson(
        run,
        ["api", "--paginate", "--slurp", `repos/${repo}/pulls/${pullNumber}/reviews?per_page=100`],
        `reviews for pull #${pullNumber}`,
      );
      return flattenPages(value, `reviews for pull #${pullNumber}`).map(validateReview);
    },
    async listCommits(pullNumber) {
      const value = ghJson(
        run,
        ["api", "--paginate", "--slurp", `repos/${repo}/pulls/${pullNumber}/commits?per_page=100`],
        `commits for pull #${pullNumber}`,
      );
      const commits = flattenPages(value, `commits for pull #${pullNumber}`).map(validateCommit);
      return { commits, complete: commits.length < PR_COMMIT_LIST_LIMIT };
    },
    async listRuns(workflow, range) {
      const runs = await fetchRunRange(workflow, range.sinceIso ?? RUN_SEARCH_FLOOR, range.beforeIso ?? new Date().toISOString());
      return runs
        .filter((entry) => entry.conclusion === "success")
        .filter((entry) => !range.sinceIso || Date.parse(entry.createdAt) >= Date.parse(range.sinceIso))
        .filter((entry) => !range.beforeIso || Date.parse(entry.createdAt) < Date.parse(range.beforeIso));
    },
    async isAncestor(ancestorSha, descendantSha) {
      if (ancestorSha === descendantSha) return true;
      try {
        execFileSync("git", ["merge-base", "--is-ancestor", ancestorSha, descendantSha], {
          cwd,
          stdio: ["ignore", "ignore", "ignore"],
        });
        return true;
      } catch (error) {
        // Exit status 1 means "not an ancestor"; anything else means the commit is
        // not resolvable locally, so ask GitHub's compare endpoint instead.
        if (exitStatus(error) === 1) return false;
      }
      const status = ghText(
        run,
        ["api", `repos/${repo}/compare/${ancestorSha}...${descendantSha}`, "--jq", ".status"],
        `compare ${ancestorSha}...${descendantSha}`,
      );
      return status === "ahead" || status === "identical";
    },
  };
}

// ---------------------------------------------------------------------------
// Export assembly
// ---------------------------------------------------------------------------

export interface ExportWindow {
  /** Inclusive ISO start of the observation window. */
  since: string;
  /** Exclusive ISO end of the observation window. */
  until: string;
  /** Instant the export is assembled; coverage never claims past it. */
  asOf: string;
}

export interface ExportResult {
  file: DeliveryObservationFile;
  notes: string[];
}

function isProductionRun(workflow: DeploymentWorkflow, run: RawRun): boolean {
  if (run.conclusion !== "success") return false;
  // `deploy-website.yml` deploys production on a `website-v*` tag push. The runs
  // API does not expose dispatch inputs, so a manual dispatch (preview by default)
  // cannot be classified and is excluded rather than assumed production.
  if (workflow !== "deploy-website.yml") return true;
  return run.event === "push";
}

function byCompletedAsc(left: RawRun, right: RawRun): number {
  return Date.parse(left.completedAt) - Date.parse(right.completedAt);
}

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const lanes = Array.from({ length: Math.min(Math.max(limit, 1), Math.max(items.length, 1)) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index]);
    }
  });
  await Promise.all(lanes);
  return results;
}

interface PullObservations {
  pull: RawPull;
  events: DeliveryEvent[];
  coverage: DeliveryCoverage[];
}

/**
 * Builds submission/correction/acceptance observations and lifecycle coverage for
 * one pull. A capped commit listing cannot establish whether a review was followed
 * by a commit, so no correction is emitted and correction coverage stays incomplete.
 */
async function observePull(fetcher: GitHubFetcher, pull: RawPull): Promise<PullObservations> {
  const accepted = pull.mergedAt !== null;
  const decisionAt = accepted ? pull.mergedAt! : pull.closedAt!;
  const id = `pr-${pull.number}`;
  const sourceRef = `github:pull/${pull.number}`;
  const events: DeliveryEvent[] = [
    {
      id: `gh:${id}:submission`,
      kind: "submission",
      change_id: id,
      revision: pull.headSha,
      observed_at: pull.createdAt,
      source_ref: sourceRef,
      attempt: 1,
    },
  ];
  const coverage: DeliveryCoverage[] = [
    {
      change_id: id,
      revisions: [pull.headSha],
      from: pull.createdAt,
      through: decisionAt,
      kinds: ["submission", "acceptance"],
      complete: true,
    },
  ];

  if (accepted) {
    let correctionComplete = true;
    const reviews = (await fetcher.listReviews(pull.number)).filter((review) => review.state === "CHANGES_REQUESTED");
    if (reviews.length > 0) {
      const listing = await fetcher.listCommits(pull.number);
      correctionComplete = listing.complete;
      if (listing.complete) {
        const mergedAt = Date.parse(pull.mergedAt!);
        for (const review of reviews.sort((left, right) => Date.parse(left.submittedAt) - Date.parse(right.submittedAt))) {
          const requestedAt = Date.parse(review.submittedAt);
          const followedByCommit = listing.commits.some((commit) => {
            const committedAt = Date.parse(commit.committedAt);
            return committedAt > requestedAt && committedAt <= mergedAt;
          });
          if (!followedByCommit) continue;
          events.push({
            id: `gh:${id}:correction:${review.id}`,
            kind: "correction",
            change_id: id,
            revision: pull.headSha,
            observed_at: review.submittedAt,
            source_ref: `${sourceRef}#review/${review.id}`,
            round_id: `cr-${review.id}`,
          });
        }
      }
    }
    coverage.push({
      change_id: id,
      revisions: [pull.headSha],
      from: pull.createdAt,
      through: decisionAt,
      kinds: ["correction"],
      complete: correctionComplete,
    });
    if (!pull.mergeCommitSha) throw new Error(`pull #${pull.number} is merged without merge_commit_sha`);
    events.push({
      id: `gh:${id}:acceptance`,
      kind: "acceptance",
      change_id: id,
      revision: pull.headSha,
      observed_at: pull.mergedAt!,
      source_ref: `${sourceRef}#merge/${pull.mergeCommitSha}`,
      attempt: 1,
      decision: "accepted",
      authority_ref: `merge:${pull.mergeCommitSha}`,
    });
  } else {
    events.push({
      id: `gh:${id}:acceptance`,
      kind: "acceptance",
      change_id: id,
      revision: pull.headSha,
      observed_at: pull.closedAt!,
      source_ref: `${sourceRef}#closed`,
      attempt: 1,
      decision: "rejected",
      authority_ref: `close:${id}`,
    });
  }

  return { pull, events, coverage };
}

/**
 * Builds the full observation file for `window`. PRs are selected by decision
 * time; deployment runs by completion time; membership by commit ancestry against
 * the current and previous production SHAs of the same workflow.
 */
export async function buildExport(fetcher: GitHubFetcher, window: ExportWindow): Promise<ExportResult> {
  const sinceMs = Date.parse(window.since);
  const untilMs = Date.parse(window.until);
  const asOfMs = Date.parse(window.asOf);
  if (Number.isNaN(sinceMs) || Number.isNaN(untilMs) || Number.isNaN(asOfMs) || sinceMs >= untilMs) {
    throw new Error(`invalid export window: since=${window.since} until=${window.until}`);
  }
  if (untilMs > asOfMs) {
    throw new Error(`--until (${window.until}) must not be after the export as-of time (${window.asOf})`);
  }

  const notes: string[] = [];
  const runsByWorkflow = new Map<DeploymentWorkflow, RawRun[]>();

  for (const workflow of DEPLOYMENT_WORKFLOWS) {
    const before = await fetcher.listRuns(workflow, { beforeIso: window.since });
    const createdInWindow = await fetcher.listRuns(workflow, { sinceIso: window.since, beforeIso: window.until });
    const byId = new Map<number, RawRun>();
    for (const run of [...before, ...createdInWindow]) byId.set(run.id, run);

    const production: RawRun[] = [];
    for (const run of [...byId.values()].sort(byCompletedAsc)) {
      if (workflow === "deploy-website.yml" && run.conclusion === "success" && run.event !== "push") {
        notes.push(
          `workflow run gha:${workflow}:${run.id} is a manual dispatch; the runs API exposes no target input, so production is not assumed`,
        );
        continue;
      }
      if (isProductionRun(workflow, run)) production.push(run);
    }
    runsByWorkflow.set(workflow, production);
  }

  const pulls = (await fetcher.listClosedPulls())
    .filter((pull) => pull.mergedAt !== null || pull.closedAt !== null)
    .sort((left, right) => left.number - right.number);

  const decidedInWindow = pulls.filter((pull) => {
    const at = Date.parse(pull.mergedAt ?? pull.closedAt!);
    return at >= sinceMs && at < untilMs;
  });

  const observations = await mapWithConcurrency(decidedInWindow, 6, (pull) => observePull(fetcher, pull));
  const events: DeliveryEvent[] = observations.flatMap((entry) => entry.events);
  const coverage: DeliveryCoverage[] = observations.flatMap((entry) => entry.coverage);

  const ancestry = new Map<string, boolean>();
  const isAncestor = async (ancestorSha: string, descendantSha: string): Promise<boolean> => {
    const key = `${ancestorSha}|${descendantSha}`;
    const cached = ancestry.get(key);
    if (cached !== undefined) return cached;
    const result = await fetcher.isAncestor(ancestorSha, descendantSha);
    ancestry.set(key, result);
    return result;
  };

  const merged = pulls.filter((pull) => pull.mergedAt !== null && pull.mergeCommitSha !== null);
  const deploymentCoverage = new Map<string, DeliveryCoverage>();

  for (const workflow of DEPLOYMENT_WORKFLOWS) {
    const production = runsByWorkflow.get(workflow) ?? [];
    for (let index = 0; index < production.length; index += 1) {
      const run = production[index];
      const completedAt = Date.parse(run.completedAt);
      if (completedAt < sinceMs || completedAt >= untilMs) continue;
      const previous = index > 0 ? production[index - 1] : undefined;

      const linked: RawPull[] = [];
      for (const pull of merged) {
        // A merge commit ancestor of the tagged commit was necessarily merged before
        // the tag was pushed; this only skips impossible ancestry checks.
        if (Date.parse(pull.mergedAt!) > Date.parse(run.createdAt)) continue;
        if (!(await isAncestor(pull.mergeCommitSha!, run.headSha))) continue;
        if (previous && (await isAncestor(pull.mergeCommitSha!, previous.headSha))) continue;
        linked.push(pull);
      }

      if (linked.length === 0) {
        notes.push(
          `deployment gha:${workflow}:${run.id} has no PR merged since ${previous ? `the previous production SHA ${previous.headSha}` : "repository history"}; not exported`,
        );
        continue;
      }
      const earliest = linked.reduce((first, pull) =>
        Date.parse(pull.createdAt) < Date.parse(first.createdAt) ? pull : first,
      );
      const deployedAt = run.completedAt;
      if (Date.parse(earliest.createdAt) > Date.parse(deployedAt)) {
        notes.push(`deployment gha:${workflow}:${run.id} first change postdates completion; not exported`);
        continue;
      }
      const changeId = `pr-${earliest.number}`;
      events.push({
        id: `gh:deploy:${workflow}:${run.id}`,
        kind: "deployment",
        change_id: changeId,
        revision: earliest.headSha,
        observed_at: deployedAt,
        source_ref: `github:actions/${workflow}#${run.id}`,
        deployment_id: `gha:${workflow}:${run.id}`,
        environment: "production",
        first_change_at: earliest.createdAt,
        deployed_at: deployedAt,
      });
      const key = `${changeId}|${earliest.headSha}`;
      const existing = deploymentCoverage.get(key);
      // Coverage is complete only across the interval whose deployment events were exported.
      const coverageFrom = new Date(Math.max(sinceMs, Date.parse(earliest.createdAt))).toISOString();
      const coverageThrough = new Date(Math.min(Date.parse(window.until), Date.parse(window.asOf))).toISOString();
      deploymentCoverage.set(key, {
        change_id: changeId,
        revisions: [earliest.headSha],
        from: existing && Date.parse(existing.from) < Date.parse(coverageFrom) ? existing.from : coverageFrom,
        through:
          existing && Date.parse(existing.through) > Date.parse(coverageThrough)
            ? existing.through
            : coverageThrough,
        kinds: ["deployment"],
        complete: true,
      });
    }
  }

  events.sort((left, right) =>
    Date.parse(left.observed_at) - Date.parse(right.observed_at) || left.id.localeCompare(right.id),
  );

  return {
    file: {
      schema_version: 1,
      source_kind: "host-export",
      coverage: [...coverage, ...deploymentCoverage.values()],
      events,
    },
    notes,
  };
}

// ---------------------------------------------------------------------------
// Validation and write
// ---------------------------------------------------------------------------

/**
 * Runs the assembled file through `delivery.ts`'s own validator by staging it
 * under a temporary root. Returns the rejection messages; empty means valid.
 */
export function validateExport(file: DeliveryObservationFile): string[] {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "metrics-github-export-"));
  try {
    const staged = path.join(root, DELIVERY_OBSERVATIONS_PATH);
    fs.mkdirSync(path.dirname(staged), { recursive: true });
    fs.writeFileSync(staged, `${JSON.stringify(file, null, 2)}\n`, "utf8");
    const { observations, issues } = readDeliveryObservations(root);
    if (observations) return [];
    return issues.length > 0 ? issues.map((issue) => issue.message) : ["delivery observations were rejected"];
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

/** Validates, then writes `<root>/artifacts/metrics/delivery-observations.json`. */
export function writeExport(root: string, file: DeliveryObservationFile): string[] {
  const problems = validateExport(file);
  if (problems.length > 0) return problems;
  const target = path.join(root, DELIVERY_OBSERVATIONS_PATH);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(file, null, 2)}\n`, "utf8");
  return [];
}

// ---------------------------------------------------------------------------
// CLI: `--since YYYY-MM-DD [--until YYYY-MM-DD]`
// ---------------------------------------------------------------------------

export interface CliOptions {
  since: string;
  sinceIso: string;
  untilIso: string;
  asOfIso: string;
}

function parseDay(value: string, flag: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))) {
    throw new Error(`${flag} must be YYYY-MM-DD, got: ${value}`);
  }
  return value;
}

/**
 * `--until` defaults to the as-of instant. A supplied `--until` is the end of that
 * day; it is rejected when it lies in the future, because coverage past the as-of
 * instant would be a claim the export cannot support.
 */
export function parseArgs(argv: readonly string[], asOf: Date = new Date()): CliOptions {
  let since: string | undefined;
  let until: string | undefined;
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const [flag, inline] = token.startsWith("--") ? token.split("=", 2) : [token, undefined];
    const readValue = (): string => {
      if (inline !== undefined) return inline;
      i += 1;
      if (i >= argv.length || argv[i].startsWith("--")) throw new Error(`${flag} requires a value`);
      return argv[i];
    };
    switch (flag) {
      case "--since":
        since = parseDay(readValue(), "--since");
        break;
      case "--until":
        until = parseDay(readValue(), "--until");
        break;
      default:
        throw new Error(`unknown argument: ${token}`);
    }
  }
  if (!since) throw new Error("--since YYYY-MM-DD is required");

  const asOfIso = asOf.toISOString();
  const sinceIso = `${since}T00:00:00.000Z`;
  const untilIso = until ? `${until}T23:59:59.999Z` : asOfIso;
  if (Date.parse(sinceIso) >= Date.parse(untilIso)) throw new Error("--since must be before the export end");
  if (Date.parse(untilIso) > Date.parse(asOfIso)) {
    throw new Error(`--until (${untilIso}) must not be after the export as-of time (${asOfIso})`);
  }
  return { since, sinceIso, untilIso, asOfIso };
}

interface MainDeps {
  fetcher?: GitHubFetcher;
  resolveRepo?: typeof resolveRepo;
  runGh?: GhRunner;
  cwd?: string;
  now?: Date;
}

export async function main(argv: readonly string[], deps: Partial<MainDeps> = {}): Promise<number> {
  const cwd = deps.cwd ?? process.cwd();
  try {
    const asOf = deps.now ?? new Date();
    const options = parseArgs(argv, asOf);
    let fetcher = deps.fetcher;
    if (!fetcher) {
      const ghRun = deps.runGh ?? runGh;
      const resolved = (deps.resolveRepo ?? resolveRepo)(ghRun, cwd);
      if (!resolved.available) throw new Error(`cannot resolve repository: ${resolved.reason}`);
      fetcher = createGhFetcher(resolved.value, ghRun, cwd);
    }

    const { file, notes } = await buildExport(fetcher, {
      since: options.sinceIso,
      until: options.untilIso,
      asOf: options.asOfIso,
    });
    const problems = writeExport(cwd, file);
    if (problems.length > 0) {
      process.stderr.write(`github-export: delivery validation failed; nothing written\n`);
      for (const problem of problems) process.stderr.write(`  - ${problem}\n`);
      return 1;
    }
    for (const note of notes) process.stderr.write(`github-export: ${note}\n`);
    const counts = (kind: string): number => file.events.filter((event) => event.kind === kind).length;
    process.stderr.write(
      `github-export: wrote ${DELIVERY_OBSERVATIONS_PATH} for ${options.since}..${options.untilIso} ` +
        `(as of ${options.asOfIso}) — ${counts("submission")} submission(s), ${counts("correction")} correction(s), ` +
        `${counts("acceptance")} acceptance(s), ${counts("deployment")} deployment(s), ` +
        `${file.coverage.length} coverage interval(s); review/decision-wait/defect/cost not exported\n`,
    );
    return 0;
  } catch (error) {
    process.stderr.write(`github-export: ${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

/* istanbul ignore next -- CLI entry point; the exported functions above are the test surface. */
if (typeof require !== "undefined" && require.main === module) {
  void main(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
