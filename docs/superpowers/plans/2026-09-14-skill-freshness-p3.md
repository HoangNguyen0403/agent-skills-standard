# Skill Freshness P3 (internal signals + acknowledged drift + improve-next ranking) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Feed the freshness report with the repo's own quality signals (eval remediation queue, agent learning log), let a reviewed-but-not-yet-updated pin acknowledge known upstream drift, and rank the skills to improve next at the top of the report.

**Architecture:** New `scripts/freshness/signals/` folder with two pure readers (`evals.ts`, `learning-log.ts`) that turn repo files into `FreshnessIssue[]`; a `--internal` flag on `audit` and `check` appends them. `check.ts` learns an optional `acknowledged` pin field that downgrades known drift to `low`. `report.ts` gains a scoring function and an "Improve next" block. Two skills (`common-learning-log`, `common-session-retrospective`) get a one-line convention so future log entries name the skills they touch.

**Tech Stack:** TypeScript via `tsx`, `fs-extra`, `node:test`; zod in `cli/`.

**Spec:** `docs/superpowers/specs/2026-09-13-skill-freshness-design.md` §4 (internal signals). The `acknowledged` field and the score ranking come from the P2 final review's recommendations (recorded in the P2 PR #194 description as P3 follow-ups).

## Global Constraints

- Node `>=20`; scripts run with `node --import tsx`, no typecheck on `scripts/`.
- `scripts/freshness/` never imports from `cli/`.
- Every exported symbol has JSDoc.
- Tests: `node:test` + `node:assert/strict`, temp-dir fixtures, no network.
- `audit` stays write-free by default; `--internal` is opt-in on both `audit` and `check`; missing signal files are not errors (no queue / no log → zero signal issues).
- New severities: `eval-outdated` med, `eval-remediation` low, `learning-log-gap` low. Acknowledged `upstream-major-drift` becomes `low` (type unchanged) and therefore no longer fails `check`.
- `isStrictBlocking` unchanged: signal issues never block `--strict`.
- Branch `feat/skill-freshness-p3` stacked on `feat/skill-freshness-p2` (PR #194); PR base is `feat/skill-freshness-p2` until #194 merges. Worktree `/Users/nguyenhuyhoang/OtherProjects/agent-skills-standard-freshness-p3`.
- Commit messages: Conventional Commits with the session attribution trailer.

---

## File Map

| Path | Responsibility |
|---|---|
| `scripts/freshness/types.ts` | `IssueType` += `eval-outdated`, `eval-remediation`, `learning-log-gap`; `UpstreamEntry.acknowledged?` |
| `scripts/freshness/signals/evals.ts` | `readRemediationQueue`, `evalSignalIssues` |
| `scripts/freshness/signals/learning-log.ts` | `parseLearningLog`, `learningLogIssues` |
| `scripts/freshness/signals/evals.test.ts`, `signals/learning-log.test.ts` | tests |
| `scripts/freshness/pins.ts` | `isUpstreamEntry` accepts `acknowledged` |
| `scripts/freshness/check.ts` | `driftIssue` honors `acknowledged` |
| `scripts/freshness/report.ts` | `scoreTargets`, "Improve next" block |
| `scripts/freshness/index.ts` | `--internal`, `--window-days` |
| `cli/src/schemas/skill-frontmatter.ts`, `cli/src/models/types.ts` | `acknowledged` |
| `skills/common/common-learning-log/references/log-format.md`, `skills/common/common-session-retrospective/SKILL.md` | `**Skills**:` convention |
| `.github/workflows/skill-freshness.yml` | `--internal` |
| `docs/FRESHNESS.md`, `package.json` (`test:freshness` glob) | docs, test glob |

---

### Task 1: Eval remediation-queue signal

**Files:**
- Modify: `scripts/freshness/types.ts` (IssueType union)
- Create: `scripts/freshness/signals/evals.ts`
- Test: `scripts/freshness/signals/evals.test.ts`
- Modify: `package.json` (`test:freshness` glob)

**Interfaces:**
- Produces: `interface RemediationQueueFile { runId: string; generatedAt: string; scope?: string; items: RemediationItem[] }`, `interface RemediationItem { category: string; skillName: string; caseId: string; arm: string; classification: string; evidence: string }`.
- Produces: `readRemediationQueue(repoRoot: string): RemediationQueueFile | null` — reads `benchmarks/evals/remediation-queue.json`; `null` when absent or unparsable.
- Produces: `evalSignalIssues(queue: RemediationQueueFile | null): FreshnessIssue[]` — one issue per `(category, skillName, classification)`: classification `outdated domain expectation` → `eval-outdated` (med); every other classification → `eval-remediation` (low). Message carries the count, the classification, the run id, and up to three `caseId`s.

- [ ] **Step 1: Extend `IssueType`**

In `scripts/freshness/types.ts` add to the `IssueType` union after `"fetch-failed"`:
```ts
  | "eval-outdated"
  | "eval-remediation"
  | "learning-log-gap";
```

- [ ] **Step 2: Write the failing test**

```ts
// scripts/freshness/signals/evals.test.ts
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import fs from "fs-extra";
import { evalSignalIssues, readRemediationQueue } from "./evals";

const queue = {
  runId: "all-v2.6.0-final-136",
  generatedAt: "2026-07-14T11:08:42.740Z",
  scope: "strict-release-blockers",
  items: [
    { category: "android", skillName: "android-resources", caseId: "eval-3", arm: "with-skill", classification: "guidance present but insufficiently actionable", evidence: "contains:density" },
    { category: "android", skillName: "android-resources", caseId: "eval-5", arm: "with-skill", classification: "guidance present but insufficiently actionable", evidence: "contains:dp" },
    { category: "nextjs", skillName: "nextjs-caching", caseId: "eval-1", arm: "with-skill", classification: "outdated domain expectation", evidence: "contains:unstable_cache" },
    { category: "nextjs", skillName: "nextjs-caching", caseId: "eval-2", arm: "with-skill", classification: "missing skill guidance", evidence: "contains:cacheLife" },
  ],
};

test("readRemediationQueue returns null when the file is missing or invalid", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ags-evals-sig-"));
  try {
    assert.equal(readRemediationQueue(root), null);
    await fs.outputFile(path.join(root, "benchmarks", "evals", "remediation-queue.json"), "{not json");
    assert.equal(readRemediationQueue(root), null);
    await fs.writeJson(path.join(root, "benchmarks", "evals", "remediation-queue.json"), queue);
    assert.equal(readRemediationQueue(root)?.items.length, 4);
  } finally {
    await fs.remove(root);
  }
});

test("evalSignalIssues groups by skill and classification with the right severities", () => {
  const issues = evalSignalIssues(queue);
  const keys = issues.map((i) => `${i.type}:${i.category}:${i.skillName}:${i.severity}`).sort();
  assert.deepEqual(keys, [
    "eval-outdated:nextjs:nextjs-caching:med",
    "eval-remediation:android:android-resources:low",
    "eval-remediation:nextjs:nextjs-caching:low",
  ]);
  const android = issues.find((i) => i.category === "android");
  assert.match(android?.message ?? "", /2 failing eval case\(s\)/);
  assert.match(android?.message ?? "", /eval-3, eval-5/);
  assert.match(android?.message ?? "", /all-v2\.6\.0-final-136/);
  assert.equal(android?.file, "benchmarks/evals/remediation-queue.json");
  assert.deepEqual(evalSignalIssues(null), []);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --import tsx --test scripts/freshness/signals/evals.test.ts`
Expected: FAIL, cannot find module `./evals`.

- [ ] **Step 4: Write `signals/evals.ts`**

```ts
// scripts/freshness/signals/evals.ts
import fs from "fs-extra";
import path from "path";
import type { FreshnessIssue } from "../types";

/** One failed-assertion triage row from scripts/evals/quality.ts `queue`. */
export interface RemediationItem {
  category: string;
  skillName: string;
  caseId: string;
  arm: string;
  classification: string;
  evidence: string;
}

/** Shape of benchmarks/evals/remediation-queue.json. */
export interface RemediationQueueFile {
  runId: string;
  generatedAt: string;
  scope?: string;
  items: RemediationItem[];
}

/** Repo-relative path of the queue file. */
export const REMEDIATION_QUEUE_PATH = "benchmarks/evals/remediation-queue.json";

const OUTDATED = "outdated domain expectation";

/**
 * Reads the last remediation queue. Returns null when the file is absent
 * or not a valid queue, so the signal is simply empty on a fresh clone.
 */
export function readRemediationQueue(repoRoot: string): RemediationQueueFile | null {
  const file = path.join(repoRoot, REMEDIATION_QUEUE_PATH);
  if (!fs.existsSync(file)) return null;
  try {
    const data = fs.readJsonSync(file) as Partial<RemediationQueueFile>;
    if (!data || typeof data.runId !== "string" || !Array.isArray(data.items)) return null;
    return {
      runId: data.runId,
      generatedAt: typeof data.generatedAt === "string" ? data.generatedAt : "",
      scope: data.scope,
      items: data.items.filter(
        (i): i is RemediationItem =>
          !!i && typeof i.category === "string" && typeof i.skillName === "string" && typeof i.classification === "string",
      ),
    };
  } catch {
    return null;
  }
}

/**
 * One issue per (category, skill, classification). "outdated domain
 * expectation" is the eval runner's own stale-content verdict and is
 * reported at med; every other classification is a low "this skill is
 * weak" signal.
 */
export function evalSignalIssues(queue: RemediationQueueFile | null): FreshnessIssue[] {
  if (!queue) return [];
  const groups = new Map<string, { item: RemediationItem; cases: string[] }>();
  for (const item of queue.items) {
    const key = `${item.category}:${item.skillName}:${item.classification}`;
    const group = groups.get(key);
    if (group) group.cases.push(item.caseId);
    else groups.set(key, { item, cases: [item.caseId] });
  }
  const issues: FreshnessIssue[] = [];
  for (const { item, cases } of groups.values()) {
    const outdated = item.classification === OUTDATED;
    const shown = cases.slice(0, 3).join(", ") + (cases.length > 3 ? ", …" : "");
    issues.push({
      type: outdated ? "eval-outdated" : "eval-remediation",
      severity: outdated ? "med" : "low",
      category: item.category,
      skillName: item.skillName,
      message: `${cases.length} failing eval case(s) classified "${item.classification}" in run ${queue.runId} (${shown})`,
      file: REMEDIATION_QUEUE_PATH,
    });
  }
  return issues;
}
```

- [ ] **Step 5: Test glob**

In `package.json` change `"test:freshness": "node --import tsx --test scripts/freshness/*.test.ts"` to `"test:freshness": "node --import tsx --test scripts/freshness/*.test.ts scripts/freshness/signals/*.test.ts"`.

- [ ] **Step 6: Run tests**

Run: `node --import tsx --test scripts/freshness/signals/evals.test.ts` → 2 passing. Then `pnpm test:freshness` → 39 passing.

- [ ] **Step 7: Commit**

```bash
git add scripts/freshness/types.ts scripts/freshness/signals/evals.ts scripts/freshness/signals/evals.test.ts package.json
git commit -m "feat(freshness): eval remediation-queue signal"
```

---

### Task 2: Learning-log signal

**Files:**
- Create: `scripts/freshness/signals/learning-log.ts`
- Test: `scripts/freshness/signals/learning-log.test.ts`

**Interfaces:**
- Produces: `interface LearningLogEntry { iteration: number; date: string; task: string; signal: string; skills: string[]; line: number }`.
- Produces: `parseLearningLog(text: string, knownSkills: ReadonlySet<string>): LearningLogEntry[]` — splits on `## Agent Learning Log: Iteration #N` headings; reads `**Date**: YYYY-MM-DD | **Task**: …` and `**Signal**: …`; `skills` = union of (a) the optional `**Skills**: cat/skill, cat/skill` line and (b) any `category/skill-name` token in the entry body that is in `knownSkills`. Dedupe, keep order of first appearance.
- Produces: `learningLogIssues(entries: LearningLogEntry[], options: { today: Date; windowDays: number }): FreshnessIssue[]` — one `learning-log-gap` (low) per skill named by ≥1 entry dated within `windowDays`; message lists iteration numbers; `file: "AGENTS_LEARNING.md"`, `line` = first matching entry's heading line.
- Produces: `readLearningLog(repoRoot: string): string | null`.

- [ ] **Step 1: Write the failing test**

```ts
// scripts/freshness/signals/learning-log.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { learningLogIssues, parseLearningLog } from "./learning-log";

const known = new Set(["nextjs/nextjs-caching", "golang/golang-logging", "common/common-tdd"]);

const log = `# Agent Learning Log

Do not edit past entries; append only.

---

## Agent Learning Log: Iteration #1

**Date**: 2026-05-08 | **Task**: Consolidate folders.
**Signal**: User correction

### ❌ Mistake Made
Touched \`.antigravity/mcp_config.json\` without checking.

---

## Agent Learning Log: Iteration #2

**Date**: 2026-09-01 | **Task**: Fix caching guidance.
**Signal**: Session retrospective
**Skills**: nextjs/nextjs-caching, golang/golang-logging

### ❌ Mistake Made
Recommended unstable_cache; nextjs/nextjs-caching still documents it.

---

## Agent Learning Log: Iteration #3

**Date**: 2026-09-10 | **Task**: Logging.
**Signal**: User correction

### ✅ Better Approach
Follow \`golang/golang-logging\` and ignore made-up/skill-id.
`;

test("parseLearningLog reads headings, dates, explicit Skills line, and known skill mentions", () => {
  const entries = parseLearningLog(log, known);
  assert.deepEqual(
    entries.map((e) => [e.iteration, e.date, e.signal, e.skills, e.line]),
    [
      [1, "2026-05-08", "User correction", [], 7],
      [2, "2026-09-01", "Session retrospective", ["nextjs/nextjs-caching", "golang/golang-logging"], 17],
      [3, "2026-09-10", "User correction", ["golang/golang-logging"], 28],
    ],
  );
  assert.equal(entries[1].task, "Fix caching guidance.");
});

test("learningLogIssues counts entries per skill inside the window", () => {
  const entries = parseLearningLog(log, known);
  const issues = learningLogIssues(entries, { today: new Date("2026-09-14T00:00:00Z"), windowDays: 90 });
  const byKey = Object.fromEntries(issues.map((i) => [`${i.category}/${i.skillName}`, i]));
  assert.deepEqual(Object.keys(byKey).sort(), ["golang/golang-logging", "nextjs/nextjs-caching"]);
  assert.equal(byKey["golang/golang-logging"].severity, "low");
  assert.equal(byKey["golang/golang-logging"].type, "learning-log-gap");
  assert.match(byKey["golang/golang-logging"].message, /2 learning-log entr/);
  assert.match(byKey["golang/golang-logging"].message, /#2, #3/);
  assert.equal(byKey["golang/golang-logging"].file, "AGENTS_LEARNING.md");
  assert.equal(byKey["golang/golang-logging"].line, 17);
  // Iteration #1 is outside the window and names no skill anyway.
  assert.equal(learningLogIssues(entries, { today: new Date("2026-09-14T00:00:00Z"), windowDays: 5 }).length, 1);
});

test("parseLearningLog returns an empty list for text without entries", () => {
  assert.deepEqual(parseLearningLog("# nothing here\n", known), []);
});
```

Line numbers in the fixture: the template literal's first line is line 1 (`# Agent Learning Log`), so `## … Iteration #1` is line 7, `#2` is line 17, `#3` is line 28. Count them before running; if the fixture text is edited, adjust.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test scripts/freshness/signals/learning-log.test.ts`
Expected: FAIL, cannot find module `./learning-log`.

- [ ] **Step 3: Write `signals/learning-log.ts`**

```ts
// scripts/freshness/signals/learning-log.ts
import fs from "fs-extra";
import path from "path";
import { daysBetween } from "../audit";
import type { FreshnessIssue } from "../types";

/** One `## Agent Learning Log: Iteration #N` block. */
export interface LearningLogEntry {
  iteration: number;
  /** YYYY-MM-DD from the `**Date**:` line, or "" when missing. */
  date: string;
  task: string;
  signal: string;
  /** `category/skill` ids this entry concerns (explicit line ∪ known mentions). */
  skills: string[];
  /** 1-based line of the heading. */
  line: number;
}

/** Repo-relative path of the log. */
export const LEARNING_LOG_PATH = "AGENTS_LEARNING.md";

const HEADING_RE = /^## Agent Learning Log: Iteration #(\d+)\s*$/;
const DATE_RE = /^\*\*Date\*\*:\s*(\d{4}-\d{2}-\d{2})(?:\s*\|\s*\*\*Task\*\*:\s*(.*))?$/;
const SIGNAL_RE = /^\*\*Signal\*\*:\s*(.+?)\s*$/;
const SKILLS_RE = /^\*\*Skills\*\*:\s*(.+?)\s*$/;
const SKILL_ID_RE = /[a-z0-9-]+\/[a-z0-9-]+/g;

/** Reads AGENTS_LEARNING.md; null when the repo has none. */
export function readLearningLog(repoRoot: string): string | null {
  const file = path.join(repoRoot, LEARNING_LOG_PATH);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
}

/**
 * Splits the log into iterations. Skills are collected from an explicit
 * `**Skills**:` line and from any `category/skill` token in the body
 * that names a skill in `knownSkills` (so older entries count too).
 */
export function parseLearningLog(text: string, knownSkills: ReadonlySet<string>): LearningLogEntry[] {
  const lines = text.split(/\r?\n/);
  const entries: LearningLogEntry[] = [];
  let current: LearningLogEntry | null = null;
  const add = (entry: LearningLogEntry, id: string) => {
    if (!entry.skills.includes(id)) entry.skills.push(id);
  };
  lines.forEach((raw, index) => {
    const line = raw.trimEnd();
    const heading = line.match(HEADING_RE);
    if (heading) {
      current = { iteration: Number(heading[1]), date: "", task: "", signal: "", skills: [], line: index + 1 };
      entries.push(current);
      return;
    }
    if (!current) return;
    const date = line.match(DATE_RE);
    if (date) {
      current.date = date[1];
      current.task = (date[2] ?? "").trim();
      return;
    }
    const signal = line.match(SIGNAL_RE);
    if (signal) {
      current.signal = signal[1];
      return;
    }
    const explicit = line.match(SKILLS_RE);
    if (explicit) {
      for (const id of explicit[1].split(",").map((s) => s.trim()).filter(Boolean)) add(current, id);
      return;
    }
    for (const id of line.match(SKILL_ID_RE) ?? []) {
      if (knownSkills.has(id)) add(current, id);
    }
  });
  return entries;
}

interface LearningLogOptions {
  today: Date;
  /** Entries older than this many days are ignored. */
  windowDays: number;
}

/** One low issue per skill named by at least one entry inside the window. */
export function learningLogIssues(entries: LearningLogEntry[], options: LearningLogOptions): FreshnessIssue[] {
  const bySkill = new Map<string, { iterations: number[]; line: number }>();
  for (const entry of entries) {
    if (!entry.date || daysBetween(entry.date, options.today) > options.windowDays) continue;
    for (const id of entry.skills) {
      const hit = bySkill.get(id);
      if (hit) hit.iterations.push(entry.iteration);
      else bySkill.set(id, { iterations: [entry.iteration], line: entry.line });
    }
  }
  const issues: FreshnessIssue[] = [];
  for (const [id, { iterations, line }] of bySkill) {
    const slash = id.indexOf("/");
    issues.push({
      type: "learning-log-gap",
      severity: "low",
      category: id.slice(0, slash),
      skillName: id.slice(slash + 1),
      message: `${iterations.length} learning-log entr${iterations.length === 1 ? "y" : "ies"} in the last ${options.windowDays} days name this skill (${iterations.map((n) => `#${n}`).join(", ")})`,
      file: LEARNING_LOG_PATH,
      line,
    });
  }
  return issues;
}
```

- [ ] **Step 4: Run tests**

Run: `node --import tsx --test scripts/freshness/signals/learning-log.test.ts` → 3 passing. `pnpm test:freshness` → 42.

- [ ] **Step 5: Commit**

```bash
git add scripts/freshness/signals/learning-log.ts scripts/freshness/signals/learning-log.test.ts
git commit -m "feat(freshness): learning-log signal with explicit Skills line and known-id mentions"
```

---

### Task 3: `acknowledged` pin field

**Files:**
- Modify: `scripts/freshness/types.ts` (`UpstreamEntry`), `scripts/freshness/pins.ts` (`isUpstreamEntry`), `scripts/freshness/check.ts` (`driftIssue`)
- Modify: `cli/src/schemas/skill-frontmatter.ts`, `cli/src/models/types.ts`
- Test: `scripts/freshness/check.test.ts`, `scripts/freshness/pins.test.ts`, `cli/src/schemas/__tests__/skill-frontmatter.spec.ts`

**Interfaces:**
- `UpstreamEntry.acknowledged?: string` — "we know upstream is at this version; the skill has not been re-reviewed yet". When `latest <= acknowledged`, `driftIssue` keeps the type but returns severity `low` with the suffix ` (acknowledged up to ${acknowledged}; review pending)`; when `latest > acknowledged`, normal behavior.

- [ ] **Step 1: Failing tests**

Append to `scripts/freshness/check.test.ts`:
```ts
test("driftIssue downgrades drift covered by an acknowledged version", () => {
  const rel = (version: string) => ({ version, tag: `v${version}`, publishedAt: null, url: "u" });
  const ack = pin({ acknowledged: "17.2.0" });
  assert.equal(driftIssue(ack, rel("17.0.0"))?.severity, "low");
  assert.equal(driftIssue(ack, rel("17.0.0"))?.type, "upstream-major-drift");
  assert.match(driftIssue(ack, rel("17.0.0"))?.message ?? "", /acknowledged up to 17\.2\.0/);
  assert.equal(driftIssue(ack, rel("17.2.0"))?.severity, "low");
  assert.equal(driftIssue(ack, rel("18.0.0"))?.severity, "high");
  assert.equal(driftIssue(pin({ acknowledged: "not-a-version" }), rel("17.0.0"))?.severity, "high");
});
```
Append to `scripts/freshness/pins.test.ts`:
```ts
test("isUpstreamEntry accepts an optional acknowledged string and rejects other types", () => {
  assert.equal(isUpstreamEntry({ ...next, acknowledged: "17.2.0" }), true);
  assert.equal(isUpstreamEntry({ ...next, acknowledged: 17 }), false);
});
```
Append to `cli/src/schemas/__tests__/skill-frontmatter.spec.ts` inside `describe('upstreamEntrySchema')`:
```ts
  it('accepts an optional acknowledged version string', () => {
    expect(upstreamEntrySchema.safeParse({ ...github, acknowledged: '17.2.0' }).success).toBe(true);
    expect(upstreamEntrySchema.safeParse({ ...github, acknowledged: 17 }).success).toBe(false);
  });
```

- [ ] **Step 2: Run to verify failures**

`node --import tsx --test scripts/freshness/check.test.ts scripts/freshness/pins.test.ts` → the two new tests fail. `cd cli && pnpm vitest run src/schemas/__tests__/skill-frontmatter.spec.ts` → new case fails (strict object rejects unknown key).

- [ ] **Step 3: Implement**

`scripts/freshness/types.ts`, in `UpstreamEntry` after `reviewed: string;`:
```ts
  /**
   * Newest upstream version the maintainers already know about but have
   * not re-reviewed the skill against. Drift up to this version reports
   * at low instead of high so the weekly job stays green while the review
   * is pending.
   */
  acknowledged?: string;
```

`scripts/freshness/pins.ts`, in `isUpstreamEntry` before `return true;`:
```ts
  if (v.acknowledged !== undefined && typeof v.acknowledged !== "string") return false;
```

`scripts/freshness/check.ts`, in `driftIssue`, replace the major-drift `return { … }` with:
```ts
    const acknowledged = pin.acknowledged ? parseVersion(pin.acknowledged) : null;
    const covered = acknowledged !== null && compareVersions(current, acknowledged) <= 0;
    return {
      ...base,
      type: "upstream-major-drift",
      severity: covered ? "low" : "high",
      message:
        `Upstream "${pin.name}" is at ${latest.version} (${latest.tag}); pin is ${pin.pinned}. ` +
        (covered
          ? `Acknowledged up to ${pin.acknowledged}; review pending: ${latest.url}`
          : `Review the skill(s) against the new release: ${latest.url}`),
    };
```
(The test matches `/acknowledged up to/` case-insensitively? No — it matches lowercase `acknowledged`. Use `acknowledged up to` lowercase in the message: `` `${...}. Drift acknowledged up to ${pin.acknowledged}; review pending: ${latest.url}` ``.)

`cli/src/schemas/skill-frontmatter.ts`, in `upstreamEntrySchema` after `reviewed:`:
```ts
    acknowledged: z.string().min(1).optional(),
```
`cli/src/models/types.ts`, in `UpstreamEntry` after `reviewed: string;`:
```ts
  /** Newest known upstream version not yet reviewed against; drift up to it reports low. */
  acknowledged?: string;
```

- [ ] **Step 4: Run tests**

`pnpm test:freshness` → 44. `cd cli && pnpm vitest run src/schemas/__tests__/skill-frontmatter.spec.ts && pnpm lint` → 7 passing, lint clean.

- [ ] **Step 5: Commit**

```bash
git add scripts/freshness/types.ts scripts/freshness/pins.ts scripts/freshness/check.ts scripts/freshness/check.test.ts scripts/freshness/pins.test.ts cli/src/schemas/skill-frontmatter.ts cli/src/schemas/__tests__/skill-frontmatter.spec.ts cli/src/models/types.ts
git commit -m "feat(freshness): acknowledged pin version downgrades known drift to low"
```

---

### Task 4: Score ranking and "Improve next" block

**Files:**
- Modify: `scripts/freshness/report.ts`
- Test: `scripts/freshness/report.test.ts`

**Interfaces:**
- Produces: `interface ScoredTarget { target: string; score: number; counts: Partial<Record<IssueType, number>> }` where `target` is `category/skillName` or `category` for category-level issues.
- Produces: `scoreTargets(issues: FreshnessIssue[], limit = 10): ScoredTarget[]` — weights high 3, med 2, low 1, warn 0; sorted by score desc then target asc; `warn`-only targets excluded.
- `renderMarkdown` inserts a `## Improve next` section between the severity table and the per-category tables whenever `scoreTargets` returns anything: `| # | target | score | signals |` with signals like `upstream-major-drift×1, eval-remediation×2`.

- [ ] **Step 1: Failing test**

Append to `scripts/freshness/report.test.ts`:
```ts
test("scoreTargets weights severities and renderMarkdown lists the top targets", () => {
  const mixed: FreshnessIssue[] = [
    { type: "upstream-major-drift", severity: "high", category: "java", skillName: "", upstream: "java", message: "" },
    { type: "claim-behind-pin", severity: "med", category: "nextjs", skillName: "nextjs-caching", message: "" },
    { type: "eval-remediation", severity: "low", category: "nextjs", skillName: "nextjs-caching", message: "" },
    { type: "eval-remediation", severity: "low", category: "nextjs", skillName: "nextjs-caching", message: "" },
    { type: "learning-log-gap", severity: "low", category: "golang", skillName: "golang-logging", message: "" },
    { type: "fetch-failed", severity: "warn", category: "flutter", skillName: "", message: "" },
  ];
  const scored = scoreTargets(mixed);
  assert.deepEqual(
    scored.map((s) => [s.target, s.score]),
    [["nextjs/nextjs-caching", 4], ["java", 3], ["golang/golang-logging", 1]],
  );
  assert.deepEqual(scored[0].counts, { "claim-behind-pin": 1, "eval-remediation": 2 });
  const md = renderMarkdown(buildReport("audit", 120, mixed, [], "2026-09-14T00:00:00.000Z"));
  assert.match(md, /^## Improve next/m);
  assert.match(md, /\| 1 \| nextjs\/nextjs-caching \| 4 \| claim-behind-pin×1, eval-remediation×2 \|/);
  assert.ok(md.indexOf("## Improve next") < md.indexOf("## golang"));
  assert.equal(scoreTargets([], 10).length, 0);
});
```
Add `scoreTargets` to the import line.

- [ ] **Step 2: Verify failure, implement**

In `report.ts` add after `SEVERITY_ORDER`:
```ts
const SEVERITY_WEIGHT: Record<Severity, number> = { high: 3, med: 2, low: 1, warn: 0 };

/** A skill (or category) ranked by the weighted sum of its issues. */
export interface ScoredTarget {
  /** `category/skill`, or `category` for category-level issues. */
  target: string;
  score: number;
  counts: Partial<Record<IssueType, number>>;
}

/**
 * Ranks targets by severity weight (high 3, med 2, low 1). Warn-only
 * targets are dropped. Ties break on target name so output is stable.
 */
export function scoreTargets(issues: FreshnessIssue[], limit = 10): ScoredTarget[] {
  const byTarget = new Map<string, ScoredTarget>();
  for (const issue of issues) {
    const target = issue.skillName ? `${issue.category}/${issue.skillName}` : issue.category;
    const entry = byTarget.get(target) ?? { target, score: 0, counts: {} };
    entry.score += SEVERITY_WEIGHT[issue.severity];
    entry.counts[issue.type] = (entry.counts[issue.type] ?? 0) + 1;
    byTarget.set(target, entry);
  }
  return [...byTarget.values()]
    .filter((t) => t.score > 0)
    .sort((a, b) => b.score - a.score || a.target.localeCompare(b.target))
    .slice(0, limit);
}
```
Import `IssueType` from `./types`. In `renderMarkdown`, right after the severity table loop and its blank line (before the `if (report.issues.length === 0)`), add:
```ts
  const top = scoreTargets(report.issues);
  if (top.length > 0) {
    lines.push("## Improve next");
    lines.push("");
    lines.push("| # | target | score | signals |");
    lines.push("|---|---|---|---|");
    top.forEach((t, i) => {
      const signals = Object.entries(t.counts)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([type, n]) => `${type}×${n}`)
        .join(", ");
      lines.push(`| ${i + 1} | ${t.target} | ${t.score} | ${signals} |`);
    });
    lines.push("");
  }
```

- [ ] **Step 3: Run tests, commit**

`pnpm test:freshness` → 45.
```bash
git add scripts/freshness/report.ts scripts/freshness/report.test.ts
git commit -m "feat(freshness): rank targets to improve next in the report"
```

---

### Task 5: `--internal` flag, workflow, skill conventions, docs

**Files:**
- Modify: `scripts/freshness/index.ts`
- Modify: `.github/workflows/skill-freshness.yml`
- Modify: `skills/common/common-learning-log/references/log-format.md`, `skills/common/common-session-retrospective/SKILL.md`
- Modify: `docs/FRESHNESS.md`

- [ ] **Step 1: `index.ts`**

Add imports:
```ts
import { evalSignalIssues, readRemediationQueue } from "./signals/evals";
import { learningLogIssues, parseLearningLog, readLearningLog } from "./signals/learning-log";
```
Add constant `const DEFAULT_WINDOW_DAYS = 90;` and a helper below `collectPins`:
```ts
/** Eval-queue and learning-log issues; empty when the files are absent. */
function internalSignals(windowDays: number): FreshnessIssue[] {
  const evals = evalSignalIssues(readRemediationQueue(ROOT_DIR));
  const log = readLearningLog(ROOT_DIR);
  if (!log) return evals;
  const known = new Set(walkSkills(path.join(ROOT_DIR, "skills")).map((s) => `${s.category}/${s.name}`));
  return [...evals, ...learningLogIssues(parseLearningLog(log, known), { today: new Date(), windowDays })];
}
```
In `main`, after `staleDays`: `const internal = process.argv.includes("--internal"); const windowDays = positiveNumberFlag("--window-days", DEFAULT_WINDOW_DAYS);`. In the `audit` branch change `const issues = auditFreshness(ROOT_DIR, { staleDays });` to `const issues = [...auditFreshness(ROOT_DIR, { staleDays }), ...(internal ? internalSignals(windowDays) : [])];`. In the `check` branch change the `buildReport("check", …)` call to include `...(internal ? internalSignals(windowDays) : [])` after `...drift`. Update `main`'s JSDoc: `--internal` adds eval-queue and learning-log signals; `--window-days <n>` (default 90) bounds the learning-log window.

Verify: `pnpm freshness:audit --internal` prints the 8 baseline issues plus `eval-remediation` rows (today's queue has 55 items in 3 classifications, ≈ one row per skill/classification) and any `learning-log-gap` rows for entries within 90 days; `--strict` exit code unchanged (signal issues never block). Paste the summary line into the report.

- [ ] **Step 2: Workflow**

In `.github/workflows/skill-freshness.yml` change the run line to `run: pnpm freshness:check --internal --stale-days "$STALE_DAYS"`.

- [ ] **Step 3: Skill conventions**

`skills/common/common-learning-log/references/log-format.md`: in the entry template add a line after `**Signal**: …`:
```markdown
**Skills**: category/skill-name, category/skill-name  <!-- optional; the freshness report counts these -->
```
and a row in the "Writing Each Section" table: `| **Skills** | 0–5 ids | \`category/skill\` ids the mistake concerns; omit when none |`.

`skills/common/common-session-retrospective/SKILL.md` step 6: change to `6. **Log to AGENTS_LEARNING.md** — For each correction loop found, append one entry using \`common/common-learning-log\` protocol (Signal: \`Session retrospective\`, \`**Skills**:\` line naming the skills involved)`. Keep the file under its size limit (currently 71 lines; do not add lines).

- [ ] **Step 4: Docs**

`docs/FRESHNESS.md`:
- Commands table: add `| \`pnpm freshness:audit --internal\` | adds eval-queue and learning-log signals (\`--window-days\`, default 90) | no |` and note that the weekly job runs `check --internal`.
- Issue-types table: add rows `eval-outdated` (med, "eval runner classified a failing case as an outdated domain expectation"), `eval-remediation` (low, "any other failing eval classification for the skill"), `learning-log-gap` (low, "AGENTS_LEARNING.md entries in the window name the skill").
- New section `## Internal signals` after "Upstream check": what the two readers look at, that the queue is overwritten per eval run, that the `**Skills**:` line is optional because known `category/skill` ids in the body are picked up too, and that signals never block `--strict`.
- New section `## Acknowledged drift`: the `acknowledged` field, when to set it (you know the release exists, review scheduled), that drift up to it reports `low`, and that it must be removed or bumped when the review lands.
- "Improve next" paragraph in the Reviewing section: the report's top table weights high 3 / med 2 / low 1 and is the suggested order for review sweeps.
- Baseline: leave as is.

- [ ] **Step 5: Verify and commit**

`pnpm test:freshness` (45), `pnpm validate:all` exit 0, `pnpm audit:sdlc | tail -1`, prettier check on workflow + docs, `git status --porcelain` empty after the hook resyncs mirrors.
```bash
git add scripts/freshness/index.ts .github/workflows/skill-freshness.yml docs/FRESHNESS.md skills/common/common-learning-log/references/log-format.md skills/common/common-session-retrospective/SKILL.md
git commit -m "feat(freshness): --internal signals, Skills log convention, acknowledged docs"
```
(Add a second `chore(mirrors): …` commit if the hook leaves regenerated mirror copies unstaged.)

---

### Task 6: PR

```bash
git push -u origin feat/skill-freshness-p3
gh pr create --base feat/skill-freshness-p2 --title "feat(freshness): internal signals, acknowledged drift, improve-next ranking (P3)" --body-file - <<'EOF'
## Summary
Phase 3 of skill freshness (stacked on #194; retarget to `develop` after it merges).

- `--internal` on `audit`/`check`: `benchmarks/evals/remediation-queue.json` → `eval-outdated` (med) / `eval-remediation` (low); `AGENTS_LEARNING.md` → `learning-log-gap` (low) for skills named in the last 90 days (explicit `**Skills**:` line or known `category/skill` mentions).
- `acknowledged` per-pin field: known upstream drift reports `low` until the review lands, so the weekly job can be green with a pending review list.
- "Improve next" table at the top of the report: targets ranked by high 3 / med 2 / low 1.
- Learning-log template gains an optional `**Skills**:` line; retrospective step 6 asks for it.

## Test plan
- [ ] `pnpm test` (freshness 45/45, CLI incl. schema spec, evals)
- [ ] `pnpm validate:all`, `pnpm audit:sdlc`
- [ ] `pnpm freshness:audit --internal` shows eval/learning-log rows and the Improve-next table

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Syp1r29csWEJpssYviqxgc
EOF
```

---

## Self-review notes

- Spec §4 coverage: evals signal → T1; learning-log signal + `**Skills**:` convention → T2, T5; combined score / top-10 → T4; no LLM anywhere. Extras from the P2 review: `acknowledged` → T3.
- Type consistency: `IssueType` additions (T1) used by T2/T4; `LearningLogEntry`, `learningLogIssues(entries, {today, windowDays})` used in T5; `scoreTargets` used by `renderMarkdown` only.
- Test count: 37 + 2 + 3 + 2 + 1 = 45 (cli vitest +1 separately).
