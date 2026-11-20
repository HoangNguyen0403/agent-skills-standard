/**
 * Recompute the SNC tier (Spread / Novelty / Centrality) from the real diff so a
 * self-declared tier cannot silently skip the approval gate that belongs to the change.
 *
 * Usage: tsx scripts/snc-from-diff.ts [--base <ref>] [--declared <low|medium|high>]
 * Exit 1 when the computed tier is higher than `--declared`.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

export type Status = "A" | "M" | "D" | "R";
export type Tier = "low" | "medium" | "high";

export interface FileChange {
  path: string;
  status: Status;
  added: number;
  deleted: number;
}

export interface SncScore {
  s: number;
  n: number;
  c: number;
  total: number;
  tier: Tier;
}

export interface SncOptions {
  /** Globs treated as sensitive / central (C=2). */
  protectedPaths?: string[];
  /** Globs treated as shared but non-core (C=1). */
  sharedPaths?: string[];
}

export const DEFAULT_PROTECTED_PATHS = [
  "**/auth/**",
  "**/payment*/**",
  "**/migrations/**",
  "**/*.sql",
  "**/security/**",
  "**/schema/**",
  "**/schemas/**",
  "**/contract/**",
  "**/contracts/**",
  "**/*.schema.*",
  "**/*.graphql",
];

export const DEFAULT_SHARED_PATHS = [
  "**/common/**",
  "**/shared/**",
  "**/core/**",
  "**/lib/**",
  "**/utils/**",
];

const TIER_RANK: Record<Tier, number> = { low: 0, medium: 1, high: 2 };

const CONTAINER_DIRS: Record<string, true> = {
  apps: true,
  crates: true,
  libs: true,
  modules: true,
  packages: true,
  services: true,
  skills: true,
};

/** First path segment; container dirs contribute their child so cross-service/cross-skill counts as cross-module. */
export function moduleOf(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/").replace(/^\.\//, "");
  const parts = normalized.split("/");
  if (parts.length > 2 && CONTAINER_DIRS[parts[0]]) return `${parts[0]}/${parts[1]}`;
  return parts[0];
}

/** Minimal glob -> RegExp: `**`, `*`, `?` and literal characters only. */
export function globToRegExp(glob: string): RegExp {
  let out = "";
  for (let i = 0; i < glob.length; i += 1) {
    const char = glob[i];
    if (char === "*") {
      if (glob[i + 1] === "*") {
        i += 1;
        if (glob[i + 1] === "/") {
          i += 1;
          out += "(?:.*/)?";
        } else {
          out += ".*";
        }
      } else {
        out += "[^/]*";
      }
    } else if (char === "?") {
      out += "[^/]";
    } else {
      out += char.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp(`^${out}$`);
}

export function matchesAny(filePath: string, globs: readonly string[]): boolean {
  const normalized = filePath.replace(/\\/g, "/").replace(/^\.\//, "");
  return globs.some((glob) => globToRegExp(glob).test(normalized));
}

function spread(files: readonly FileChange[]): number {
  if (files.length <= 1) return 0;
  const modules = new Set(files.map((file) => moduleOf(file.path)));
  return modules.size <= 1 ? 1 : 2;
}

function novelty(files: readonly FileChange[]): number {
  if (files.length === 0) return 0;
  if (files.some((file) => file.status === "A")) return 2;
  const added = files.reduce((sum, file) => sum + file.added, 0);
  const deleted = files.reduce((sum, file) => sum + file.deleted, 0);
  const changed = added + deleted;
  if (changed === 0 || added === 0) return 0;
  if (added / changed > 0.6) return 2;
  // A few added lines next to few deletions is a small edit, not modified logic.
  if (changed <= 4 && added <= 2) return 0;
  return 1;
}

function centrality(files: readonly FileChange[], options: SncOptions): number {
  const protectedPaths = options.protectedPaths ?? DEFAULT_PROTECTED_PATHS;
  const sharedPaths = options.sharedPaths ?? DEFAULT_SHARED_PATHS;
  const paths = files.map((file) => file.path);
  if (paths.some((filePath) => matchesAny(filePath, protectedPaths))) return 2;
  return paths.some((filePath) => matchesAny(filePath, sharedPaths)) ? 1 : 0;
}

/** Rubric floors: C=2 is at least medium; C=2 with spread or novelty is high. */
export function tierFor(s: number, n: number, c: number, total: number): Tier {
  if (c === 2 && (s >= 1 || n >= 1)) return "high";
  if (total >= 5) return "high";
  if (c === 2 || total >= 3) return "medium";
  return "low";
}

export function computeSnc(files: readonly FileChange[], options: SncOptions = {}): SncScore {
  const s = spread(files);
  const n = novelty(files);
  const c = centrality(files, options);
  const total = s + n + c;
  return { s, n, c, total, tier: tierFor(s, n, c, total) };
}

export function formatSnc(score: SncScore): string {
  return `SNC: S=${score.s} N=${score.n} C=${score.c} total=${score.total} tier=${score.tier}`;
}

export function exceedsDeclared(computed: Tier, declared: Tier): boolean {
  return TIER_RANK[computed] > TIER_RANK[declared];
}

function runGit(args: readonly string[]): string {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
}

export function resolveBase(explicit?: string): string {
  if (explicit) return explicit;
  try {
    return runGit(["merge-base", "HEAD", "main"]).trim();
  } catch {
    throw new Error("Cannot compute merge-base with main; pass --base <ref>.");
  }
}

/** Parse `git diff --name-status -z` output; records are NUL-separated status/path pairs. */
export function parseNameStatusZ(output: string): Map<string, Status> {
  const tokens = output.split("\0");
  const statuses = new Map<string, Status>();
  for (let i = 0; i < tokens.length; i += 1) {
    const code = tokens[i];
    if (!code) continue;
    const kind = code[0];
    const firstPath = tokens[i + 1];
    if (firstPath === undefined) break;
    if (kind === "R" || kind === "C") {
      const newPath = tokens[i + 2];
      if (newPath === undefined) break;
      statuses.set(newPath, "R");
      i += 2;
    } else {
      if (kind === "A" || kind === "D" || kind === "M") statuses.set(firstPath, kind);
      i += 1;
    }
  }
  return statuses;
}

/** Parse `git diff --numstat -z` output; records are `added\tdeleted\tpath\0`. */
export function parseNumStatZ(output: string, statuses: Map<string, Status>): FileChange[] {
  const changes: FileChange[] = [];
  for (const record of output.split("\0")) {
    if (!record) continue;
    const firstTab = record.indexOf("\t");
    const secondTab = record.indexOf("\t", firstTab + 1);
    if (firstTab === -1 || secondTab === -1) continue;
    const target = record.slice(secondTab + 1);
    if (!target) continue;
    const added = Number.parseInt(record.slice(0, firstTab), 10);
    const deleted = Number.parseInt(record.slice(firstTab + 1, secondTab), 10);
    changes.push({
      path: target,
      status: statuses.get(target) ?? "M",
      added: Number.isNaN(added) ? 0 : added,
      deleted: Number.isNaN(deleted) ? 0 : deleted,
    });
  }
  return changes;
}

export type LineCounter = (filePath: string) => number;

/** Untracked files are new work the diff cannot see; score them as added. */
export function withUntracked(
  changes: readonly FileChange[],
  untrackedPaths: readonly string[],
  countLines: LineCounter,
): FileChange[] {
  const known = new Set(changes.map((change) => change.path));
  const added = untrackedPaths
    .filter((filePath) => filePath.length > 0 && !known.has(filePath))
    .map((filePath) => ({
      path: filePath,
      status: "A" as const,
      added: countLines(filePath),
      deleted: 0,
    }));
  return [...changes, ...added];
}

export function countFileLines(filePath: string): number {
  const text = readFileSync(filePath, "utf8");
  if (text.length === 0) return 0;
  return text.endsWith("\n") ? text.split("\n").length - 1 : text.split("\n").length;
}

export function readProtectedPaths(repoRoot = process.cwd()): string[] | undefined {
  const rcPath = path.join(repoRoot, ".skillsrc");
  if (!existsSync(rcPath)) return undefined;
  const parsed = yaml.load(readFileSync(rcPath, "utf8")) as { snc_protected_paths?: unknown } | null;
  const configured = parsed?.snc_protected_paths;
  if (!Array.isArray(configured)) return undefined;
  return configured.filter((item): item is string => typeof item === "string");
}

export function collectChanges(base: string): FileChange[] {
  const statuses = parseNameStatusZ(
    runGit(["diff", "--name-status", "--no-renames", "-z", base]),
  );
  const changes = parseNumStatZ(
    runGit(["diff", "--numstat", "--no-renames", "-z", base]),
    statuses,
  );
  const untracked = runGit(["ls-files", "--others", "--exclude-standard", "-z"])
    .split("\0")
    .filter((filePath) => filePath.length > 0);
  return withUntracked(changes, untracked, countFileLines);
}

const TIERS: readonly Tier[] = ["low", "medium", "high"];
const USAGE = "Usage: snc-from-diff [--base <ref>] [--declared <low|medium|high>]";

export function isTier(value: string | undefined): value is Tier {
  return value !== undefined && TIERS.some((tier) => tier === value);
}

export function run(argv: readonly string[]): number {
  let base: string | undefined;
  let declared: Tier | undefined;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg !== "--base" && arg !== "--declared") {
      console.error(`Unknown argument: ${arg}\n${USAGE}`);
      return 2;
    }
    const value = argv[++i];
    if (value === undefined) {
      console.error(`Missing value for ${arg}\n${USAGE}`);
      return 2;
    }
    if (arg === "--base") {
      base = value;
    } else if (isTier(value)) {
      declared = value;
    } else {
      console.error(`Invalid --declared tier: ${value} (expected low|medium|high)\n${USAGE}`);
      return 2;
    }
  }

  const score = computeSnc(collectChanges(resolveBase(base)), {
    protectedPaths: readProtectedPaths(),
  });
  console.log(formatSnc(score));

  if (declared && exceedsDeclared(score.tier, declared)) {
    console.error(
      `Computed tier ${score.tier} exceeds declared ${declared}; apply the ${score.tier}-tier approval/review gates.`,
    );
    return 1;
  }
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  process.exitCode = run(process.argv.slice(2));
}
