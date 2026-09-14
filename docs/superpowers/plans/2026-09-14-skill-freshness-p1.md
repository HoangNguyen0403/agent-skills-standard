# Skill Freshness P1 (schema + pins + offline audit) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add upstream version pins to the registry and an offline `freshness:audit` gate that flags stale reviews, version-claim mismatches, and missing pins, with a JSON + Markdown report.

**Architecture:** New `scripts/freshness/` module (tsx, `node:test`) mirroring `scripts/evals/quality.ts`: pure functions per file (`skills.ts` walk/parse, `pins.ts` merge, `versions.ts` compare, `claims.ts` scan, `audit.ts` rules, `report.ts` render) and a thin `index.ts` CLI. Pins live in `skills/metadata.json` per category (`upstream[]`) with optional per-skill `metadata.upstream[]` in SKILL.md frontmatter, validated by the CLI's zod schema. Network `check` action and cron are P2 (not in this plan).

**Tech Stack:** TypeScript via `tsx`, `fs-extra`, `js-yaml`, `node:test` + `node:assert/strict` for scripts; `zod` + `vitest` in `cli/`.

**Spec:** `docs/superpowers/specs/2026-09-13-skill-freshness-design.md`

## Global Constraints

- Node `>=20`; scripts run with `node --import tsx`, no typecheck (`tsconfig.json` excludes `scripts/`), so keep types simple and explicit.
- `audit` is write-free by default; `--write` opt-in. `report` always writes. Output dir `benchmarks/freshness/` is gitignored.
- Every exported symbol in `scripts/` and `cli/src/` gets a JSDoc comment (`pnpm docs:scan` warns otherwise).
- `metadata.upstream` in SKILL.md must not break: `TriggersRule`, `mcp/src/services/SkillParser.ts`, `generate-indices`, or Kiro transform. Schema uses `.passthrough()` on `metadata`.
- Do not import from `cli/` inside `scripts/freshness/` (workspace boundary). Import path constants from `scripts/evals/constants.ts`.
- Exit codes: `audit` exits 1 only with `--strict` and any `claim-*` or `missing-pin` issue. Non-strict never fails.
- Commit messages: Conventional Commits, end with the attribution lines given by the session (Co-Authored-By + Claude-Session).
- Work in worktree `/Users/nguyenhuyhoang/OtherProjects/agent-skills-standard-freshness`, branch `feat/skill-freshness`. Pre-commit hook runs `calculate-tokens` + `generate-indices` and auto-stages metadata/indices; expect that noise in commits.

---

## File Map

| Path | Responsibility |
|---|---|
| `scripts/freshness/types.ts` | Shared interfaces: `UpstreamEntry`, `SkillRecord`, `EffectivePin`, `VersionClaim`, `FreshnessIssue`, `FreshnessReport` |
| `scripts/freshness/skills.ts` | `parseFrontmatter()`, `walkSkills()` |
| `scripts/freshness/versions.ts` | `parseVersion()`, `compareVersions()`, `significantPart()` |
| `scripts/freshness/pins.ts` | `loadCategoryPins()`, `effectivePins()`, `VERSION_SENSITIVE_EXCLUDED` |
| `scripts/freshness/claims.ts` | `CLAIM_ALIASES`, `scanClaims()` |
| `scripts/freshness/audit.ts` | `auditFreshness()` producing issues from pins + claims + framework-map dates |
| `scripts/freshness/report.ts` | `buildReport()`, `renderMarkdown()` |
| `scripts/freshness/index.ts` | CLI: `audit`, `report`; flags `--write`, `--strict`, `--stale-days` |
| `scripts/freshness/*.test.ts` | One test file per module |
| `cli/src/schemas/skill-frontmatter.ts` | `upstreamEntrySchema`, `metadata.upstream` in `optionalSkillFieldsSchema` |
| `cli/src/schemas/__tests__/skill-frontmatter.spec.ts` | vitest for the schema |
| `cli/src/models/types.ts` | `UpstreamEntry` + `CategoryMetadata.upstream` typing |
| `skills/metadata.json` | `upstream[]` seed per category |
| 6 SKILL.md files | per-skill `metadata.upstream[]` |
| `package.json`, `.gitignore`, `.github/workflows/ci.yml` | wiring |
| `docs/FRESHNESS.md`, `CONTRIBUTING.md` | docs |

---

### Task 1: Types, frontmatter parser, skill walker

**Files:**
- Create: `scripts/freshness/types.ts`
- Create: `scripts/freshness/skills.ts`
- Test: `scripts/freshness/skills.test.ts`

**Interfaces:**
- Produces: `parseFrontmatter(content: string): { frontmatter: Record<string, unknown>; body: string } | null`
- Produces: `walkSkills(skillsDir: string): SkillRecord[]` where `SkillRecord = { category: string; name: string; dir: string; skillPath: string; frontmatter: Record<string, unknown>; body: string }`
- Produces: all interfaces in `types.ts` used by later tasks.

- [ ] **Step 1: Write `types.ts`**

```ts
// scripts/freshness/types.ts

/** One upstream dependency a category or skill tracks. */
export interface UpstreamEntry {
  /** Stable key, also the key into CLAIM_ALIASES (e.g. "next", "java"). */
  name: string;
  /** "github" fetches releases/tags (P2); "manual" only checks reviewed age. */
  source: "github" | "manual";
  /** "owner/repo"; required when source is "github". */
  repo?: string;
  /** Version the skill content was reviewed against, e.g. "15.3.0" or "21". */
  pinned: string;
  /** Regex with capture groups forming the version; used by P2 check. */
  tag_pattern?: string;
  /** YYYY-MM-DD of the last human review of this pin. */
  reviewed: string;
}

/** A skill on disk with parsed frontmatter. */
export interface SkillRecord {
  category: string;
  name: string;
  /** Absolute skill directory. */
  dir: string;
  /** Absolute path to SKILL.md. */
  skillPath: string;
  frontmatter: Record<string, unknown>;
  body: string;
}

/** An upstream entry resolved for a specific skill, with provenance. */
export interface EffectivePin extends UpstreamEntry {
  category: string;
  skillName: string;
  /** Where the pin was declared. */
  origin: "category" | "skill";
}

/** A version string found in a skill body or reference file. */
export interface VersionClaim {
  category: string;
  skillName: string;
  /** Matches an UpstreamEntry.name. */
  name: string;
  /** Raw captured version, e.g. "15", "3.27", "8.1". */
  version: string;
  /** True when the text had a trailing "+" (a floor, not a ceiling). */
  floor: boolean;
  /** Repo-relative file path. */
  file: string;
  line: number;
}

export type IssueType =
  | "upstream-major-drift"
  | "upstream-minor-drift"
  | "claim-behind-pin"
  | "claim-ahead-of-pin"
  | "reviewed-stale"
  | "reviewed-mismatch"
  | "missing-pin"
  | "fetch-failed";

export type Severity = "high" | "med" | "low" | "warn";

/** One finding of the freshness audit. */
export interface FreshnessIssue {
  type: IssueType;
  severity: Severity;
  category: string;
  /** Empty string for category-level issues. */
  skillName: string;
  /** Upstream name when applicable. */
  upstream?: string;
  message: string;
  /** Repo-relative file path when applicable. */
  file?: string;
  line?: number;
}

/** Latest-known upstream state (filled by P2 check; empty in P1). */
export interface UpstreamStatus {
  category: string;
  skillName: string;
  name: string;
  pinned: string;
  latest: string | null;
  publishedAt: string | null;
  releaseUrl: string | null;
}

/** Serialized to benchmarks/freshness/freshness-report.json. */
export interface FreshnessReport {
  generatedAt: string;
  action: "audit" | "check";
  staleDays: number;
  summary: {
    issueCount: number;
    bySeverity: Record<Severity, number>;
    byCategory: Record<string, number>;
  };
  issues: FreshnessIssue[];
  upstream: UpstreamStatus[];
}
```

- [ ] **Step 2: Write the failing test**

```ts
// scripts/freshness/skills.test.ts
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import fs from "fs-extra";
import { parseFrontmatter, walkSkills } from "./skills";

test("parseFrontmatter returns metadata object and body, CRLF tolerant", () => {
  const lf = "---\nname: a\nmetadata:\n  upstream:\n    - name: next\n      pinned: \"15.3.0\"\n---\nBody here\n";
  const crlf = lf.replace(/\n/g, "\r\n");
  for (const content of [lf, crlf]) {
    const parsed = parseFrontmatter(content);
    assert.ok(parsed);
    assert.equal(parsed.frontmatter.name, "a");
    const meta = parsed.frontmatter.metadata as { upstream: { name: string }[] };
    assert.equal(meta.upstream[0].name, "next");
    assert.match(parsed.body, /Body here/);
  }
});

test("parseFrontmatter returns null without frontmatter", () => {
  assert.equal(parseFrontmatter("# no frontmatter\n"), null);
});

test("walkSkills lists only dirs containing SKILL.md, skips dot dirs and references", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ags-fresh-"));
  const skills = path.join(root, "skills");
  await fs.ensureDir(path.join(skills, "nextjs", "nextjs-app-router"));
  await fs.ensureDir(path.join(skills, "nextjs", "references"));
  await fs.ensureDir(path.join(skills, ".hidden", "x"));
  await writeFile(
    path.join(skills, "nextjs", "nextjs-app-router", "SKILL.md"),
    "---\nname: nextjs-app-router\ndescription: d\n---\nUse Next.js 15+.\n",
  );
  await writeFile(path.join(skills, "nextjs", "references", "framework-map.md"), "# map\n");
  await writeFile(path.join(skills, "metadata.json"), "{}");
  try {
    const records = walkSkills(skills);
    assert.equal(records.length, 1);
    assert.equal(records[0].category, "nextjs");
    assert.equal(records[0].name, "nextjs-app-router");
    assert.equal(records[0].frontmatter.name, "nextjs-app-router");
    assert.match(records[0].body, /Next\.js 15\+/);
  } finally {
    await fs.remove(root);
  }
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd /Users/nguyenhuyhoang/OtherProjects/agent-skills-standard-freshness && node --import tsx --test scripts/freshness/skills.test.ts`
Expected: FAIL, cannot find module `./skills`.

- [ ] **Step 4: Write `skills.ts`**

```ts
// scripts/freshness/skills.ts
import fs from "fs-extra";
import yaml from "js-yaml";
import path from "path";
import type { SkillRecord } from "./types";

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;

/**
 * Splits a SKILL.md into parsed YAML frontmatter and body.
 * Mirrors the CRLF-safe regex in cli/src/services/MetadataReader.ts.
 * Returns null when the file has no frontmatter block.
 */
export function parseFrontmatter(
  content: string,
): { frontmatter: Record<string, unknown>; body: string } | null {
  const match = content.match(FRONTMATTER_RE);
  if (!match) return null;
  const loaded = yaml.load(match[1], { schema: yaml.JSON_SCHEMA });
  const frontmatter =
    loaded && typeof loaded === "object"
      ? (loaded as Record<string, unknown>)
      : {};
  return { frontmatter, body: match[2] };
}

/**
 * Walks `skills/<category>/<skill>/SKILL.md`. Skips dot-prefixed
 * directories and any subdirectory without a SKILL.md (e.g. `references/`).
 */
export function walkSkills(skillsDir: string): SkillRecord[] {
  const records: SkillRecord[] = [];
  const categories = fs
    .readdirSync(skillsDir)
    .filter(
      (c) =>
        !c.startsWith(".") &&
        fs.statSync(path.join(skillsDir, c)).isDirectory(),
    )
    .sort();
  for (const category of categories) {
    const categoryDir = path.join(skillsDir, category);
    const skillDirs = fs
      .readdirSync(categoryDir)
      .filter((s) => !s.startsWith("."))
      .sort();
    for (const name of skillDirs) {
      const dir = path.join(categoryDir, name);
      const skillPath = path.join(dir, "SKILL.md");
      if (!fs.existsSync(skillPath)) continue;
      const parsed = parseFrontmatter(fs.readFileSync(skillPath, "utf8"));
      if (!parsed) continue;
      records.push({
        category,
        name,
        dir,
        skillPath,
        frontmatter: parsed.frontmatter,
        body: parsed.body,
      });
    }
  }
  return records;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --import tsx --test scripts/freshness/skills.test.ts`
Expected: 3 passing.

- [ ] **Step 6: Commit**

```bash
git add scripts/freshness/types.ts scripts/freshness/skills.ts scripts/freshness/skills.test.ts
git commit -m "feat(freshness): types, frontmatter parser, skill walker"
```

---

### Task 2: Version parsing and comparison

**Files:**
- Create: `scripts/freshness/versions.ts`
- Test: `scripts/freshness/versions.test.ts`

**Interfaces:**
- Produces: `parseVersion(raw: string): number[] | null` (1..3 numeric parts, strips leading `v`, ignores trailing `+`)
- Produces: `compareVersions(a: number[], b: number[]): -1 | 0 | 1` (missing parts treated as 0)
- Produces: `significantPart(parts: number[], significance: "major" | "minor"): number[]`

- [ ] **Step 1: Write the failing test**

```ts
// scripts/freshness/versions.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { compareVersions, parseVersion, significantPart } from "./versions";

test("parseVersion accepts 1-3 parts, strips v and +", () => {
  assert.deepEqual(parseVersion("15.3.0"), [15, 3, 0]);
  assert.deepEqual(parseVersion("v20"), [20]);
  assert.deepEqual(parseVersion("3.27+"), [3, 27]);
  assert.deepEqual(parseVersion("REL_17_2"), null);
  assert.deepEqual(parseVersion(""), null);
});

test("compareVersions pads missing parts with zero", () => {
  assert.equal(compareVersions([15], [15, 0, 0]), 0);
  assert.equal(compareVersions([15, 3], [16]), -1);
  assert.equal(compareVersions([21], [17, 9]), 1);
});

test("significantPart truncates to major or major.minor", () => {
  assert.deepEqual(significantPart([3, 27, 1], "minor"), [3, 27]);
  assert.deepEqual(significantPart([15, 3, 0], "major"), [15]);
  assert.deepEqual(significantPart([21], "minor"), [21, 0]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test scripts/freshness/versions.test.ts`
Expected: FAIL, cannot find module `./versions`.

- [ ] **Step 3: Write `versions.ts`**

```ts
// scripts/freshness/versions.ts

/**
 * Parses "15.3.0", "v20", "3.27+" into numeric parts. Returns null for
 * anything that is not 1-3 dot-separated integers.
 */
export function parseVersion(raw: string): number[] | null {
  const cleaned = raw.trim().replace(/^v/i, "").replace(/\+$/, "");
  if (!/^\d+(\.\d+){0,2}$/.test(cleaned)) return null;
  return cleaned.split(".").map((p) => Number(p));
}

/** Numeric compare; shorter arrays are padded with zeros. */
export function compareVersions(a: number[], b: number[]): -1 | 0 | 1 {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x < y) return -1;
    if (x > y) return 1;
  }
  return 0;
}

/**
 * Truncates to the part that matters for drift: "major" → [M],
 * "minor" → [M, m] (for Go/Flutter/PHP-style versioning where the
 * minor number carries the breaking changes).
 */
export function significantPart(
  parts: number[],
  significance: "major" | "minor",
): number[] {
  if (significance === "major") return [parts[0] ?? 0];
  return [parts[0] ?? 0, parts[1] ?? 0];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import tsx --test scripts/freshness/versions.test.ts`
Expected: 3 passing.

- [ ] **Step 5: Commit**

```bash
git add scripts/freshness/versions.ts scripts/freshness/versions.test.ts
git commit -m "feat(freshness): version parse and compare helpers"
```

---

### Task 3: Pin loading and merge

**Files:**
- Create: `scripts/freshness/pins.ts`
- Test: `scripts/freshness/pins.test.ts`

**Interfaces:**
- Consumes: `SkillRecord`, `UpstreamEntry`, `EffectivePin` from `types.ts`.
- Produces: `VERSION_AGNOSTIC_CATEGORIES: ReadonlySet<string>` = `common`, `specialists`, `system-design`.
- Produces: `loadCategoryPins(metadataPath: string): Map<string, UpstreamEntry[]>` (category → entries; missing `upstream` → empty array; also returns every category listed in metadata).
- Produces: `effectivePins(skill: SkillRecord, categoryPins: Map<string, UpstreamEntry[]>): EffectivePin[]` (category ∪ skill; a skill entry with the same `name` overrides the category entry).
- Produces: `isUpstreamEntry(value: unknown): value is UpstreamEntry`.

- [ ] **Step 1: Write the failing test**

```ts
// scripts/freshness/pins.test.ts
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import fs from "fs-extra";
import { effectivePins, isUpstreamEntry, loadCategoryPins } from "./pins";
import type { SkillRecord } from "./types";

const next = {
  name: "next",
  source: "github" as const,
  repo: "vercel/next.js",
  pinned: "15.3.0",
  reviewed: "2026-06-17",
};

function skill(category: string, name: string, upstream?: unknown): SkillRecord {
  return {
    category,
    name,
    dir: `/tmp/${category}/${name}`,
    skillPath: `/tmp/${category}/${name}/SKILL.md`,
    frontmatter: { name, metadata: upstream ? { upstream } : {} },
    body: "",
  };
}

test("loadCategoryPins returns every category, empty when no upstream", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ags-pins-"));
  const metadataPath = path.join(root, "metadata.json");
  await fs.writeJson(metadataPath, {
    categories: {
      nextjs: { version: "1.0.0", upstream: [next] },
      common: { version: "1.0.0" },
    },
  });
  try {
    const pins = loadCategoryPins(metadataPath);
    assert.deepEqual([...pins.keys()].sort(), ["common", "nextjs"]);
    assert.deepEqual(pins.get("common"), []);
    assert.equal(pins.get("nextjs")?.[0].repo, "vercel/next.js");
  } finally {
    await fs.remove(root);
  }
});

test("effectivePins merges category and skill pins, skill wins on same name", () => {
  const categoryPins = new Map([["nextjs", [next]]]);
  const override = { ...next, pinned: "16.0.0", reviewed: "2026-09-01" };
  const extra = { name: "react", source: "github", repo: "facebook/react", pinned: "19.1.0", reviewed: "2026-09-01" };
  const pins = effectivePins(skill("nextjs", "nextjs-app-router", [override, extra]), categoryPins);
  assert.equal(pins.length, 2);
  const nextPin = pins.find((p) => p.name === "next");
  assert.equal(nextPin?.pinned, "16.0.0");
  assert.equal(nextPin?.origin, "skill");
  assert.equal(pins.find((p) => p.name === "react")?.origin, "skill");
});

test("effectivePins ignores malformed skill entries", () => {
  const categoryPins = new Map([["nextjs", [next]]]);
  const pins = effectivePins(skill("nextjs", "x", [{ name: "bad" }]), categoryPins);
  assert.equal(pins.length, 1);
  assert.equal(pins[0].origin, "category");
});

test("isUpstreamEntry requires repo for github source", () => {
  assert.equal(isUpstreamEntry(next), true);
  assert.equal(isUpstreamEntry({ ...next, repo: undefined }), false);
  assert.equal(isUpstreamEntry({ name: "ios", source: "manual", pinned: "17", reviewed: "2026-07-09" }), true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test scripts/freshness/pins.test.ts`
Expected: FAIL, cannot find module `./pins`.

- [ ] **Step 3: Write `pins.ts`**

```ts
// scripts/freshness/pins.ts
import fs from "fs-extra";
import type { EffectivePin, SkillRecord, UpstreamEntry } from "./types";

/** Categories that track no upstream and are exempt from `missing-pin`. */
export const VERSION_AGNOSTIC_CATEGORIES: ReadonlySet<string> = new Set([
  "common",
  "specialists",
  "system-design",
]);

/** Runtime guard for an UpstreamEntry declared in JSON or YAML. */
export function isUpstreamEntry(value: unknown): value is UpstreamEntry {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v.name !== "string" || v.name.length === 0) return false;
  if (v.source !== "github" && v.source !== "manual") return false;
  if (v.source === "github" && typeof v.repo !== "string") return false;
  if (typeof v.pinned !== "string" || v.pinned.length === 0) return false;
  if (typeof v.reviewed !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v.reviewed))
    return false;
  return true;
}

/**
 * Reads `categories.<cat>.upstream[]` from skills/metadata.json.
 * Every category present in metadata gets a key; categories without
 * `upstream` map to an empty array so callers can detect `missing-pin`.
 */
export function loadCategoryPins(
  metadataPath: string,
): Map<string, UpstreamEntry[]> {
  const metadata = fs.readJsonSync(metadataPath) as {
    categories?: Record<string, { upstream?: unknown }>;
  };
  const result = new Map<string, UpstreamEntry[]>();
  for (const [category, meta] of Object.entries(metadata.categories ?? {})) {
    const raw = Array.isArray(meta.upstream) ? meta.upstream : [];
    result.set(category, raw.filter(isUpstreamEntry));
  }
  return result;
}

/**
 * Category pins ∪ skill pins. A skill-level entry with the same `name`
 * replaces the category entry. Malformed skill entries are ignored.
 */
export function effectivePins(
  skill: SkillRecord,
  categoryPins: Map<string, UpstreamEntry[]>,
): EffectivePin[] {
  const byName = new Map<string, EffectivePin>();
  for (const entry of categoryPins.get(skill.category) ?? []) {
    byName.set(entry.name, {
      ...entry,
      category: skill.category,
      skillName: skill.name,
      origin: "category",
    });
  }
  const metadata = (skill.frontmatter.metadata ?? {}) as Record<string, unknown>;
  const skillEntries = Array.isArray(metadata.upstream) ? metadata.upstream : [];
  for (const entry of skillEntries.filter(isUpstreamEntry)) {
    byName.set(entry.name, {
      ...entry,
      category: skill.category,
      skillName: skill.name,
      origin: "skill",
    });
  }
  return [...byName.values()];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import tsx --test scripts/freshness/pins.test.ts`
Expected: 4 passing.

- [ ] **Step 5: Commit**

```bash
git add scripts/freshness/pins.ts scripts/freshness/pins.test.ts
git commit -m "feat(freshness): load category pins and merge per-skill overrides"
```

---

### Task 4: Version-claim scanner

**Files:**
- Create: `scripts/freshness/claims.ts`
- Test: `scripts/freshness/claims.test.ts`

**Interfaces:**
- Consumes: `SkillRecord`, `VersionClaim` from `types.ts`.
- Produces: `CLAIM_ALIASES: Record<string, { pattern: RegExp; significance: "major" | "minor" }>` keyed by upstream `name`.
- Produces: `scanClaims(skill: SkillRecord, repoRoot: string): VersionClaim[]` scanning `SKILL.md` body and `references/*.md` inside the skill dir.
- Produces: `scanText(text: string, file: string, skill: { category: string; name: string }): VersionClaim[]` (pure; used by tests and `scanClaims`).

Alias table (regex has one capture group = version; optional trailing `+` captured separately by the scanner):

| name | pattern (case-sensitive) | significance |
|---|---|---|
| next | `Next\.js\s+v?(\d+(?:\.\d+)?)` | major |
| react | `React\s+v?(\d+(?:\.\d+)?)` | major |
| react-native | `React Native\s+v?(\d+\.\d+)` | minor |
| angular | `Angular\s+v?(\d+(?:\.\d+)?)` | major |
| nestjs | `NestJS\s+v?(\d+(?:\.\d+)?)` | major |
| node | `Node(?:\.js)?\s+v?(\d+(?:\.\d+)?)` | major |
| typescript | `TypeScript\s+v?(\d+\.\d+)` | minor |
| flutter | `Flutter\s+v?(\d+\.\d+)` | minor |
| dart | `Dart\s+v?(\d+(?:\.\d+)?)` | major |
| go | `Go\s+(\d+\.\d+)` | minor |
| python | `Python\s+(\d+\.\d+)` | minor |
| php | `PHP\s+(\d+(?:\.\d+)?)` | minor |
| laravel | `Laravel\s+v?(\d+(?:\.\d+)?)` | major |
| kotlin | `Kotlin\s+v?(\d+\.\d+)` | minor |
| java | `Java\s+(\d+)` | major |
| spring-boot | `Spring Boot\s+v?(\d+(?:\.\d+)?)` | major |
| swift | `Swift\s+(\d+(?:\.\d+)?)` | major |
| ios | `iOS\s+(\d+(?:\.\d+)?)` | major |
| xcode | `Xcode\s+(\d+(?:\.\d+)?)` | major |
| android | `Android\s+(\d+)` | major |
| agp | `AGP\s+(\d+(?:\.\d+)?)` | major |
| postgresql | `Postgre(?:SQL|s)\s+(\d+)` | major |
| redis | `Redis\s+(\d+(?:\.\d+)?)` | major |
| mongodb | `MongoDB\s+(\d+(?:\.\d+)?)` | major |
| playwright | `Playwright\s+v?(\d+(?:\.\d+)?)` | major |

Note: `React\s+` must not match "React Native 0.76"; the scanner processes `react-native` before `react` and the `react` pattern is `React\s+v?(\d+...)` which cannot match "React Native" because "N" is not a digit. Fine as is.

- [ ] **Step 1: Write the failing test**

```ts
// scripts/freshness/claims.test.ts
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import fs from "fs-extra";
import { scanClaims, scanText } from "./claims";
import type { SkillRecord } from "./types";

const who = { category: "nextjs", name: "nextjs-app-router" };

test("scanText extracts name, version, floor flag, and line", () => {
  const text = "Intro\nUse Next.js 15+ App Router.\nJava 21 virtual threads.\nReact Native 0.76 and React 19.\nFlutter 3.27+ spacing.\n";
  const claims = scanText(text, "skills/x/SKILL.md", who);
  const byName = Object.fromEntries(claims.map((c) => [c.name, c]));
  assert.equal(byName.next.version, "15");
  assert.equal(byName.next.floor, true);
  assert.equal(byName.next.line, 2);
  assert.equal(byName.java.version, "21");
  assert.equal(byName.java.floor, false);
  assert.equal(byName["react-native"].version, "0.76");
  assert.equal(byName.react.version, "19");
  assert.equal(byName.flutter.version, "3.27");
  assert.equal(claims.length, 5);
});

test("scanText ignores prose numbers without a known product name", () => {
  assert.deepEqual(scanText("Chapter 12 has 3 rules.", "f.md", who), []);
});

test("scanClaims covers SKILL.md body and references/*.md with repo-relative paths", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ags-claims-"));
  const dir = path.join(root, "skills", "nextjs", "nextjs-app-router");
  await fs.ensureDir(path.join(dir, "references"));
  await writeFile(path.join(dir, "SKILL.md"), "---\nname: a\n---\nNext.js 15+\n");
  await writeFile(path.join(dir, "references", "implementation.md"), "Angular 17+\n");
  const skill: SkillRecord = {
    category: "nextjs",
    name: "nextjs-app-router",
    dir,
    skillPath: path.join(dir, "SKILL.md"),
    frontmatter: { name: "a" },
    body: "Next.js 15+\n",
  };
  try {
    const claims = scanClaims(skill, root);
    assert.deepEqual(
      claims.map((c) => [c.name, c.file]).sort(),
      [
        ["angular", "skills/nextjs/nextjs-app-router/references/implementation.md"],
        ["next", "skills/nextjs/nextjs-app-router/SKILL.md"],
      ],
    );
  } finally {
    await fs.remove(root);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test scripts/freshness/claims.test.ts`
Expected: FAIL, cannot find module `./claims`.

- [ ] **Step 3: Write `claims.ts`**

```ts
// scripts/freshness/claims.ts
import fs from "fs-extra";
import path from "path";
import type { SkillRecord, VersionClaim } from "./types";

/** Regex per upstream name; group 1 is the version. Order matters: longer product names first. */
export const CLAIM_ALIASES: Record<
  string,
  { pattern: RegExp; significance: "major" | "minor" }
> = {
  "react-native": { pattern: /React Native\s+v?(\d+\.\d+)/g, significance: "minor" },
  "spring-boot": { pattern: /Spring Boot\s+v?(\d+(?:\.\d+)?)/g, significance: "major" },
  next: { pattern: /Next\.js\s+v?(\d+(?:\.\d+)?)/g, significance: "major" },
  react: { pattern: /React\s+v?(\d+(?:\.\d+)?)/g, significance: "major" },
  angular: { pattern: /Angular\s+v?(\d+(?:\.\d+)?)/g, significance: "major" },
  nestjs: { pattern: /NestJS\s+v?(\d+(?:\.\d+)?)/g, significance: "major" },
  node: { pattern: /Node(?:\.js)?\s+v?(\d+(?:\.\d+)?)/g, significance: "major" },
  typescript: { pattern: /TypeScript\s+v?(\d+\.\d+)/g, significance: "minor" },
  flutter: { pattern: /Flutter\s+v?(\d+\.\d+)/g, significance: "minor" },
  dart: { pattern: /Dart\s+v?(\d+(?:\.\d+)?)/g, significance: "major" },
  go: { pattern: /Go\s+(\d+\.\d+)/g, significance: "minor" },
  python: { pattern: /Python\s+(\d+\.\d+)/g, significance: "minor" },
  php: { pattern: /PHP\s+(\d+(?:\.\d+)?)/g, significance: "minor" },
  laravel: { pattern: /Laravel\s+v?(\d+(?:\.\d+)?)/g, significance: "major" },
  kotlin: { pattern: /Kotlin\s+v?(\d+\.\d+)/g, significance: "minor" },
  java: { pattern: /Java\s+(\d+)/g, significance: "major" },
  swift: { pattern: /Swift\s+(\d+(?:\.\d+)?)/g, significance: "major" },
  ios: { pattern: /iOS\s+(\d+(?:\.\d+)?)/g, significance: "major" },
  xcode: { pattern: /Xcode\s+(\d+(?:\.\d+)?)/g, significance: "major" },
  android: { pattern: /Android\s+(\d+)/g, significance: "major" },
  agp: { pattern: /AGP\s+(\d+(?:\.\d+)?)/g, significance: "major" },
  postgresql: { pattern: /Postgre(?:SQL|s)\s+(\d+)/g, significance: "major" },
  redis: { pattern: /Redis\s+(\d+(?:\.\d+)?)/g, significance: "major" },
  mongodb: { pattern: /MongoDB\s+(\d+(?:\.\d+)?)/g, significance: "major" },
  playwright: { pattern: /Playwright\s+v?(\d+(?:\.\d+)?)/g, significance: "major" },
};

/**
 * Scans text line by line for every alias. A `+` immediately after the
 * version marks the claim as a floor ("Next.js 15+").
 */
export function scanText(
  text: string,
  file: string,
  skill: { category: string; name: string },
): VersionClaim[] {
  const claims: VersionClaim[] = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((lineText, index) => {
    for (const [name, alias] of Object.entries(CLAIM_ALIASES)) {
      const re = new RegExp(alias.pattern.source, "g");
      let match: RegExpExecArray | null;
      while ((match = re.exec(lineText)) !== null) {
        const after = lineText.charAt(match.index + match[0].length);
        claims.push({
          category: skill.category,
          skillName: skill.name,
          name,
          version: match[1],
          floor: after === "+",
          file,
          line: index + 1,
        });
      }
    }
  });
  return claims;
}

/**
 * Scans a skill's SKILL.md body and every `references/*.md` beside it.
 * File paths in the result are relative to `repoRoot` with forward slashes.
 */
export function scanClaims(skill: SkillRecord, repoRoot: string): VersionClaim[] {
  const rel = (abs: string) => path.relative(repoRoot, abs).split(path.sep).join("/");
  const who = { category: skill.category, name: skill.name };
  const claims = scanText(skill.body, rel(skill.skillPath), who);
  const refDir = path.join(skill.dir, "references");
  if (fs.existsSync(refDir)) {
    for (const entry of fs.readdirSync(refDir).filter((f) => f.endsWith(".md")).sort()) {
      const abs = path.join(refDir, entry);
      claims.push(...scanText(fs.readFileSync(abs, "utf8"), rel(abs), who));
    }
  }
  return claims;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import tsx --test scripts/freshness/claims.test.ts`
Expected: 3 passing. If the first test reports 6 claims instead of 5, the `react` regex also matched inside "React Native 0.76"; confirm the pattern requires a digit right after `React\s+v?` and fix.

- [ ] **Step 5: Commit**

```bash
git add scripts/freshness/claims.ts scripts/freshness/claims.test.ts
git commit -m "feat(freshness): scan version claims in skill bodies and references"
```

---

### Task 5: Offline audit rules

**Files:**
- Create: `scripts/freshness/audit.ts`
- Test: `scripts/freshness/audit.test.ts`

**Interfaces:**
- Consumes: `walkSkills`, `loadCategoryPins`, `effectivePins`, `VERSION_AGNOSTIC_CATEGORIES`, `scanClaims`, `CLAIM_ALIASES`, `parseVersion`, `compareVersions`, `significantPart`.
- Produces: `auditFreshness(repoRoot: string, options: { staleDays: number; today?: Date }): FreshnessIssue[]`
- Produces: `readFrameworkMapReviewed(categoryDir: string): string | null` (parses `Reviewed: YYYY-MM-DD` from `references/framework-map.md`).
- Produces: `daysBetween(from: string, to: Date): number`.

Rules (in order, per the spec's issue table):

1. `missing-pin` (low), one per category: category not in `VERSION_AGNOSTIC_CATEGORIES` and `loadCategoryPins` gives `[]` and no skill in that category declares a skill-level pin.
2. `reviewed-stale` (med), one per distinct pin (dedupe by `origin + category + skillName-or-"" + name`): `daysBetween(pin.reviewed, today) > staleDays`. Category-origin pins report with `skillName: ""` once per category, not once per skill.
3. `reviewed-mismatch` (low), one per category with a framework map: framework-map `Reviewed:` date differs from every category pin's `reviewed`.
4. `claim-ahead-of-pin` (med): claim version (significant part per alias) > pin version (significant part) for a pin with the same `name`.
5. `claim-behind-pin` (med): claim is not a floor and claim < pin at significance.
6. Claims whose `name` has no effective pin for that skill are ignored (no pin, nothing to compare).

- [ ] **Step 1: Write the failing test**

```ts
// scripts/freshness/audit.test.ts
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import fs from "fs-extra";
import { auditFreshness, daysBetween, readFrameworkMapReviewed } from "./audit";

const TODAY = new Date("2026-09-14T00:00:00Z");

async function fixture(): Promise<{ root: string; cleanup: () => Promise<void> }> {
  const root = await mkdtemp(path.join(os.tmpdir(), "ags-audit-"));
  const skills = path.join(root, "skills");
  const mk = async (cat: string, name: string, body: string, fm = "") => {
    await fs.ensureDir(path.join(skills, cat, name));
    await writeFile(
      path.join(skills, cat, name, "SKILL.md"),
      `---\nname: ${name}\ndescription: d\n${fm}---\n${body}\n`,
    );
  };
  await mk("nextjs", "nextjs-app-router", "Use Next.js 15+.");
  await mk("nextjs", "nextjs-legacy", "Targets Next.js 14 only.");
  await mk("java", "java-language", "Java 21 and Java 16+ features.");
  await mk("angular", "angular-components", "Angular 21 signals.");
  await mk("php", "php-language", "PHP 8.2+");
  await mk("common", "common-tdd", "no versions");
  await mk(
    "database",
    "database-postgresql",
    "PostgreSQL 16 partitioning.",
    'metadata:\n  upstream:\n    - name: postgresql\n      source: github\n      repo: postgres/postgres\n      pinned: "16"\n      reviewed: "2026-09-01"\n',
  );
  await fs.ensureDir(path.join(skills, "nextjs", "references"));
  await writeFile(path.join(skills, "nextjs", "references", "framework-map.md"), "# Map\n\nReviewed: 2026-06-17\n");
  await fs.ensureDir(path.join(skills, "angular", "references"));
  await writeFile(path.join(skills, "angular", "references", "framework-map.md"), "# Map\n\nReviewed: 2026-07-09\n");
  await fs.writeJson(path.join(skills, "metadata.json"), {
    categories: {
      nextjs: { version: "1", upstream: [{ name: "next", source: "github", repo: "vercel/next.js", pinned: "15.3.0", reviewed: "2026-06-17" }] },
      java: { version: "1", upstream: [{ name: "java", source: "github", repo: "openjdk/jdk", pinned: "21", reviewed: "2026-09-01" }] },
      angular: { version: "1", upstream: [{ name: "angular", source: "github", repo: "angular/angular", pinned: "20.0.0", reviewed: "2026-09-01" }] },
      php: { version: "1" },
      common: { version: "1" },
      database: { version: "1" },
    },
  });
  return { root, cleanup: () => fs.remove(root) };
}

test("daysBetween counts whole days", () => {
  assert.equal(daysBetween("2026-06-17", TODAY), 89);
});

test("readFrameworkMapReviewed parses the Reviewed line", async () => {
  const { root, cleanup } = await fixture();
  try {
    assert.equal(readFrameworkMapReviewed(path.join(root, "skills", "nextjs")), "2026-06-17");
    assert.equal(readFrameworkMapReviewed(path.join(root, "skills", "java")), null);
  } finally {
    await cleanup();
  }
});

test("auditFreshness emits the expected issue set", async () => {
  const { root, cleanup } = await fixture();
  try {
    const issues = auditFreshness(root, { staleDays: 60, today: TODAY });
    const key = (i: { type: string; category: string; skillName: string; upstream?: string }) =>
      `${i.type}:${i.category}:${i.skillName}:${i.upstream ?? ""}`;
    const keys = issues.map(key).sort();
    assert.deepEqual(keys, [
      "claim-ahead-of-pin:angular:angular-components:angular",
      "claim-behind-pin:nextjs:nextjs-legacy:next",
      "missing-pin:php::",
      "reviewed-mismatch:angular::angular",
      "reviewed-stale:nextjs::next",
    ]);
    const behind = issues.find((i) => i.type === "claim-behind-pin");
    assert.equal(behind?.severity, "med");
    assert.equal(behind?.file, "skills/nextjs/nextjs-legacy/SKILL.md");
    assert.equal(behind?.line, 1);
    assert.equal(issues.find((i) => i.type === "missing-pin")?.severity, "low");
  } finally {
    await cleanup();
  }
});
```

Expected reasoning for the fixture: `common` is exempt; `database` has no category pin but `database-postgresql` declares a skill pin, so no `missing-pin`; PostgreSQL 16 equals pin 16, no claim issue; Java 21 equals pin, Java 16+ is a floor below pin, ignored; nextjs pin reviewed 89 days ago > 60 → stale, framework-map date equals pin date → no mismatch; angular map 2026-07-09 ≠ pin 2026-09-01 → mismatch, and claim 21 > pin 20 → ahead.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test scripts/freshness/audit.test.ts`
Expected: FAIL, cannot find module `./audit`.

- [ ] **Step 3: Write `audit.ts`**

```ts
// scripts/freshness/audit.ts
import fs from "fs-extra";
import path from "path";
import { CLAIM_ALIASES, scanClaims } from "./claims";
import {
  VERSION_AGNOSTIC_CATEGORIES,
  effectivePins,
  loadCategoryPins,
} from "./pins";
import { walkSkills } from "./skills";
import type { EffectivePin, FreshnessIssue, SkillRecord } from "./types";
import { compareVersions, parseVersion, significantPart } from "./versions";

/** Whole days from an ISO date (YYYY-MM-DD) to `to`. */
export function daysBetween(from: string, to: Date): number {
  const start = new Date(`${from}T00:00:00Z`).getTime();
  return Math.floor((to.getTime() - start) / 86_400_000);
}

/** Reads `Reviewed: YYYY-MM-DD` from `<categoryDir>/references/framework-map.md`. */
export function readFrameworkMapReviewed(categoryDir: string): string | null {
  const mapPath = path.join(categoryDir, "references", "framework-map.md");
  if (!fs.existsSync(mapPath)) return null;
  const match = fs.readFileSync(mapPath, "utf8").match(/^Reviewed:\s*(\d{4}-\d{2}-\d{2})/m);
  return match ? match[1] : null;
}

interface AuditOptions {
  staleDays: number;
  /** Injectable clock for tests; defaults to now. */
  today?: Date;
}

/**
 * Offline freshness audit: missing pins, stale reviews, framework-map
 * date mismatches, and version claims that disagree with pins.
 * Never touches the network.
 */
export function auditFreshness(
  repoRoot: string,
  options: AuditOptions,
): FreshnessIssue[] {
  const today = options.today ?? new Date();
  const skillsDir = path.join(repoRoot, "skills");
  const categoryPins = loadCategoryPins(path.join(skillsDir, "metadata.json"));
  const skills = walkSkills(skillsDir);
  const issues: FreshnessIssue[] = [];

  const pinsBySkill = new Map<SkillRecord, EffectivePin[]>();
  for (const skill of skills) pinsBySkill.set(skill, effectivePins(skill, categoryPins));

  // 1. missing-pin
  for (const [category, entries] of categoryPins) {
    if (VERSION_AGNOSTIC_CATEGORIES.has(category) || entries.length > 0) continue;
    const anySkillPin = skills.some(
      (s) => s.category === category && (pinsBySkill.get(s) ?? []).some((p) => p.origin === "skill"),
    );
    if (anySkillPin) continue;
    issues.push({
      type: "missing-pin",
      severity: "low",
      category,
      skillName: "",
      message: `Category "${category}" declares no upstream pins in skills/metadata.json`,
    });
  }

  // 2. reviewed-stale (deduped)
  const seenStale = new Set<string>();
  for (const [skill, pins] of pinsBySkill) {
    for (const pin of pins) {
      const skillName = pin.origin === "category" ? "" : skill.name;
      const dedupe = `${pin.category}:${skillName}:${pin.name}`;
      if (seenStale.has(dedupe)) continue;
      seenStale.add(dedupe);
      const age = daysBetween(pin.reviewed, today);
      if (age > options.staleDays) {
        issues.push({
          type: "reviewed-stale",
          severity: "med",
          category: pin.category,
          skillName,
          upstream: pin.name,
          message: `Pin "${pin.name}" (${pin.pinned}) last reviewed ${pin.reviewed}, ${age} days ago (> ${options.staleDays})`,
        });
      }
    }
  }

  // 3. reviewed-mismatch
  for (const [category, entries] of categoryPins) {
    const mapDate = readFrameworkMapReviewed(path.join(skillsDir, category));
    if (!mapDate || entries.length === 0) continue;
    for (const entry of entries) {
      if (entry.reviewed === mapDate) continue;
      issues.push({
        type: "reviewed-mismatch",
        severity: "low",
        category,
        skillName: "",
        upstream: entry.name,
        message: `framework-map.md says Reviewed: ${mapDate} but pin "${entry.name}" says ${entry.reviewed}`,
        file: `skills/${category}/references/framework-map.md`,
      });
    }
  }

  // 4 + 5. claims vs pins
  for (const [skill, pins] of pinsBySkill) {
    if (pins.length === 0) continue;
    const pinByName = new Map(pins.map((p) => [p.name, p]));
    for (const claim of scanClaims(skill, repoRoot)) {
      const pin = pinByName.get(claim.name);
      const alias = CLAIM_ALIASES[claim.name];
      if (!pin || !alias) continue;
      const claimed = parseVersion(claim.version);
      const pinned = parseVersion(pin.pinned);
      if (!claimed || !pinned) continue;
      const cmp = compareVersions(
        significantPart(claimed, alias.significance),
        significantPart(pinned, alias.significance),
      );
      if (cmp > 0) {
        issues.push({
          type: "claim-ahead-of-pin",
          severity: "med",
          category: skill.category,
          skillName: skill.name,
          upstream: claim.name,
          message: `Claims "${claim.name} ${claim.version}${claim.floor ? "+" : ""}" but pin is ${pin.pinned}; bump the pin`,
          file: claim.file,
          line: claim.line,
        });
      } else if (cmp < 0 && !claim.floor) {
        issues.push({
          type: "claim-behind-pin",
          severity: "med",
          category: skill.category,
          skillName: skill.name,
          upstream: claim.name,
          message: `Claims "${claim.name} ${claim.version}" but pin is ${pin.pinned}; update the guidance or mark as a floor with "+"`,
          file: claim.file,
          line: claim.line,
        });
      }
    }
  }

  return issues;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import tsx --test scripts/freshness/audit.test.ts`
Expected: 3 passing.

- [ ] **Step 5: Commit**

```bash
git add scripts/freshness/audit.ts scripts/freshness/audit.test.ts
git commit -m "feat(freshness): offline audit rules for pins, reviews, and claims"
```

---

### Task 6: Report builder, Markdown renderer, CLI entry

**Files:**
- Create: `scripts/freshness/report.ts`
- Create: `scripts/freshness/index.ts`
- Test: `scripts/freshness/report.test.ts`
- Modify: `package.json` scripts block (lines 39-41 and after line 66 `evals:queue`)
- Modify: `.gitignore` (append)

**Interfaces:**
- Consumes: `FreshnessIssue`, `FreshnessReport`, `UpstreamStatus`.
- Produces: `buildReport(action: "audit" | "check", staleDays: number, issues: FreshnessIssue[], upstream: UpstreamStatus[], generatedAt?: string): FreshnessReport`
- Produces: `renderMarkdown(report: FreshnessReport): string`
- Produces: `FRESHNESS_DIR`, `FRESHNESS_JSON`, `FRESHNESS_MD` constants exported from `index.ts`.
- Produces: package scripts `freshness:audit`, `freshness:report`, `test:freshness`.

- [ ] **Step 1: Write the failing test**

```ts
// scripts/freshness/report.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { buildReport, renderMarkdown } from "./report";
import type { FreshnessIssue } from "./types";

const issues: FreshnessIssue[] = [
  { type: "missing-pin", severity: "low", category: "php", skillName: "", message: "no pins" },
  { type: "claim-behind-pin", severity: "med", category: "nextjs", skillName: "nextjs-legacy", upstream: "next", message: "Claims 14", file: "skills/nextjs/nextjs-legacy/SKILL.md", line: 3 },
  { type: "reviewed-stale", severity: "med", category: "nextjs", skillName: "", upstream: "next", message: "old" },
];

test("buildReport summarizes by severity and category", () => {
  const report = buildReport("audit", 120, issues, [], "2026-09-14T00:00:00.000Z");
  assert.equal(report.summary.issueCount, 3);
  assert.deepEqual(report.summary.bySeverity, { high: 0, med: 2, low: 1, warn: 0 });
  assert.deepEqual(report.summary.byCategory, { nextjs: 2, php: 1 });
  assert.equal(report.generatedAt, "2026-09-14T00:00:00.000Z");
});

test("renderMarkdown groups by category, severity first, with file:line", () => {
  const md = renderMarkdown(buildReport("audit", 120, issues, [], "2026-09-14T00:00:00.000Z"));
  assert.match(md, /^# Skill Freshness Report/m);
  assert.match(md, /\| high \| 0 \|/);
  assert.match(md, /^## nextjs/m);
  assert.match(md, /^## php/m);
  assert.ok(md.indexOf("## nextjs") < md.indexOf("## php"));
  assert.match(md, /`skills\/nextjs\/nextjs-legacy\/SKILL.md:3`/);
  assert.match(md, /No upstream versions fetched/);
});

test("renderMarkdown says clean when there are no issues", () => {
  const md = renderMarkdown(buildReport("audit", 120, [], []));
  assert.match(md, /No freshness issues/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test scripts/freshness/report.test.ts`
Expected: FAIL, cannot find module `./report`.

- [ ] **Step 3: Write `report.ts`**

```ts
// scripts/freshness/report.ts
import type {
  FreshnessIssue,
  FreshnessReport,
  Severity,
  UpstreamStatus,
} from "./types";

const SEVERITY_ORDER: Severity[] = ["high", "med", "low", "warn"];

/** Assembles the JSON report with severity and category counts. */
export function buildReport(
  action: "audit" | "check",
  staleDays: number,
  issues: FreshnessIssue[],
  upstream: UpstreamStatus[],
  generatedAt: string = new Date().toISOString(),
): FreshnessReport {
  const bySeverity: Record<Severity, number> = { high: 0, med: 0, low: 0, warn: 0 };
  const byCategory: Record<string, number> = {};
  for (const issue of issues) {
    bySeverity[issue.severity] += 1;
    byCategory[issue.category] = (byCategory[issue.category] ?? 0) + 1;
  }
  const sorted = [...issues].sort(
    (a, b) =>
      a.category.localeCompare(b.category) ||
      SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity) ||
      a.skillName.localeCompare(b.skillName),
  );
  return {
    generatedAt,
    action,
    staleDays,
    summary: { issueCount: issues.length, bySeverity, byCategory },
    issues: sorted,
    upstream,
  };
}

/** Renders the Markdown twin of the JSON report (also used as CI step summary). */
export function renderMarkdown(report: FreshnessReport): string {
  const lines: string[] = [];
  lines.push("# Skill Freshness Report");
  lines.push("");
  lines.push(`Generated: ${report.generatedAt} · action: \`${report.action}\` · stale after ${report.staleDays} days`);
  lines.push("");
  lines.push("| severity | count |");
  lines.push("|---|---|");
  for (const sev of SEVERITY_ORDER) lines.push(`| ${sev} | ${report.summary.bySeverity[sev]} |`);
  lines.push("");

  if (report.issues.length === 0) {
    lines.push("No freshness issues.");
  } else {
    const categories = Object.keys(report.summary.byCategory).sort();
    for (const category of categories) {
      lines.push(`## ${category}`);
      lines.push("");
      lines.push("| severity | type | skill | upstream | message | location |");
      lines.push("|---|---|---|---|---|---|");
      for (const issue of report.issues.filter((i) => i.category === category)) {
        const location = issue.file ? `\`${issue.file}${issue.line ? `:${issue.line}` : ""}\`` : "";
        lines.push(
          `| ${issue.severity} | ${issue.type} | ${issue.skillName || "(category)"} | ${issue.upstream ?? ""} | ${issue.message.replace(/\|/g, "\\|")} | ${location} |`,
        );
      }
      lines.push("");
    }
  }

  lines.push("## Upstream");
  lines.push("");
  if (report.upstream.length === 0) {
    lines.push("No upstream versions fetched (run `freshness:check` for live data).");
  } else {
    lines.push("| category | skill | upstream | pinned | latest | published | release |");
    lines.push("|---|---|---|---|---|---|---|");
    for (const u of report.upstream) {
      lines.push(
        `| ${u.category} | ${u.skillName || "(category)"} | ${u.name} | ${u.pinned} | ${u.latest ?? "?"} | ${u.publishedAt ?? ""} | ${u.releaseUrl ? `[link](${u.releaseUrl})` : ""} |`,
      );
    }
  }
  lines.push("");
  return lines.join("\n");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import tsx --test scripts/freshness/report.test.ts`
Expected: 3 passing.

- [ ] **Step 5: Write `index.ts` (CLI)**

```ts
// scripts/freshness/index.ts
import fs from "fs-extra";
import path from "path";
import { ROOT_DIR } from "../evals/constants";
import { auditFreshness } from "./audit";
import { buildReport, renderMarkdown } from "./report";
import type { FreshnessReport } from "./types";

/** Output directory for freshness reports (gitignored). */
export const FRESHNESS_DIR = path.join(ROOT_DIR, "benchmarks", "freshness");
/** JSON report path. */
export const FRESHNESS_JSON = path.join(FRESHNESS_DIR, "freshness-report.json");
/** Markdown report path. */
export const FRESHNESS_MD = path.join(FRESHNESS_DIR, "freshness-report.md");

const DEFAULT_STALE_DAYS = 120;

function flagValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function writeReport(report: FreshnessReport): void {
  fs.ensureDirSync(FRESHNESS_DIR);
  fs.writeJSONSync(FRESHNESS_JSON, report, { spaces: 2 });
  fs.writeFileSync(FRESHNESS_MD, renderMarkdown(report));
}

/**
 * CLI entry. Actions:
 * - `audit` (default): offline rules; prints a summary; `--write` saves the
 *   report; `--strict` exits 1 on any claim-* or missing-pin issue.
 * - `report`: re-renders Markdown from the last JSON report.
 * Flags: `--stale-days <n>` (default 120).
 */
export function main(): void {
  const action = process.argv[2] ?? "audit";
  const staleDays = Number(flagValue("--stale-days") ?? DEFAULT_STALE_DAYS);
  if (!Number.isFinite(staleDays) || staleDays <= 0) {
    throw new Error("--stale-days must be a positive number");
  }

  if (action === "audit") {
    const issues = auditFreshness(ROOT_DIR, { staleDays });
    const report = buildReport("audit", staleDays, issues, []);
    const strict = process.argv.includes("--strict");
    if (process.argv.includes("--write")) writeReport(report);
    const s = report.summary.bySeverity;
    console.log(
      `Freshness audit: ${issues.length} issues (high ${s.high}, med ${s.med}, low ${s.low}, warn ${s.warn})` +
        (process.argv.includes("--write") ? ` → ${FRESHNESS_JSON}` : ""),
    );
    for (const issue of report.issues) {
      const loc = issue.file ? ` [${issue.file}${issue.line ? `:${issue.line}` : ""}]` : "";
      console.log(`  ${issue.severity.padEnd(4)} ${issue.type.padEnd(20)} ${issue.category}/${issue.skillName || "-"}${loc}: ${issue.message}`);
    }
    const blocking = issues.filter((i) => i.type.startsWith("claim-") || i.type === "missing-pin");
    if (strict && blocking.length > 0) {
      console.error(`Strict mode: ${blocking.length} blocking issue(s)`);
      process.exitCode = 1;
    }
    return;
  }

  if (action === "report") {
    if (!fs.existsSync(FRESHNESS_JSON)) {
      throw new Error(`No report at ${FRESHNESS_JSON}; run "freshness:audit --write" first`);
    }
    const report = fs.readJSONSync(FRESHNESS_JSON) as FreshnessReport;
    fs.writeFileSync(FRESHNESS_MD, renderMarkdown(report));
    console.log(`Freshness report rendered → ${FRESHNESS_MD}`);
    return;
  }

  throw new Error(`Unknown action: ${action}; use audit or report`);
}

try {
  if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
    main();
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
```

- [ ] **Step 6: Wire package.json and .gitignore**

In `package.json`, change:

```json
"test": "pnpm --filter ./cli test && pnpm test:evals",
"test:evals": "node --import tsx --test scripts/evals/*.test.ts",
```
to
```json
"test": "pnpm --filter ./cli test && pnpm test:evals && pnpm test:freshness",
"test:evals": "node --import tsx --test scripts/evals/*.test.ts",
"test:freshness": "node --import tsx --test scripts/freshness/*.test.ts",
```

After the `"evals:queue"` line add:

```json
"freshness:audit": "tsx scripts/freshness/index.ts audit",
"freshness:report": "tsx scripts/freshness/index.ts report",
```

Append to `.gitignore`:

```
# freshness audit output; the weekly workflow uploads it as an artifact
/benchmarks/freshness/
```

- [ ] **Step 7: Run the CLI on the real repo**

Run: `pnpm freshness:audit` then `pnpm freshness:audit --write && head -20 benchmarks/freshness/freshness-report.md && git status --porcelain | grep benchmarks`
Expected: prints `Freshness audit: N issues`, N = 21 `missing-pin` (every category except common, specialists, system-design; no pins exist yet); `--write` creates both files; git status shows nothing under `benchmarks/`.

- [ ] **Step 8: Run all freshness tests**

Run: `pnpm test:freshness`
Expected: all passing (skills 3, versions 3, pins 4, claims 3, audit 3, report 3).

- [ ] **Step 9: Commit**

```bash
git add scripts/freshness/report.ts scripts/freshness/report.test.ts scripts/freshness/index.ts package.json .gitignore
git commit -m "feat(freshness): report renderer, CLI entry, package scripts"
```

---

### Task 7: CLI frontmatter schema for `metadata.upstream`

**Files:**
- Modify: `cli/src/schemas/skill-frontmatter.ts` (after line 39 `skillSignatureSchema`; inside `optionalSkillFieldsSchema` lines 47-66)
- Modify: `cli/src/models/types.ts:34-49` (`CategoryMetadata`)
- Test: `cli/src/schemas/__tests__/skill-frontmatter.spec.ts`

**Interfaces:**
- Produces: `upstreamEntrySchema` (zod), `UpstreamEntry` type export in `cli/src/models/types.ts`.
- Behavior: `optionalSkillFieldsSchema.safeParse({ metadata: { triggers: {...}, upstream: [...] } })` keeps `triggers` (passthrough) and validates `upstream`.

- [ ] **Step 1: Write the failing test**

```ts
// cli/src/schemas/__tests__/skill-frontmatter.spec.ts
import { describe, expect, it } from 'vitest';
import { optionalSkillFieldsSchema, upstreamEntrySchema } from '../skill-frontmatter';

const github = {
  name: 'next',
  source: 'github',
  repo: 'vercel/next.js',
  pinned: '15.3.0',
  tag_pattern: '^v(\\d+\\.\\d+\\.\\d+)$',
  reviewed: '2026-06-17',
};

describe('upstreamEntrySchema', () => {
  it('accepts a github entry and a manual entry', () => {
    expect(upstreamEntrySchema.safeParse(github).success).toBe(true);
    expect(
      upstreamEntrySchema.safeParse({ name: 'ios', source: 'manual', pinned: '17', reviewed: '2026-07-09' }).success,
    ).toBe(true);
  });

  it('requires repo when source is github', () => {
    const result = upstreamEntrySchema.safeParse({ ...github, repo: undefined });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path).toEqual(['repo']);
  });

  it('rejects malformed reviewed dates and unknown keys', () => {
    expect(upstreamEntrySchema.safeParse({ ...github, reviewed: '17 June' }).success).toBe(false);
    expect(upstreamEntrySchema.safeParse({ ...github, extra: 1 }).success).toBe(false);
  });
});

describe('optionalSkillFieldsSchema.metadata', () => {
  it('validates upstream and passes triggers through untouched', () => {
    const fm = { metadata: { triggers: { keywords: ['x'] }, upstream: [github] } };
    const result = optionalSkillFieldsSchema.safeParse(fm);
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data.metadata as { triggers: unknown }).triggers).toEqual({ keywords: ['x'] });
    }
  });

  it('reports the path of a bad upstream entry', () => {
    const result = optionalSkillFieldsSchema.safeParse({ metadata: { upstream: [{ ...github, source: 'npm' }] } });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path.join('.')).toBe('metadata.upstream.0.source');
  });

  it('still accepts skills with no metadata block', () => {
    expect(optionalSkillFieldsSchema.safeParse({ version: '1.0.0' }).success).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd cli && pnpm vitest run src/schemas/__tests__/skill-frontmatter.spec.ts`
Expected: FAIL, `upstreamEntrySchema` is not exported.

- [ ] **Step 3: Add the schema**

Insert after `skillSignatureSchema` (line 39) in `cli/src/schemas/skill-frontmatter.ts`:

```ts
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const GITHUB_REPO_RE = /^[\w.-]+\/[\w.-]+$/;

/**
 * One upstream dependency a skill (or, in skills/metadata.json, a category)
 * tracks for freshness auditing. `source: github` needs a `repo`;
 * `source: manual` is checked only by its `reviewed` age.
 * See docs/FRESHNESS.md.
 */
export const upstreamEntrySchema = z
  .object({
    name: z.string().min(1),
    source: z.enum(['github', 'manual']),
    repo: z
      .string()
      .regex(GITHUB_REPO_RE, 'repo must be "owner/name"')
      .optional(),
    pinned: z.string().min(1),
    tag_pattern: z.string().min(1).optional(),
    reviewed: z.string().regex(ISO_DATE_RE, 'reviewed must be YYYY-MM-DD'),
  })
  .strict()
  .refine((e) => e.source !== 'github' || Boolean(e.repo), {
    message: 'repo is required when source is "github"',
    path: ['repo'],
  });
```

Inside `optionalSkillFieldsSchema`, after the `signature:` line add:

```ts
  /**
   * `metadata` also carries `triggers` (validated by TriggersRule) — passthrough
   * keeps those keys intact while `upstream` gets schema-checked here.
   */
  metadata: z
    .object({ upstream: z.array(upstreamEntrySchema).optional() })
    .passthrough()
    .optional(),
```

- [ ] **Step 4: Type the category field**

In `cli/src/models/types.ts`, before `CategoryMetadata` add:

```ts
/**
 * Upstream dependency pin used by the freshness audit
 * (scripts/freshness). Mirrors `upstreamEntrySchema` in
 * cli/src/schemas/skill-frontmatter.ts.
 */
export interface UpstreamEntry {
  name: string;
  source: 'github' | 'manual';
  repo?: string;
  pinned: string;
  tag_pattern?: string;
  reviewed: string;
}
```

And inside `CategoryMetadata` after `owners?: string[];`:

```ts
  /** Upstream pins the category's skills were reviewed against. */
  upstream?: UpstreamEntry[];
```

- [ ] **Step 5: Run test to verify it passes, then the full CLI suite and lint**

Run: `cd cli && pnpm vitest run src/schemas/__tests__/skill-frontmatter.spec.ts && pnpm test && pnpm lint`
Expected: new spec 6 passing; existing suite unchanged; lint clean.

- [ ] **Step 6: Commit**

```bash
git add cli/src/schemas/skill-frontmatter.ts cli/src/schemas/__tests__/skill-frontmatter.spec.ts cli/src/models/types.ts
git commit -m "feat(cli): validate metadata.upstream pins in SKILL.md frontmatter"
```

---

### Task 8: Seed pins in metadata.json and six skills

**Files:**
- Modify: `skills/metadata.json` (each entry under `categories.<cat>`, add `upstream` after `owners`)
- Modify: `skills/database/database-postgresql/SKILL.md`, `skills/database/database-redis/SKILL.md`, `skills/database/database-mongodb/SKILL.md`, `skills/database/database-hana/SKILL.md`, `skills/android/android-agp-upgrade/SKILL.md`, `skills/flutter/flutter-bloc-state-management/SKILL.md` (frontmatter `metadata.upstream`)

**Interfaces:**
- Consumes: entry shape from `upstreamEntrySchema` / `isUpstreamEntry`.
- Produces: a repo state where `pnpm freshness:audit` reports zero `missing-pin`.

`pinned` means "the version this skill content was reviewed against", not the newest release. Values below match what the skill bodies claim today, so the audit starts with few `claim-*` issues. `reviewed` = the category's framework-map `Reviewed:` date when one exists, else the category `last_updated`.

- [ ] **Step 1: Add category pins**

Use a script rather than hand-editing 20 JSON blocks. Run from the worktree root:

```bash
node --import tsx -e '
const fs = require("fs-extra");
const p = "skills/metadata.json";
const m = fs.readJsonSync(p);
const gh = (name, repo, pinned, tag_pattern, reviewed) => ({ name, source: "github", repo, pinned, tag_pattern, reviewed });
const manual = (name, pinned, reviewed) => ({ name, source: "manual", pinned, reviewed });
const seed = {
  typescript: [gh("typescript", "microsoft/TypeScript", "5.8.0", "^v(\\d+\\.\\d+\\.\\d+)$", "2026-07-15")],
  javascript: [gh("node", "nodejs/node", "22.0.0", "^v(\\d+\\.\\d+\\.\\d+)$", "2026-07-15")],
  react: [gh("react", "facebook/react", "19.1.0", "^v(\\d+\\.\\d+\\.\\d+)$", "2026-06-17")],
  "react-native": [gh("react-native", "facebook/react-native", "0.79.0", "^v(\\d+\\.\\d+\\.\\d+)$", "2026-07-09")],
  nextjs: [gh("next", "vercel/next.js", "15.3.0", "^v(\\d+\\.\\d+\\.\\d+)$", "2026-06-17")],
  nestjs: [gh("nestjs", "nestjs/nest", "11.0.0", "^v(\\d+\\.\\d+\\.\\d+)$", "2026-06-17")],
  angular: [gh("angular", "angular/angular", "20.0.0", "^(\\d+\\.\\d+\\.\\d+)$", "2026-07-09")],
  flutter: [gh("flutter", "flutter/flutter", "3.32.0", "^(\\d+\\.\\d+\\.\\d+)$", "2026-07-09")],
  dart: [gh("dart", "dart-lang/sdk", "3.8.0", "^(\\d+\\.\\d+\\.\\d+)$", "2026-07-15")],
  golang: [gh("go", "golang/go", "1.24.0", "^go(\\d+\\.\\d+(?:\\.\\d+)?)$", "2026-06-17")],
  python: [gh("python", "python/cpython", "3.13.0", "^v(\\d+\\.\\d+\\.\\d+)$", "2026-06-29")],
  php: [gh("php", "php/php-src", "8.4.0", "^php-(\\d+\\.\\d+\\.\\d+)$", "2026-05-16")],
  laravel: [gh("laravel", "laravel/framework", "12.0.0", "^v(\\d+\\.\\d+\\.\\d+)$", "2026-07-09")],
  kotlin: [gh("kotlin", "JetBrains/kotlin", "2.1.0", "^v(\\d+\\.\\d+\\.\\d+)$", "2026-07-15")],
  java: [gh("java", "openjdk/jdk", "21", "^jdk-(\\d+)-ga$", "2026-07-15")],
  "spring-boot": [gh("spring-boot", "spring-projects/spring-boot", "3.4.0", "^v(\\d+\\.\\d+\\.\\d+)$", "2026-07-09")],
  swift: [gh("swift", "swiftlang/swift", "6.1.0", "^swift-(\\d+\\.\\d+(?:\\.\\d+)?)-RELEASE$", "2026-07-15")],
  android: [manual("android", "15", "2026-07-09"), manual("agp", "9.0.0", "2026-07-09"), gh("gradle", "gradle/gradle", "8.14.0", "^v(\\d+\\.\\d+(?:\\.\\d+)?)$", "2026-07-09")],
  ios: [manual("ios", "18", "2026-07-09"), manual("xcode", "16", "2026-07-09")],
  "quality-engineering": [gh("playwright", "microsoft/playwright", "1.52.0", "^v(\\d+\\.\\d+\\.\\d+)$", "2026-09-06")],
};
for (const [cat, entries] of Object.entries(seed)) {
  if (!m.categories[cat]) throw new Error("unknown category " + cat);
  m.categories[cat].upstream = entries;
}
fs.writeFileSync(p, JSON.stringify(m, null, 2) + "\n");
console.log("seeded", Object.keys(seed).length, "categories");
'
```

Then confirm `database`, `common`, `specialists`, `system-design` have no `upstream` key: `node -e 'const m=require("./skills/metadata.json");console.log(Object.entries(m.categories).filter(([,c])=>!c.upstream).map(([k])=>k))'` → `[ 'common', 'specialists', 'system-design', 'database' ]`.

- [ ] **Step 2: Add per-skill pins**

Insert into each SKILL.md frontmatter under `metadata:` as a sibling of `triggers:` (keep 2-space indentation; place `upstream:` after the `triggers:` block). Exact blocks:

`skills/database/database-postgresql/SKILL.md`:
```yaml
  upstream:
    - name: postgresql
      source: github
      repo: postgres/postgres
      pinned: "17"
      tag_pattern: "^REL_(\\d+)_(\\d+)$"
      reviewed: "2026-06-17"
```

`skills/database/database-redis/SKILL.md`:
```yaml
  upstream:
    - name: redis
      source: github
      repo: redis/redis
      pinned: "7.4.0"
      tag_pattern: "^(\\d+\\.\\d+\\.\\d+)$"
      reviewed: "2026-06-17"
```

`skills/database/database-mongodb/SKILL.md`:
```yaml
  upstream:
    - name: mongodb
      source: github
      repo: mongodb/mongo
      pinned: "8.0.0"
      tag_pattern: "^r(\\d+\\.\\d+\\.\\d+)$"
      reviewed: "2026-06-17"
```

`skills/database/database-hana/SKILL.md`:
```yaml
  upstream:
    - name: hana
      source: manual
      pinned: "2.0"
      reviewed: "2026-08-24"
```

`skills/android/android-agp-upgrade/SKILL.md`:
```yaml
  upstream:
    - name: agp
      source: manual
      pinned: "9.0.0"
      reviewed: "2026-07-09"
```

`skills/flutter/flutter-bloc-state-management/SKILL.md`:
```yaml
  upstream:
    - name: bloc
      source: github
      repo: felangel/bloc
      pinned: "9.0.0"
      tag_pattern: "^v(\\d+\\.\\d+\\.\\d+)$"
      reviewed: "2026-07-09"
```

If a skill's frontmatter has no `metadata:` block, add `metadata:` with the `upstream:` list under it. Check each file's current frontmatter with `sed -n 1,20p <file>` before editing.

- [ ] **Step 3: Validate the seeded files against every consumer**

Run:
```bash
pnpm validate && pnpm generate-indices >/dev/null && git diff --stat -- skills/*/_INDEX.md AGENTS.md | tail -1
pnpm --filter ./mcp test 2>&1 | tail -3
pnpm freshness:audit
```
Expected: `pnpm validate` passes (the six SKILL.md files validate under the new schema). `generate-indices` produces no `_INDEX.md`/`AGENTS.md` diff beyond what the pre-commit hook already regenerates. MCP tests pass. `freshness:audit` reports zero `missing-pin`. Expected remaining issues: one `reviewed-stale` for `php` (reviewed 2026-05-16, 121 days), a handful of `claim-behind-pin` (e.g. `iOS 17`, `PHP 8`, `PHP 7`, `Go 1.21` written without `+`), and zero `reviewed-mismatch` because the seed reuses each framework-map date.

- [ ] **Step 4: Triage the baseline claim issues**

Run `pnpm freshness:audit | grep claim-` and for each hit decide:
- `claim-ahead-of-pin`: the skill already documents a newer version → raise the pin in metadata.json to that version.
- `claim-behind-pin` where the text is a floor missing `+` (e.g. "Java 21" meaning 21 and later): leave the text; the issue stays in the baseline list for the skill owner. Do not mass-edit skill bodies in this task.
Record the final list (type, skill, file:line) for the docs task.

- [ ] **Step 5: Commit**

```bash
git add skills/metadata.json skills/database/database-postgresql/SKILL.md skills/database/database-redis/SKILL.md skills/database/database-mongodb/SKILL.md skills/database/database-hana/SKILL.md skills/android/android-agp-upgrade/SKILL.md skills/flutter/flutter-bloc-state-management/SKILL.md
git commit -m "feat(skills): seed upstream pins for 20 categories and 6 skills"
```

The pre-commit hook will regenerate indices and mirrors; include whatever it stages.

---

### Task 9: CI gate, validate:all, docs

**Files:**
- Modify: `package.json` line 39 (`validate:all`)
- Modify: `.github/workflows/ci.yml` after line 107 (`Eval Alignment Gate` step)
- Create: `docs/FRESHNESS.md`
- Modify: `CONTRIBUTING.md` §6 (quality gates list, around lines 82-128)
- Modify: `skills/common/common-skill-creator/references/lifecycle.md` (Phase 5 iteration triggers)

- [ ] **Step 1: Wire validate:all**

Change in `package.json`:
```json
"validate:all": "pnpm --filter ./cli validate:all && pnpm audit:skills && pnpm audit:injection && pnpm freshness:audit",
```

- [ ] **Step 2: Add the CI step**

In `.github/workflows/ci.yml`, after:
```yaml
      - name: Eval Alignment Gate
        run: pnpm check-alignment
```
add:
```yaml
      - name: Skill Freshness Audit (offline)
        run: pnpm freshness:audit
```

- [ ] **Step 3: Write `docs/FRESHNESS.md`**

```markdown
# Skill Freshness

How the registry notices that a language, framework, or database skill has fallen behind its upstream.

Design: `docs/superpowers/specs/2026-09-13-skill-freshness-design.md`.

## Pins

Every version-sensitive category declares what its skills were reviewed against in `skills/metadata.json`:

```json
"nextjs": {
  "upstream": [
    { "name": "next", "source": "github", "repo": "vercel/next.js",
      "pinned": "15.3.0", "tag_pattern": "^v(\\d+\\.\\d+\\.\\d+)$",
      "reviewed": "2026-06-17" }
  ]
}
```

| field | meaning |
|---|---|
| `name` | stable key; also selects the regex in `scripts/freshness/claims.ts` that finds version claims in prose |
| `source` | `github` (releases, then tags) or `manual` (only the review date is checked) |
| `repo` | `owner/name`; required for `github` |
| `pinned` | version the skill content was reviewed against, not the newest release |
| `tag_pattern` | regex whose capture groups form the version; used by the network check |
| `reviewed` | `YYYY-MM-DD` of the last human review |

A skill that tracks something its category does not (a library, a database engine) adds the same shape under `metadata.upstream` in its `SKILL.md` frontmatter. A skill entry with the same `name` as a category entry overrides it.

Categories `common`, `specialists`, and `system-design` are version-agnostic and carry no pins.

## Commands

| command | what it does | writes files |
|---|---|---|
| `pnpm freshness:audit` | offline rules (below); runs in PR CI and `validate:all` | no (`--write` to save) |
| `pnpm freshness:audit --strict` | same, exit 1 on any `claim-*` or `missing-pin` | no |
| `pnpm freshness:report` | re-render Markdown from the last JSON | `benchmarks/freshness/freshness-report.md` |
| `pnpm freshness:audit --stale-days 90` | change the review-age threshold (default 120) | — |

Reports land in `benchmarks/freshness/` (gitignored).

## Issue types

| type | severity | rule |
|---|---|---|
| `claim-ahead-of-pin` | med | prose claims a newer version than the pin: bump the pin |
| `claim-behind-pin` | med | prose claims an older version and is not a floor (`15+`): update guidance or add `+` |
| `reviewed-stale` | med | pin `reviewed` older than the threshold |
| `reviewed-mismatch` | low | `framework-map.md` `Reviewed:` differs from the pin date |
| `missing-pin` | low | version-sensitive category with no `upstream` |
| `upstream-major-drift` | high | (network check, phase 2) upstream major newer than pin |
| `upstream-minor-drift` | low | (network check, phase 2) |
| `fetch-failed` | warn | (network check, phase 2) never gates |

## Reviewing a category

1. Read the upstream release notes since `pinned`.
2. Update the affected `SKILL.md` and `references/*.md`.
3. Set `pinned` to the version you reviewed against and `reviewed` to today, in `skills/metadata.json` (and the category `framework-map.md` `Reviewed:` line).
4. Run `pnpm freshness:audit --strict` and `pnpm check-alignment`.

## Baseline (2026-09-14)

Issues present when the gate landed; strict mode stays off until this list is empty.

<paste the output of `pnpm freshness:audit` from Task 8 Step 4 here, one line per issue>
```

Replace the last placeholder line with the real audit output before committing.

- [ ] **Step 4: CONTRIBUTING and lifecycle pointers**

In `CONTRIBUTING.md` §6, next to the `pnpm check-alignment` bullet add:

```markdown
- `pnpm freshness:audit` — upstream pin and version-claim consistency (see `docs/FRESHNESS.md`)
```

In `skills/common/common-skill-creator/references/lifecycle.md`, under the Phase 5 iteration triggers list, add one bullet:

```markdown
- The freshness audit (`pnpm freshness:audit`, `docs/FRESHNESS.md`) reports a `claim-*` or `reviewed-stale` issue for the skill.
```

- [ ] **Step 5: Full verification**

Run:
```bash
pnpm lint && pnpm test && pnpm validate:all
pnpm check-alignment | tail -3
pnpm evals:preflight | tail -1; pnpm audit:skills | tail -1
```
Expected: lint clean; CLI vitest + evals + freshness tests green; `validate:all` ends with the freshness summary line and exit 0. `check-alignment`, `evals:preflight`, `audit:skills` counts equal the pre-change baseline (2 alignment, 42 preflight per memory; confirm against `git stash`-free comparison by running the same commands on `origin/develop` if numbers differ).

- [ ] **Step 6: Commit**

```bash
git add package.json .github/workflows/ci.yml docs/FRESHNESS.md CONTRIBUTING.md skills/common/common-skill-creator/references/lifecycle.md
git commit -m "ci(freshness): offline audit gate, validate:all wiring, docs"
```

- [ ] **Step 7: Open the PR**

```bash
git push -u origin feat/skill-freshness
gh pr create --base develop --title "feat(freshness): upstream pins and offline skill freshness audit (P1)" --body-file - <<'EOF'
## Summary
- `upstream[]` pins per category in `skills/metadata.json` (20 categories) and per-skill `metadata.upstream` for 6 skills, validated by a new zod schema in the CLI
- `scripts/freshness/` offline audit: missing pins, stale reviews, framework-map date mismatch, version claims vs pins; JSON + Markdown report
- `pnpm freshness:audit` in `validate:all` and PR CI (non-strict until baseline clears)
- `docs/FRESHNESS.md` with baseline

Spec: `docs/superpowers/specs/2026-09-13-skill-freshness-design.md`. P2 (GitHub releases check + weekly cron) follows.

## Test plan
- [ ] `pnpm test` (CLI vitest incl. new schema spec, evals, freshness)
- [ ] `pnpm validate:all` exit 0
- [ ] `pnpm freshness:audit --write` produces both report files, gitignored
- [ ] existing gate counts unchanged (`check-alignment`, `evals:preflight`, `audit:skills`)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Syp1r29csWEJpssYviqxgc
EOF
```

---

## Self-review notes

- Spec coverage: §1 data model → Tasks 3, 7, 8. §2 detection (`audit`, `report`, flags, issue table minus network types) → Tasks 4, 5, 6. §3 wiring (package, ci.yml, gitignore, schema, docs) → Tasks 6, 7, 9. §2 `check`, new cron workflow, SECURITY.md row → P2 plan (deliberately out of scope). §4 and §5 → P3/P4.
- Type consistency: `EffectivePin.origin`, `VersionClaim.floor`, `FreshnessIssue.skillName` (empty string for category-level), `buildReport(action, staleDays, issues, upstream, generatedAt?)` used identically in Tasks 5, 6, 9.
- Test count: 6 files, 19 assertions-level tests in scripts; 6 vitest cases in cli.
