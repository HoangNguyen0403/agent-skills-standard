// scripts/metrics/pr-baseline.ts
//
// REQ-AFC-01 / AC-AFC-01, AC-AFC-02: reproducible baseline of merged PRs. Raw
// line counts from the GitHub API include generated export mirrors, so every
// changed file is classified against one declared glob list and only authored
// changed lines feed the size medians. Size is additions + deletions, matching
// `git diff --numstat` (SRS-AFC-02). A PR whose file or review data cannot be
// fetched is reported `unavailable` (never zero) and excluded from the affected
// medians; malformed input is a hard error with a non-zero exit.
//
// Data access goes through `PrFetcher`, so tests never touch the network.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/**
 * Paths the generator/export pipeline owns end-to-end. A diff touching these is
 * mirror churn, not authored work. Files the pipeline only appends to or
 * merges keys into (`CLAUDE.md`, `.claude/settings.json`, `*.hooks.json`,
 * `.codex/config.toml`) keep hand-authored content and are classified authored.
 *
 * Sources (verified, not guessed):
 * - `cli/src/capabilities/agentCapabilities.ts` — fully-owned exports: Claude
 *   (`.claude/skills`, `.claude/commands`, `.claude/agents`, `.claude/hooks`),
 *   Copilot (`.github/skills`, `.github/instructions`, `.github/prompts`,
 *   `.github/agents`, `.github/hooks`), Antigravity (`.agents/skills`,
 *   `.agents/rules`), Codex (`.codex/skills`, `.codex/rules`, `.codex/agents`,
 *   `.codex/hooks`). `.skillsrc` enables copilot, antigravity, codex, claude.
 * - Mixed files stay authored: `CLAUDE.md` (AgentBridgeService.ts:132-147
 *   appends only when `## Agent Protocol` is absent), hook configs
 *   (`HookService.ts:503-539,575-594` merges existing JSON), `.codex/config.toml`
 *   (McpConfigService merges), `AGENTS.md` (block injection only).
 * - `scripts/generate-indices.ts` — `skills/index.json`, `skills/metadata.json`,
 *   `skills/README.md`, `skills/<category>/_INDEX.md`.
 * - `CONTRIBUTING.md:103` — `.agents/workflows/**` is canonical authored source,
 *   not a mirror, so it is deliberately absent here.
 * - `artifacts/**` — `.gitignore:17` calls `/artifacts/` "session-local run
 *   evidence ... regenerated on demand"; `CONTRIBUTING.md:476` requires evidence
 *   archived under `artifacts/<slug>/evidence/`. Machine receipts, not authored code.
 * - `benchmarks/history.json`, `benchmarks/evals/history.json`,
 *   `benchmark-report.md`, `evals-report.md` — written by `scripts/benchmark`
 *   (`constants.ts`, `gate.ts`) and `scripts/evals` (`constants.ts`, `index.ts`).
 * - Lockfiles: dependency resolution output, never hand-authored.
 */
export const GENERATED_PATH_GLOBS = [
  ".claude/skills/**",
  ".claude/commands/**",
  ".claude/agents/**",
  ".claude/hooks/**",
  ".github/skills/**",
  ".github/instructions/**",
  ".github/prompts/**",
  ".github/agents/**",
  ".github/hooks/**",
  ".agents/skills/**",
  ".agents/rules/**",
  ".codex/skills/**",
  ".codex/rules/**",
  ".codex/agents/**",
  ".codex/hooks/**",
  "skills/index.json",
  "skills/metadata.json",
  "skills/README.md",
  "skills/*/_INDEX.md",
  "artifacts/**",
  "benchmarks/history.json",
  "benchmarks/evals/history.json",
  "benchmark-report.md",
  "evals-report.md",
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
  "bun.lockb",
  ".skills-lock.json",
] as const;

const GENERATED_MATCHERS: readonly RegExp[] = GENERATED_PATH_GLOBS.map(globToRegExp);

const UNAVAILABLE = "unavailable" as const;

export type Unavailable = typeof UNAVAILABLE;

/** Element of a PR's changed-file page. Size is additions + deletions (`git diff --numstat`). */
export interface RawPullFile {
  filename: string;
  additions: number;
  deletions: number;
}

export interface RawPullRequest {
  number: number;
  createdAt: string;
  mergedAt: string;
}

export type FetchResult<T> = { available: true; value: T } | { available: false; reason: string };

export interface ListMergedOptions {
  limit: number;
  since?: string;
}

/**
 * Injectable GitHub boundary. Implementations must translate transport failures
 * into `{ available: false }`; they must throw only when a successful response
 * is malformed, because malformed input is the one case that exits non-zero.
 */
export interface PrFetcher {
  listMergedPullRequests(repo: string, options: ListMergedOptions): Promise<FetchResult<RawPullRequest[]>>;
  pullFiles(repo: string, number: number): Promise<FetchResult<RawPullFile[]>>;
  pullReviewCount(repo: string, number: number): Promise<FetchResult<number>>;
}

export interface BaselinePr {
  number: number;
  mergedAt: string;
  authoredLines: number | Unavailable;
  generatedLines: number | Unavailable;
  reviewCount: number | Unavailable;
  hoursToMerge: number;
}

export interface BaselineSummary {
  count: number;
  excludedFromMedians: number;
  authoredLines: {
    median: number | null;
    p75: number | null;
    p90: number | null;
    total: number | null;
    sampleSize: number;
  };
  generatedLines: { median: number | null; total: number | null; sampleSize: number };
  hoursToMerge: { median: number | null; p75: number | null; sampleSize: number };
  zeroReviewCount: number | null;
  mergedUnder2h: number;
}

export interface BaselineWindow {
  mode: "limit" | "since";
  limit: number;
  since?: string;
}

export interface Baseline {
  schemaVersion: 1;
  repo: string | null;
  window: BaselineWindow;
  generatedPathGlobs: readonly string[];
  listUnavailable: string | null;
  prs: BaselinePr[];
  summary: BaselineSummary;
}

export interface CliOptions {
  repo?: string;
  limit: number;
  since?: string;
  out: string;
}

// ---------------------------------------------------------------------------
// Glob classification
// ---------------------------------------------------------------------------

/** Converts the small glob dialect used above (`*`, `**`, `?`) into a path regex. */
export function globToRegExp(glob: string): RegExp {
  let source = "";
  for (let i = 0; i < glob.length; i += 1) {
    const char = glob[i];
    if (char === "*") {
      if (glob[i + 1] === "*") {
        source += ".*";
        i += 1;
      } else {
        source += "[^/]*";
      }
      continue;
    }
    if (char === "?") {
      source += "[^/]";
      continue;
    }
    source += char.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${source}$`);
}

export function isGeneratedPath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/").replace(/^\.\//, "");
  return GENERATED_MATCHERS.some((matcher) => matcher.test(normalized));
}

/** Classifies one changed file; generated mirrors never count as authored work. */
export function classifyPath(filePath: string): "authored" | "generated" {
  return isGeneratedPath(filePath) ? "generated" : "authored";
}

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Percentile with linear interpolation between closest ranks (Excel
 * PERCENTILE.INC / R-7). Empty input yields `null`, never zero.
 */
export function percentile(values: readonly number[], p: number): number | null {
  if (values.length === 0) return null;
  if (!(p >= 0 && p <= 100)) throw new Error(`percentile out of range: ${p}`);
  const sorted = [...values].sort((left, right) => left - right);
  const rank = (sorted.length - 1) * (p / 100);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  const value =
    lower === upper ? sorted[lower] : sorted[lower] + (sorted[upper] - sorted[lower]) * (rank - lower);
  return round2(value);
}

function hoursBetween(createdAt: string, mergedAt: string): number {
  return round2((Date.parse(mergedAt) - Date.parse(createdAt)) / 3_600_000);
}

function summarize(prs: readonly BaselinePr[], collectionAvailable = true): BaselineSummary {
  const authored = prs
    .map((pr) => pr.authoredLines)
    .filter((value): value is number => typeof value === "number");
  const generated = prs
    .map((pr) => pr.generatedLines)
    .filter((value): value is number => typeof value === "number");
  const reviews = prs
    .map((pr) => pr.reviewCount)
    .filter((value): value is number => typeof value === "number");
  const hours = prs.map((pr) => pr.hoursToMerge);
  return {
    count: prs.length,
    excludedFromMedians: prs.length - authored.length,
    authoredLines: {
      median: percentile(authored, 50),
      p75: percentile(authored, 75),
      p90: percentile(authored, 90),
      total: authored.length > 0 || (prs.length === 0 && collectionAvailable)
        ? authored.reduce((sum, value) => sum + value, 0)
        : null,
      sampleSize: authored.length,
    },
    generatedLines: {
      median: percentile(generated, 50),
      total: generated.length > 0 || (prs.length === 0 && collectionAvailable)
        ? generated.reduce((sum, value) => sum + value, 0)
        : null,
      sampleSize: generated.length,
    },
    hoursToMerge: { median: percentile(hours, 50), p75: percentile(hours, 75), sampleSize: hours.length },
    zeroReviewCount: reviews.length === 0 ? null : reviews.filter((count) => count === 0).length,
    mergedUnder2h: prs.filter((pr) => pr.hoursToMerge < 2).length,
  };
}

// ---------------------------------------------------------------------------
// Baseline build
// ---------------------------------------------------------------------------

/** One empty baseline whose only datum is why the data could not be read. */
function unavailableBaseline(window: BaselineWindow, reason: string, repo: string | null = null): Baseline {
  return {
    schemaVersion: 1,
    repo,
    window,
    generatedPathGlobs: GENERATED_PATH_GLOBS,
    listUnavailable: reason,
    prs: [],
    summary: summarize([], false),
  };
}

/**
 * Fetches per-PR file and review data and derives one baseline row per merged
 * PR. Transport failure on a field marks that field `unavailable`; a malformed
 * payload from the fetcher throws.
 */
export async function buildBaseline(
  repo: string,
  window: BaselineWindow,
  fetcher: PrFetcher,
  concurrency = 6,
): Promise<Baseline> {
  const listed = await fetcher.listMergedPullRequests(repo, { limit: window.limit, since: window.since });
  if (!listed.available) return unavailableBaseline(window, listed.reason, repo);

  const prs = await mapWithConcurrency(listed.value.map(validatePullRequest), concurrency, async (raw) => {
    const [files, reviews] = await Promise.all([
      fetcher.pullFiles(repo, raw.number),
      fetcher.pullReviewCount(repo, raw.number),
    ]);
    let authoredLines: number | Unavailable = UNAVAILABLE;
    let generatedLines: number | Unavailable = UNAVAILABLE;
    if (files.available) {
      let authored = 0;
      let generated = 0;
      files.value.forEach((entry, index) => {
        const file = validatePullFile(entry, index);
        const changed = file.additions + file.deletions;
        if (classifyPath(file.filename) === "generated") generated += changed;
        else authored += changed;
      });
      authoredLines = authored;
      generatedLines = generated;
    }
    return {
      number: raw.number,
      mergedAt: raw.mergedAt,
      authoredLines,
      generatedLines,
      reviewCount: reviews.available ? validateReviewCount(reviews.value) : UNAVAILABLE,
      hoursToMerge: hoursBetween(raw.createdAt, raw.mergedAt),
    } satisfies BaselinePr;
  });

  return {
    schemaVersion: 1,
    repo,
    window,
    generatedPathGlobs: GENERATED_PATH_GLOBS,
    listUnavailable: null,
    prs,
    summary: summarize(prs),
  };
}

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const lanes = Array.from({ length: Math.min(Math.max(limit, 1), items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index]);
    }
  });
  await Promise.all(lanes);
  return results;
}

// ---------------------------------------------------------------------------
// `gh` fetcher
// ---------------------------------------------------------------------------

function ghErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const stderr = (error as { stderr?: unknown }).stderr;
    if (typeof stderr === "string" && stderr.trim()) return firstLine(stderr);
    if (stderr instanceof Uint8Array) {
      const text = Buffer.from(stderr).toString("utf8").trim();
      if (text) return firstLine(text);
    }
  }
  return error instanceof Error ? firstLine(error.message) : String(error);
}

function firstLine(text: string): string {
  return text.split("\n").map((line) => line.trim()).filter(Boolean)[0]?.slice(0, 200) ?? "unknown error";
}

export type GhRunner = (args: string[]) => string;

export const runGh: GhRunner = (args) =>
  execFileSync("gh", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
  });

function attemptGh(run: GhRunner, args: string[]): FetchResult<string> {
  try {
    return { available: true, value: run(args) };
  } catch (error) {
    return { available: false, reason: ghErrorMessage(error) };
  }
}

/** Boundary validation shared by the `gh` parser and any injected fetcher. */
export function validatePullRequest(entry: unknown, index: number): RawPullRequest {
  if (typeof entry !== "object" || entry === null) throw new Error(`malformed PR entry at index ${index}`);
  if (!("number" in entry) || typeof entry.number !== "number" || !Number.isInteger(entry.number) || entry.number <= 0) {
    throw new Error(`malformed PR entry at index ${index}: number`);
  }
  const { number } = entry;
  if (!("createdAt" in entry) || typeof entry.createdAt !== "string" || !Number.isFinite(Date.parse(entry.createdAt))) {
    throw new Error(`malformed PR entry #${number}: createdAt`);
  }
  if (!("mergedAt" in entry) || typeof entry.mergedAt !== "string" || !Number.isFinite(Date.parse(entry.mergedAt))) {
    throw new Error(`malformed PR entry #${number}: mergedAt`);
  }
  const { createdAt, mergedAt } = entry;
  if (Date.parse(mergedAt) < Date.parse(createdAt)) {
    throw new Error(`malformed PR entry #${number}: mergedAt precedes createdAt`);
  }
  return { number, createdAt, mergedAt };
}

export function validatePullFile(entry: unknown, index: number): RawPullFile {
  if (typeof entry !== "object" || entry === null) throw new Error(`malformed PR file at index ${index}`);
  if (!("filename" in entry) || typeof entry.filename !== "string" || !entry.filename.trim()) {
    throw new Error(`malformed PR file at index ${index}: filename`);
  }
  const { filename } = entry;
  if (
    !("additions" in entry) ||
    typeof entry.additions !== "number" ||
    !Number.isInteger(entry.additions) ||
    entry.additions < 0
  ) {
    throw new Error(`malformed PR file (${filename}): additions`);
  }
  if (
    !("deletions" in entry) ||
    typeof entry.deletions !== "number" ||
    !Number.isInteger(entry.deletions) ||
    entry.deletions < 0
  ) {
    throw new Error(`malformed PR file (${filename}): deletions`);
  }
  return { filename, additions: entry.additions, deletions: entry.deletions };
}

export function validateReviewCount(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error("malformed PR review count");
  }
  return value;
}

export function parsePullList(output: string): RawPullRequest[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(output.trim() || "[]");
  } catch {
    throw new Error("malformed gh pr list output: not JSON");
  }
  if (!Array.isArray(parsed)) throw new Error("malformed gh pr list output: expected an array");
  return parsed.map(validatePullRequest);
}

export function parseFilesTsv(output: string): RawPullFile[] {
  const lines = output.split("\n").filter((line) => line.trim().length > 0);
  return lines.map((line) => {
    const columns = line.split("\t");
    if (columns.length !== 3) throw new Error(`malformed PR file row: ${line.slice(0, 120)}`);
    const filename = columns[0].trim();
    if (!filename) throw new Error("malformed PR file row: empty filename");
    const [additions, deletions] = [Number(columns[1]), Number(columns[2])];
    for (const [field, value] of [
      ["additions", additions],
      ["deletions", deletions],
    ] as const) {
      if (!Number.isInteger(value) || value < 0) {
        throw new Error(`malformed PR file row (${filename}): ${field}`);
      }
    }
    return { filename, additions, deletions };
  });
}

export function parseReviewCount(output: string): number {
  const states = output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  for (const state of states) {
    if (!/^[A-Z_]+$/.test(state)) throw new Error(`malformed PR review state: ${state.slice(0, 40)}`);
  }
  return states.length;
}

export function createGhFetcher(run: GhRunner = runGh): PrFetcher {
  return {
    async listMergedPullRequests(repo, options) {
      const args = [
        "pr",
        "list",
        "--repo",
        repo,
        "--state",
        "merged",
        "--limit",
        String(options.limit),
        "--json",
        "number,createdAt,mergedAt",
      ];
      if (options.since) args.push("--search", `merged:>=${options.since}`);
      const result = attemptGh(run, args);
      return result.available ? { available: true, value: parsePullList(result.value) } : result;
    },
    async pullFiles(repo, number) {
      const result = attemptGh(run, [
        "api",
        "--paginate",
        "--jq",
        ".[] | [.filename, .additions, .deletions] | @tsv",
        `repos/${repo}/pulls/${number}/files`,
      ]);
      return result.available ? { available: true, value: parseFilesTsv(result.value) } : result;
    },
    async pullReviewCount(repo, number) {
      const result = attemptGh(run, [
        "api",
        "--paginate",
        "--jq",
        ".[] | .state",
        `repos/${repo}/pulls/${number}/reviews`,
      ]);
      return result.available ? { available: true, value: parseReviewCount(result.value) } : result;
    },
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const DEFAULT_OUT = "artifacts/agent-factory-controls/baseline.json";
const DEFAULT_LIMIT = 100;
const DEFAULT_SINCE_LIMIT = 1000;

export function parseArgs(argv: readonly string[]): CliOptions {
  const options: CliOptions = { limit: DEFAULT_LIMIT, out: DEFAULT_OUT };
  let limitGiven = false;
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
      case "--repo": {
        const value = readValue();
        if (!/^[^/\s]+\/[^/\s]+$/.test(value)) throw new Error(`--repo must be owner/name, got: ${value}`);
        options.repo = value;
        break;
      }
      case "--limit": {
        const value = Number(readValue());
        if (!Number.isInteger(value) || value <= 0) throw new Error("--limit must be a positive integer");
        options.limit = value;
        limitGiven = true;
        break;
      }
      case "--since": {
        const value = readValue();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
          throw new Error(`--since must be YYYY-MM-DD, got: ${value}`);
        }
        options.since = value;
        break;
      }
      case "--out": {
        options.out = readValue();
        break;
      }
      default:
        throw new Error(`unknown argument: ${token}`);
    }
  }
  if (options.since && !limitGiven) options.limit = DEFAULT_SINCE_LIMIT;
  return options;
}

/** Parses `owner/name` only from supported GitHub HTTPS, SSH, and scp remotes. */
export function parseRepoRemote(url: string): string | undefined {
  const owner = "[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?";
  const repo = "[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?";
  const suffix = `(${owner})/(${repo})(?:\\.git)?`;
  const patterns = [
    new RegExp(`^https://github\\.com/${suffix}$`, "i"),
    new RegExp(`^ssh://git@github\\.com/${suffix}$`, "i"),
    new RegExp(`^git@github\\.com:${suffix}$`, "i"),
  ];
  for (const pattern of patterns) {
    const match = url.trim().match(pattern);
    if (match) return `${match[1]}/${match[2].replace(/\.git$/i, "")}`;
  }
  return undefined;
}

/**
 * Resolves the target repository without failing the run on transport errors:
 * local `git remote get-url origin` first (works offline), then `gh repo view`.
 * Only malformed `gh` output throws; auth/network failure is `unavailable`.
 */
export function resolveRepo(run: GhRunner = runGh, cwd: string = process.cwd()): FetchResult<string> {
  try {
    const remote = execFileSync("git", ["remote", "get-url", "origin"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    const local = parseRepoRemote(remote);
    if (local) return { available: true, value: local };
  } catch {
    // No git checkout or no origin; fall through to gh.
  }
  const result = attemptGh(run, ["repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"]);
  if (!result.available) return result;
  const repo = result.value.trim();
  if (!/^[^/\s]+\/[^/\s]+$/.test(repo)) throw new Error(`malformed gh repo view output: ${repo || "(empty)"}`);
  return { available: true, value: repo };
}

interface MainDeps {
  fetcher: PrFetcher;
  runGh: GhRunner;
  resolveRepo: (run: GhRunner, cwd: string) => FetchResult<string>;
  cwd: string;
  writeOut: (target: string, contents: string) => void;
}

function defaultWriteOut(target: string, contents: string): void {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents, "utf8");
}

export async function main(argv: readonly string[], deps: Partial<MainDeps> = {}): Promise<number> {
  try {
    const options = parseArgs(argv);
    const ghRun = deps.runGh ?? runGh;
    const fetcher = deps.fetcher ?? createGhFetcher(ghRun);
    const window: BaselineWindow =
      options.since !== undefined
        ? { mode: "since", limit: options.limit, since: options.since }
        : { mode: "limit", limit: options.limit };
    const resolved = options.repo
      ? { available: true as const, value: options.repo }
      : (deps.resolveRepo ?? resolveRepo)(ghRun, deps.cwd ?? process.cwd());
    const baseline = resolved.available
      ? await buildBaseline(resolved.value, window, fetcher)
      : unavailableBaseline(window, resolved.reason);
    const json = `${JSON.stringify(baseline, null, 2)}\n`;
    if (options.out === "-") process.stdout.write(json);
    else (deps.writeOut ?? defaultWriteOut)(options.out, json);
    const { summary } = baseline;
    const show = (value: number | null): number | string => value ?? "n/a";
    process.stderr.write(
      `pr-baseline: ${summary.count} merged PRs (${summary.excludedFromMedians} excluded); ` +
        `authored median ${show(summary.authoredLines.median)} p75 ${show(summary.authoredLines.p75)} ` +
        `p90 ${show(summary.authoredLines.p90)} total ${summary.authoredLines.total}; ` +
        `generated median ${show(summary.generatedLines.median)} total ${summary.generatedLines.total}; ` +
        `hoursToMerge median ${show(summary.hoursToMerge.median)} p75 ${show(summary.hoursToMerge.p75)}\n`,
    );
    if (baseline.listUnavailable) process.stderr.write(`pr-baseline: unavailable: ${baseline.listUnavailable}\n`);
    return 0;
  } catch (error) {
    process.stderr.write(`pr-baseline: ${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

/* istanbul ignore next -- CLI entry point; the exported functions above are the test surface. */
if (typeof require !== "undefined" && require.main === module) {
  void main(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
