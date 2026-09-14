# Skill Freshness P4 (local opt-in usage telemetry) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user opt in to a local, append-only usage log written by the MCP server at session end (which skills were loaded, how often, how many no-match calls), and let the freshness report read one or more such logs to rank heavily-used drifting skills first and flag version-sensitive skills nobody loads.

**Architecture:** No server, no network. `mcp/src/services/TelemetryWriter.ts` serializes a `SessionTracker` into one JSON line and appends it to `~/.agent-skills-standard/telemetry.jsonl` when enabled by `AGS_TELEMETRY=1` or `.skillsrc` `telemetry: true`; `mcp/src/index.ts` flushes on transport close / process exit. `scripts/freshness/signals/telemetry.ts` reads JSONL files, aggregates loads per skill in a window, and yields `unused-skill` issues plus a per-target load count that `scoreTargets` uses as a tiebreaker and the report shows as a column. README/SECURITY state the exact data written and that nothing leaves the machine.

**Tech Stack:** TypeScript; mcp package (tsup CJS, vitest in `mcp/test/`, js-yaml already a dep); root scripts (`tsx`, node:test); cli zod config schema.

**Spec:** `docs/superpowers/specs/2026-09-13-skill-freshness-design.md` §5, amended by the user decision on 2026-09-14: local-only storage, no server module, no HTTP.

## Global Constraints

- Telemetry is **off by default**. On only when `AGS_TELEMETRY=1` (env wins) or the nearest `.skillsrc` (from the MCP's `projectRoot`) has `telemetry: true`. `AGS_TELEMETRY=0` forces off.
- The log line contains: ISO timestamp, mcp version, session start, duration seconds, project root **hashed** (sha256 first 12 hex), skill load counts keyed `category/id`, workflow load counts, per-tool call counts, no-match call count. It never contains file paths, keywords, prompts, skill bodies, or raw no-match inputs.
- Writing never throws into the MCP: every failure is swallowed and logged to stderr only under `DEBUG`. stdout is never touched (JSON-RPC).
- Default path `~/.agent-skills-standard/telemetry.jsonl` (`os.homedir()`), overridable with `AGS_TELEMETRY_PATH`; directory created on demand; file mode default.
- `scripts/freshness/` never imports from `cli/` or `mcp/`; it only reads JSONL.
- New issue type `unused-skill` (low): version-sensitive skill with zero loads across ≥ 20 sessions in the window. Never blocks `--strict`.
- `mcp/src/server.ts` `buildServer(config)` keeps its signature; an optional second argument carries a caller-owned `SessionTracker`.
- Branch `feat/skill-freshness-p4` stacked on `feat/skill-freshness-p3`. Commit messages: Conventional Commits with the session trailer.

---

## File Map

| Path | Responsibility |
|---|---|
| `mcp/src/services/TelemetryWriter.ts` | `TelemetryRecord`, `buildTelemetryRecord`, `TelemetryWriter` (append, enabled flag) |
| `mcp/src/services/telemetryConfig.ts` | `resolveTelemetry(projectRoot, env)` → `{ enabled, filePath }` from env + `.skillsrc` |
| `mcp/src/server.ts` | `buildServer(config, { tracker? })` |
| `mcp/src/index.ts` | create tracker + writer, flush on close/exit |
| `mcp/test/TelemetryWriter.spec.ts`, `mcp/test/telemetryConfig.spec.ts` | tests |
| `cli/src/services/ConfigService.ts`, `cli/src/models/config.ts` | `telemetry?: boolean` in `.skillsrc` schema |
| `scripts/freshness/types.ts` | `IssueType` += `unused-skill`; `ScoredTarget.loads` lives in report.ts |
| `scripts/freshness/signals/telemetry.ts` | `readTelemetryFiles`, `aggregateTelemetry`, `telemetryIssues`, `loadsByTarget` |
| `scripts/freshness/report.ts` | `scoreTargets(issues, limit, loads?)`, loads column |
| `scripts/freshness/index.ts` | `--telemetry <path>` (file or dir), `--min-sessions` |
| `docs/FRESHNESS.md`, `docs/SECURITY.md`, `README.md` | data statement, how to enable, how to share |

---

### Task 1: Telemetry record + writer (mcp)

**Files:**
- Create: `mcp/src/services/TelemetryWriter.ts`
- Test: `mcp/test/TelemetryWriter.spec.ts`

**Interfaces:**
- `interface TelemetryRecord { at: string; mcpVersion: string; sessionStartedAt: string; durationSeconds: number; projectHash: string; skills: Record<string, number>; workflows: Record<string, number>; callsByTool: Record<string, number>; noMatchCalls: number }`
- `buildTelemetryRecord(tracker: SessionTracker, meta: { mcpVersion: string; projectRoot: string; now?: Date }): TelemetryRecord` — counts every `category/id` in `event.loaded` (deduped stubs count as loads too: the agent asked for it), workflows from `workflow/` entries, `callsByTool` and `noMatchCalls` from `tracker.summary(now)`, `projectHash = sha256(projectRoot).slice(0, 12)`.
- `class TelemetryWriter { constructor(options: { enabled: boolean; filePath: string; debug?: boolean }); flush(record: TelemetryRecord): boolean }` — appends `JSON.stringify(record) + "\n"` with `fs.appendFileSync` (sync so it works from `process.on("exit")`), `mkdirSync({ recursive: true })` first; returns `false` and never throws when disabled or on error (stderr note only when `debug`).

- [ ] **Step 1: Failing test**

```ts
// mcp/test/TelemetryWriter.spec.ts
import { mkdtempSync, readFileSync, existsSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { SessionTracker } from "../src/services/SessionTracker";
import { TelemetryWriter, buildTelemetryRecord } from "../src/services/TelemetryWriter";

function tracker(): SessionTracker {
  const t = new SessionTracker();
  t.record({ via: "load_skills_for_files", input: ["src/app.ts"], loaded: ["typescript/typescript-language", "nestjs/nestjs-architecture"] });
  t.record({ via: "load_skills_for_keywords", input: ["jwt"], loaded: ["typescript/typescript-language"], dedupedSkills: ["typescript/typescript-language"] });
  t.record({ via: "get_workflow", input: ["dev-fix"], loaded: ["workflow/dev-fix"] });
  t.record({ via: "load_skills_for_keywords", input: ["nothing"], loaded: [] });
  return t;
}

describe("buildTelemetryRecord", () => {
  it("counts skill and workflow loads, tool calls, no-match calls, and hashes the project root", () => {
    const record = buildTelemetryRecord(tracker(), { mcpVersion: "0.6.0", projectRoot: "/Users/me/secret-project", now: new Date() });
    expect(record.skills).toEqual({ "typescript/typescript-language": 2, "nestjs/nestjs-architecture": 1 });
    expect(record.workflows).toEqual({ "workflow/dev-fix": 1 });
    expect(record.callsByTool.load_skills_for_keywords).toBe(2);
    expect(record.noMatchCalls).toBe(1);
    expect(record.mcpVersion).toBe("0.6.0");
    expect(record.projectHash).toMatch(/^[0-9a-f]{12}$/);
    const serialized = JSON.stringify(record);
    expect(serialized).not.toContain("secret-project");
    expect(serialized).not.toContain("src/app.ts");
    expect(serialized).not.toContain("jwt");
    expect(serialized).not.toContain("nothing");
  });
});

describe("TelemetryWriter", () => {
  const dirs: string[] = [];
  afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); });

  it("appends one JSON line per flush, creating the directory", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "ags-telemetry-"));
    dirs.push(dir);
    const filePath = path.join(dir, "nested", "telemetry.jsonl");
    const writer = new TelemetryWriter({ enabled: true, filePath });
    const record = buildTelemetryRecord(tracker(), { mcpVersion: "0.6.0", projectRoot: "/p" });
    expect(writer.flush(record)).toBe(true);
    expect(writer.flush(record)).toBe(true);
    const lines = readFileSync(filePath, "utf8").trim().split("\n");
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]).skills["nestjs/nestjs-architecture"]).toBe(1);
  });

  it("does nothing when disabled and never throws on an unwritable path", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "ags-telemetry-"));
    dirs.push(dir);
    const filePath = path.join(dir, "telemetry.jsonl");
    const record = buildTelemetryRecord(tracker(), { mcpVersion: "0.6.0", projectRoot: "/p" });
    expect(new TelemetryWriter({ enabled: false, filePath }).flush(record)).toBe(false);
    expect(existsSync(filePath)).toBe(false);
    // A path whose parent is a file cannot be created.
    const blocked = path.join(filePath, "child.jsonl");
    new TelemetryWriter({ enabled: true, filePath }).flush(record);
    expect(new TelemetryWriter({ enabled: true, filePath: blocked }).flush(record)).toBe(false);
  });
});
```

- [ ] **Step 2: Run to fail** — `cd mcp && pnpm vitest run test/TelemetryWriter.spec.ts` → cannot find module.

- [ ] **Step 3: Implement**

```ts
// mcp/src/services/TelemetryWriter.ts
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { SessionTracker } from "./SessionTracker";

/** One session, one line in the local telemetry log. Contains counts only. */
export interface TelemetryRecord {
  at: string;
  mcpVersion: string;
  sessionStartedAt: string;
  durationSeconds: number;
  /** sha256(projectRoot) first 12 hex chars; lets one log cover many projects without naming them. */
  projectHash: string;
  /** Loads per `category/id`, deduped stub returns included. */
  skills: Record<string, number>;
  /** Loads per `workflow/name`. */
  workflows: Record<string, number>;
  callsByTool: Record<string, number>;
  noMatchCalls: number;
}

interface RecordMeta {
  mcpVersion: string;
  projectRoot: string;
  now?: Date;
}

/** Folds a session's load events into counts. Never includes inputs or paths. */
export function buildTelemetryRecord(tracker: SessionTracker, meta: RecordMeta): TelemetryRecord {
  const now = meta.now ?? new Date();
  const skills: Record<string, number> = {};
  const workflows: Record<string, number> = {};
  for (const event of tracker.events_()) {
    for (const key of event.loaded) {
      const bucket = key.startsWith("workflow/") ? workflows : skills;
      bucket[key] = (bucket[key] ?? 0) + 1;
    }
  }
  const summary = tracker.summary(now);
  return {
    at: now.toISOString(),
    mcpVersion: meta.mcpVersion,
    sessionStartedAt: summary.startedAt,
    durationSeconds: summary.elapsedSeconds,
    projectHash: createHash("sha256").update(meta.projectRoot).digest("hex").slice(0, 12),
    skills,
    workflows,
    callsByTool: { ...summary.callsByTool },
    noMatchCalls: summary.noMatchCalls,
  };
}

interface WriterOptions {
  enabled: boolean;
  filePath: string;
  /** Print failures to stderr; default false. */
  debug?: boolean;
}

/** Appends telemetry records to a local JSONL file. Synchronous so it works from process exit hooks. */
export class TelemetryWriter {
  private readonly enabled: boolean;
  private readonly filePath: string;
  private readonly debug: boolean;

  constructor(options: WriterOptions) {
    this.enabled = options.enabled;
    this.filePath = options.filePath;
    this.debug = options.debug ?? false;
  }

  /** Writes one line. Returns false (never throws) when disabled or on any I/O error. */
  flush(record: TelemetryRecord): boolean {
    if (!this.enabled) return false;
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      fs.appendFileSync(this.filePath, `${JSON.stringify(record)}\n`, "utf8");
      return true;
    } catch (error) {
      if (this.debug) {
        process.stderr.write(`[ags-mcp] telemetry write failed: ${error instanceof Error ? error.message : String(error)}\n`);
      }
      return false;
    }
  }
}
```

- [ ] **Step 4: Run to pass** — 3 passing; `cd mcp && pnpm lint` clean.

- [ ] **Step 5: Commit** — `feat(mcp): local telemetry record builder and JSONL writer`

---

### Task 2: Opt-in resolution and flush wiring (mcp)

**Files:**
- Create: `mcp/src/services/telemetryConfig.ts`
- Modify: `mcp/src/server.ts` (`buildServer` options), `mcp/src/index.ts`
- Test: `mcp/test/telemetryConfig.spec.ts`

**Interfaces:**
- `resolveTelemetry(projectRoot: string, env: NodeJS.ProcessEnv = process.env, home = os.homedir()): { enabled: boolean; filePath: string; source: "env" | "skillsrc" | "default" }` — `AGS_TELEMETRY` `"1"|"true"` → on, `"0"|"false"` → off (source `env`); else read `<projectRoot>/.skillsrc` (YAML via js-yaml, `telemetry: true` → on, source `skillsrc`); else off (`default`). `filePath = env.AGS_TELEMETRY_PATH || path.join(home, ".agent-skills-standard", "telemetry.jsonl")`. Missing/unparsable `.skillsrc` → off, no throw.
- `buildServer(config: ResolvedConfig, options: { tracker?: SessionTracker } = {})` — uses `options.tracker ?? new SessionTracker()`.
- `mcp/src/index.ts`: creates `tracker`, `telemetry = resolveTelemetry(config.projectRoot)`, `writer = new TelemetryWriter({ enabled: telemetry.enabled, filePath: telemetry.filePath, debug: !!process.env.DEBUG })`; logs to stderr `[ags-mcp] telemetry: on (<source>) → <filePath>` only when enabled; a `flushOnce()` guarded by a boolean calls `writer.flush(buildTelemetryRecord(tracker, { mcpVersion: SERVER_VERSION, projectRoot: config.projectRoot }))`; registered on `transport.onclose` (stdio branch), `process.on("exit")`, `process.once("SIGINT")` and `process.once("SIGTERM")` (the signal handlers call `flushOnce()` then `process.exit(0)`). Export `SERVER_VERSION = "0.6.0"` from `server.ts` (replace the literal in `new McpServer({ version })`).

- [ ] **Step 1: Failing test**

```ts
// mcp/test/telemetryConfig.spec.ts
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { resolveTelemetry } from "../src/services/telemetryConfig";

describe("resolveTelemetry", () => {
  const dirs: string[] = [];
  afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); });
  const project = () => { const d = mkdtempSync(path.join(os.tmpdir(), "ags-proj-")); dirs.push(d); return d; };

  it("is off by default with the home-directory path", () => {
    const r = resolveTelemetry(project(), {}, "/home/u");
    expect(r).toEqual({ enabled: false, filePath: path.join("/home/u", ".agent-skills-standard", "telemetry.jsonl"), source: "default" });
  });

  it("env wins: AGS_TELEMETRY=1 enables, =0 disables even when .skillsrc says true", () => {
    const root = project();
    writeFileSync(path.join(root, ".skillsrc"), "registry: https://example.com\ntelemetry: true\n");
    expect(resolveTelemetry(root, { AGS_TELEMETRY: "1" }, "/h").enabled).toBe(true);
    expect(resolveTelemetry(root, { AGS_TELEMETRY: "1" }, "/h").source).toBe("env");
    expect(resolveTelemetry(root, { AGS_TELEMETRY: "0" }, "/h").enabled).toBe(false);
  });

  it("reads telemetry: true from .skillsrc and honors AGS_TELEMETRY_PATH", () => {
    const root = project();
    writeFileSync(path.join(root, ".skillsrc"), "telemetry: true\n");
    const r = resolveTelemetry(root, { AGS_TELEMETRY_PATH: "/tmp/t.jsonl" }, "/h");
    expect(r).toEqual({ enabled: true, filePath: "/tmp/t.jsonl", source: "skillsrc" });
  });

  it("treats a malformed or absent .skillsrc as off", () => {
    const root = project();
    writeFileSync(path.join(root, ".skillsrc"), "telemetry: [unclosed\n");
    expect(resolveTelemetry(root, {}, "/h").enabled).toBe(false);
    expect(resolveTelemetry(project(), {}, "/h").enabled).toBe(false);
  });
});
```

- [ ] **Step 2: Implement `telemetryConfig.ts`**

```ts
// mcp/src/services/telemetryConfig.ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import yaml from "js-yaml";

/** Where the opt-in came from. */
export type TelemetrySource = "env" | "skillsrc" | "default";

/** Resolved telemetry switch and target file. */
export interface TelemetrySettings {
  enabled: boolean;
  filePath: string;
  source: TelemetrySource;
}

const ON = new Set(["1", "true", "yes", "on"]);
const OFF = new Set(["0", "false", "no", "off"]);

/**
 * Opt-in resolution: AGS_TELEMETRY env (wins), then `.skillsrc`
 * `telemetry: true` in the project root, else off. Path from
 * AGS_TELEMETRY_PATH or ~/.agent-skills-standard/telemetry.jsonl.
 */
export function resolveTelemetry(
  projectRoot: string,
  env: NodeJS.ProcessEnv = process.env,
  home: string = os.homedir(),
): TelemetrySettings {
  const filePath = env.AGS_TELEMETRY_PATH || path.join(home, ".agent-skills-standard", "telemetry.jsonl");
  const flag = (env.AGS_TELEMETRY ?? "").trim().toLowerCase();
  if (ON.has(flag)) return { enabled: true, filePath, source: "env" };
  if (OFF.has(flag)) return { enabled: false, filePath, source: "env" };
  try {
    const file = path.join(projectRoot, ".skillsrc");
    if (fs.existsSync(file)) {
      const parsed = yaml.load(fs.readFileSync(file, "utf8"));
      if (parsed && typeof parsed === "object" && (parsed as { telemetry?: unknown }).telemetry === true) {
        return { enabled: true, filePath, source: "skillsrc" };
      }
    }
  } catch {
    // unreadable or malformed config → stay off
  }
  return { enabled: false, filePath, source: "default" };
}
```

- [ ] **Step 3: Wire `server.ts` and `index.ts`**

`server.ts`: add `export const SERVER_VERSION = "0.6.0";` near the top; change signature to `export async function buildServer(config: ResolvedConfig, options: { tracker?: SessionTracker } = {}): Promise<McpServer>` and `const tracker = options.tracker ?? new SessionTracker();`; use `version: SERVER_VERSION`.

`index.ts`: after `const config = await resolveConfig();` add
```ts
  const tracker = new SessionTracker();
  const telemetry = resolveTelemetry(config.projectRoot);
  const writer = new TelemetryWriter({ enabled: telemetry.enabled, filePath: telemetry.filePath, debug: !!process.env.DEBUG });
  if (telemetry.enabled) {
    process.stderr.write(`[ags-mcp] telemetry: on (${telemetry.source}) → ${telemetry.filePath}\n`);
  }
  let flushed = false;
  const flushOnce = () => {
    if (flushed) return;
    flushed = true;
    writer.flush(buildTelemetryRecord(tracker, { mcpVersion: SERVER_VERSION, projectRoot: config.projectRoot }));
  };
  process.on("exit", flushOnce);
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => { flushOnce(); process.exit(0); });
  }
```
change `const server = await buildServer(config);` to `buildServer(config, { tracker })`, and in the stdio branch after `server.connect(transport)` add `transport.onclose = flushOnce;`. Imports: `SessionTracker`, `TelemetryWriter`, `buildTelemetryRecord`, `resolveTelemetry`, `SERVER_VERSION`.

- [ ] **Step 4: Verify**

`cd mcp && pnpm vitest run` (all incl. 4 new) and `pnpm lint` and `pnpm build`. Manual smoke: `AGS_TELEMETRY=1 AGS_TELEMETRY_PATH=/tmp/ags-t.jsonl node mcp/dist/index.js < /dev/null` then `cat /tmp/ags-t.jsonl` — one line with zero loads (stdin EOF closes the transport). Paste it in the report.

- [ ] **Step 5: Commit** — `feat(mcp): opt-in local telemetry via AGS_TELEMETRY or .skillsrc, flushed at session end`

---

### Task 3: `.skillsrc` schema (cli)

**Files:**
- Modify: `cli/src/services/ConfigService.ts` (`SkillConfigSchema`, after `mcp`)
- Modify: `cli/src/models/config.ts` (`SkillConfig`, after `mcp?`)
- Test: `cli/src/services/__tests__/ConfigService.spec.ts` (inside `describe('loadConfig')`)

- [ ] **Step 1: Failing test** — add after the "should return parsed config" case:

```ts
    it('keeps the opt-in telemetry flag and rejects a non-boolean value', async () => {
      vi.mocked(fs.pathExists).mockImplementation(() => Promise.resolve(true));
      vi.mocked(fs.readFile).mockImplementation(() =>
        Promise.resolve('registry: https://example.com\nskills: {}\ntelemetry: true' as unknown as Buffer),
      );
      vi.mocked(yaml.load).mockReturnValue({ registry: 'https://example.com', skills: {}, telemetry: true });
      const config = await configService.loadConfig(mockCwd);
      expect(config?.telemetry).toBe(true);

      vi.mocked(yaml.load).mockReturnValue({ registry: 'https://example.com', skills: {}, telemetry: 'yes' });
      await expect(configService.loadConfig(mockCwd)).rejects.toThrow();
    });
```
If `loadConfig` reports invalid config by returning `null` / logging instead of throwing (check the `safeParse` branch around `ConfigService.ts:372-376`), assert that behavior instead and say so in the report.

- [ ] **Step 2: Implement** — `ConfigService.ts`: `telemetry: z.boolean().optional(),` after `mcp: McpConfigSchema.optional(),`. `config.ts`: after `mcp?: McpConfig;` add `/** Opt-in local MCP usage log (never uploaded). See docs/FRESHNESS.md "Usage telemetry". */ telemetry?: boolean;`.

- [ ] **Step 3: Verify & commit** — `cd cli && pnpm vitest run src/services/__tests__/ConfigService.spec.ts && pnpm lint`. Commit `feat(cli): telemetry opt-in flag in .skillsrc schema`.

---

### Task 4: Telemetry signal and load-aware ranking (scripts)

**Files:**
- Modify: `scripts/freshness/types.ts` (`IssueType` += `"unused-skill"`; `FreshnessReport.telemetry?`)
- Create: `scripts/freshness/signals/telemetry.ts`
- Modify: `scripts/freshness/report.ts` (`buildReport` telemetry param, `scoreTargets` loads, loads column, header line)
- Test: `scripts/freshness/signals/telemetry.test.ts`, `scripts/freshness/report.test.ts`

**Interfaces:**
- `types.ts`: `FreshnessReport.telemetry?: { source: string; sessions: number; from: string | null; to: string | null; loadsByTarget: Record<string, number> }`.
- `telemetry.ts`:
  - `interface TelemetryAggregate { sessions: number; from: string | null; to: string | null; loadsBySkill: Map<string, number>; noMatchCalls: number }`
  - `readTelemetryFiles(target: string): string[]` — a file → its lines; a directory → lines of every `*.jsonl` inside, sorted by name; throws `Error("telemetry path not found: …")` when missing.
  - `aggregateTelemetry(lines: string[], options: { today: Date; windowDays: number }): TelemetryAggregate` — JSON-parse each non-empty line; keep records where `at` is an ISO string within the window and `skills` is an object; sum per key; `from`/`to` are the min/max `at` kept.
  - `telemetryIssues(aggregate, skills: { category: string; name: string }[], options: { minSessions: number; windowDays: number }): FreshnessIssue[]` — when `aggregate.sessions >= minSessions`: one `unused-skill` (low) per skill whose category is not in `VERSION_AGNOSTIC_CATEGORIES` and whose `category/name` has no loads.
  - `loadsByTarget(aggregate): Record<string, number>` — `category/skill` → loads, and `category (category)` → sum over its skills.
- `report.ts`:
  - `buildReport(action, staleDays, issues, upstream, generatedAt?, telemetry?)`.
  - `ScoredTarget.loads?: number`; `scoreTargets(issues, limit = 10, loads?: Record<string, number>)` — sort score desc, then loads desc (missing = 0), then name.
  - `renderMarkdown`: when `report.telemetry` exists, a line under the header `Telemetry: N sessions (<from> → <to>) from <source>`; the Improve-next table gains a `loads` column.

- [ ] **Step 1: Failing tests**

```ts
// scripts/freshness/signals/telemetry.test.ts
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import fs from "fs-extra";
import { aggregateTelemetry, loadsByTarget, readTelemetryFiles, telemetryIssues } from "./telemetry";

const TODAY = new Date("2026-09-14T00:00:00Z");
const line = (at: string, skills: Record<string, number>, noMatchCalls = 0) =>
  JSON.stringify({ at, mcpVersion: "0.6.0", skills, workflows: {}, callsByTool: {}, noMatchCalls });

function sample(): string[] {
  const lines: string[] = [];
  for (let i = 0; i < 22; i++) {
    lines.push(line(`2026-09-${String(1 + (i % 13)).padStart(2, "0")}T10:00:00Z`, { "nextjs/nextjs-caching": 2, "golang/golang-logging": i % 2 }, i % 5 === 0 ? 1 : 0));
  }
  lines.push(line("2026-05-01T00:00:00Z", { "php/php-language": 9 })); // outside window
  lines.push(line("2026-05-02T00:00:00Z", { "php/php-language": 9 }));
  lines.push(line("2026-05-03T00:00:00Z", { "php/php-language": 9 }));
  lines.push("{not json");
  lines.push("");
  return lines;
}

test("aggregateTelemetry keeps in-window valid records and sums loads", () => {
  const agg = aggregateTelemetry(sample(), { today: TODAY, windowDays: 90 });
  assert.equal(agg.sessions, 22);
  assert.equal(agg.loadsBySkill.get("nextjs/nextjs-caching"), 44);
  assert.equal(agg.loadsBySkill.get("golang/golang-logging"), 11);
  assert.equal(agg.loadsBySkill.get("php/php-language"), undefined);
  assert.equal(agg.noMatchCalls, 5);
  assert.equal(agg.from, "2026-09-01T10:00:00Z");
  assert.equal(agg.to, "2026-09-13T10:00:00Z");
});

test("telemetryIssues flags unused version-sensitive skills only past minSessions", () => {
  const agg = aggregateTelemetry(sample(), { today: TODAY, windowDays: 90 });
  const skills = [
    { category: "nextjs", name: "nextjs-caching" },
    { category: "nextjs", name: "nextjs-pages-router" },
    { category: "common", name: "common-tdd" },
  ];
  const issues = telemetryIssues(agg, skills, { minSessions: 20, windowDays: 90 });
  assert.deepEqual(issues.map((i) => `${i.type}:${i.category}/${i.skillName}:${i.severity}`), ["unused-skill:nextjs/nextjs-pages-router:low"]);
  assert.match(issues[0].message, /22 sessions/);
  assert.deepEqual(telemetryIssues(agg, skills, { minSessions: 50, windowDays: 90 }), []);
});

test("loadsByTarget includes category sums", () => {
  const agg = aggregateTelemetry(sample(), { today: TODAY, windowDays: 90 });
  const loads = loadsByTarget(agg);
  assert.equal(loads["nextjs/nextjs-caching"], 44);
  assert.equal(loads["nextjs (category)"], 44);
  assert.equal(loads["golang (category)"], 11);
});

test("readTelemetryFiles reads a file or every .jsonl in a directory, and rejects a missing path", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ags-tel-"));
  try {
    await writeFile(path.join(root, "a.jsonl"), "1\n2\n");
    await writeFile(path.join(root, "b.jsonl"), "3\n");
    await writeFile(path.join(root, "ignore.txt"), "9\n");
    assert.deepEqual(readTelemetryFiles(path.join(root, "a.jsonl")), ["1", "2"]);
    assert.deepEqual(readTelemetryFiles(root), ["1", "2", "3"]);
    assert.throws(() => readTelemetryFiles(path.join(root, "nope.jsonl")), /telemetry path not found/);
  } finally {
    await fs.remove(root);
  }
});
```

Append to `scripts/freshness/report.test.ts`:
```ts
test("scoreTargets breaks ties by loads and renderMarkdown shows telemetry", () => {
  const tied: FreshnessIssue[] = [
    { type: "claim-behind-pin", severity: "med", category: "nextjs", skillName: "nextjs-a", message: "" },
    { type: "claim-behind-pin", severity: "med", category: "nextjs", skillName: "nextjs-b", message: "" },
  ];
  const loads = { "nextjs/nextjs-b": 40, "nextjs/nextjs-a": 3 };
  assert.deepEqual(scoreTargets(tied, 10, loads).map((t) => [t.target, t.loads]), [["nextjs/nextjs-b", 40], ["nextjs/nextjs-a", 3]]);
  const report = buildReport("audit", 120, tied, [], "2026-09-14T00:00:00.000Z", {
    source: "~/.agent-skills-standard/telemetry.jsonl",
    sessions: 22,
    from: "2026-09-01T10:00:00Z",
    to: "2026-09-13T10:00:00Z",
    loadsByTarget: loads,
  });
  const md = renderMarkdown(report);
  assert.match(md, /^Telemetry: 22 sessions \(2026-09-01T10:00:00Z → 2026-09-13T10:00:00Z\) from ~\/\.agent-skills-standard\/telemetry\.jsonl$/m);
  assert.match(md, /\| # \| target \| score \| loads \| signals \|/);
  assert.match(md, /\| 1 \| nextjs\/nextjs-b \| 2 \| 40 \| claim-behind-pin×1 \|/);
});
```

- [ ] **Step 2: Run to fail**, then implement

`types.ts`: `| "unused-skill"` in `IssueType`; in `FreshnessReport` add
```ts
  /** Present when the report was built with --telemetry. */
  telemetry?: {
    source: string;
    sessions: number;
    from: string | null;
    to: string | null;
    /** `category/skill` and `category (category)` → loads in the window. */
    loadsByTarget: Record<string, number>;
  };
```

```ts
// scripts/freshness/signals/telemetry.ts
import fs from "fs-extra";
import path from "path";
import { VERSION_AGNOSTIC_CATEGORIES } from "../pins";
import type { FreshnessIssue } from "../types";

/** Loads summed over the telemetry records inside the window. */
export interface TelemetryAggregate {
  sessions: number;
  from: string | null;
  to: string | null;
  loadsBySkill: Map<string, number>;
  noMatchCalls: number;
}

/**
 * Lines of one `.jsonl` file, or of every `*.jsonl` in a directory
 * (sorted by file name). Throws when the path does not exist.
 */
export function readTelemetryFiles(target: string): string[] {
  if (!fs.existsSync(target)) throw new Error(`telemetry path not found: ${target}`);
  const files = fs.statSync(target).isDirectory()
    ? fs.readdirSync(target).filter((f) => f.endsWith(".jsonl")).sort().map((f) => path.join(target, f))
    : [target];
  return files.flatMap((file) => fs.readFileSync(file, "utf8").split(/\r?\n/));
}

/** Parses JSONL records written by the MCP TelemetryWriter; invalid or out-of-window lines are skipped. */
export function aggregateTelemetry(lines: string[], options: { today: Date; windowDays: number }): TelemetryAggregate {
  const cutoff = options.today.getTime() - options.windowDays * 86_400_000;
  const agg: TelemetryAggregate = { sessions: 0, from: null, to: null, loadsBySkill: new Map(), noMatchCalls: 0 };
  for (const raw of lines) {
    const text = raw.trim();
    if (!text) continue;
    let record: { at?: unknown; skills?: unknown; noMatchCalls?: unknown };
    try {
      record = JSON.parse(text);
    } catch {
      continue;
    }
    if (typeof record.at !== "string" || !record.skills || typeof record.skills !== "object") continue;
    const at = new Date(record.at).getTime();
    if (!Number.isFinite(at) || at < cutoff || at > options.today.getTime()) continue;
    agg.sessions += 1;
    if (!agg.from || record.at < agg.from) agg.from = record.at;
    if (!agg.to || record.at > agg.to) agg.to = record.at;
    for (const [key, count] of Object.entries(record.skills as Record<string, unknown>)) {
      if (typeof count !== "number" || !Number.isFinite(count)) continue;
      agg.loadsBySkill.set(key, (agg.loadsBySkill.get(key) ?? 0) + count);
    }
    if (typeof record.noMatchCalls === "number") agg.noMatchCalls += record.noMatchCalls;
  }
  return agg;
}

/**
 * `unused-skill` (low) for every version-sensitive skill with zero loads,
 * only once enough sessions were observed to make "zero" meaningful.
 */
export function telemetryIssues(
  aggregate: TelemetryAggregate,
  skills: { category: string; name: string }[],
  options: { minSessions: number; windowDays: number },
): FreshnessIssue[] {
  if (aggregate.sessions < options.minSessions) return [];
  const issues: FreshnessIssue[] = [];
  for (const skill of skills) {
    if (VERSION_AGNOSTIC_CATEGORIES.has(skill.category)) continue;
    const loads = aggregate.loadsBySkill.get(`${skill.category}/${skill.name}`) ?? 0;
    if (loads > 0) continue;
    issues.push({
      type: "unused-skill",
      severity: "low",
      category: skill.category,
      skillName: skill.name,
      message: `Never loaded across ${aggregate.sessions} sessions in the last ${options.windowDays} days; check its triggers or consider retiring it`,
    });
  }
  return issues;
}

/** `category/skill` and `category (category)` → loads, for ranking. */
export function loadsByTarget(aggregate: TelemetryAggregate): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, loads] of aggregate.loadsBySkill) {
    out[key] = loads;
    const category = key.split("/")[0];
    const catKey = `${category} (category)`;
    out[catKey] = (out[catKey] ?? 0) + loads;
  }
  return out;
}
```

`report.ts` changes:
- `ScoredTarget` gets `/** Loads in the telemetry window, when known. */ loads?: number;`
- `scoreTargets(issues, limit = 10, loads?: Record<string, number>)`: after building entries, `if (loads) for (const t of byTarget.values()) t.loads = loads[t.target] ?? 0;` and sort `b.score - a.score || (b.loads ?? 0) - (a.loads ?? 0) || a.target.localeCompare(b.target)`.
- `buildReport(action, staleDays, issues, upstream, generatedAt = …, telemetry?: FreshnessReport["telemetry"])` → include `...(telemetry ? { telemetry } : {})` in the returned object.
- `renderMarkdown`: after the `Generated:` line, `if (report.telemetry) lines.push(\`Telemetry: ${report.telemetry.sessions} sessions (${report.telemetry.from ?? "?"} → ${report.telemetry.to ?? "?"}) from ${report.telemetry.source}\`);` then the existing blank line. Improve-next: `const top = scoreTargets(report.issues, 10, report.telemetry?.loadsByTarget);` `const all = scoreTargets(report.issues, Number.MAX_SAFE_INTEGER, report.telemetry?.loadsByTarget);` header `| # | target | score | loads | signals |` / `|---|---|---|---|---|` when telemetry present, else the current 4-column header; row includes `${t.loads ?? 0}` in the loads column when present.

- [ ] **Step 3: Run** `pnpm test:freshness` → all passing (49 + 4 + 1 = 54). Commit `feat(freshness): local telemetry signal, unused-skill issues, load-aware ranking`.

---

### Task 5: `--telemetry` flag and docs

**Files:**
- Modify: `scripts/freshness/index.ts`
- Modify: `docs/FRESHNESS.md`, `docs/SECURITY.md`, `README.md`

- [ ] **Step 1: `index.ts`**

Imports: `import { aggregateTelemetry, loadsByTarget, readTelemetryFiles, telemetryIssues } from "./signals/telemetry";`. Constant `const DEFAULT_MIN_SESSIONS = 20;`. Helper:
```ts
/** Reads --telemetry files, returns issues plus the report's telemetry block; null when the flag is absent. */
function telemetrySignals(target: string | undefined, windowDays: number, minSessions: number): { issues: FreshnessIssue[]; telemetry: FreshnessReport["telemetry"] } | null {
  if (!target) return null;
  const today = new Date();
  const aggregate = aggregateTelemetry(readTelemetryFiles(target), { today, windowDays });
  const skills = walkSkills(path.join(ROOT_DIR, "skills")).map((s) => ({ category: s.category, name: s.name }));
  return {
    issues: telemetryIssues(aggregate, skills, { minSessions, windowDays }),
    telemetry: { source: target, sessions: aggregate.sessions, from: aggregate.from, to: aggregate.to, loadsByTarget: loadsByTarget(aggregate) },
  };
}
```
In `main`: `const telemetryPath = flagValue("--telemetry"); const minSessions = positiveNumberFlag("--min-sessions", DEFAULT_MIN_SESSIONS); const tel = telemetrySignals(telemetryPath, windowDays, minSessions);` — in `audit`: issues += `...(tel?.issues ?? [])`, `buildReport("audit", staleDays, issues, [], undefined, tel?.telemetry)`; in `check` likewise with the 6th argument. Update `main`'s JSDoc: `--telemetry <file|dir>` reads local MCP usage logs (JSONL); `--min-sessions <n>` (default 20) gates `unused-skill`. `printIssues` unchanged.

Verify: `pnpm freshness:audit --telemetry /tmp/ags-t.jsonl` using the file produced in Task 2's smoke (1 session → no `unused-skill`, header shows `Telemetry: 1 sessions`); `pnpm freshness:audit --telemetry /nonexistent; echo $?` → clear error, exit 1. Add one `index.test.ts` case? `telemetrySignals` is private; skip, the signal module is tested.

- [ ] **Step 2: Docs**

`docs/FRESHNESS.md` — new section `## Usage telemetry (local, opt-in)` after "Internal signals":
```markdown
The MCP server can append one line per session to a local JSON Lines file. It is **off by default** and nothing is ever uploaded.

Enable it with `AGS_TELEMETRY=1` in the MCP server's environment, or `telemetry: true` in the project's `.skillsrc` (`AGS_TELEMETRY=0` overrides). The file is `~/.agent-skills-standard/telemetry.jsonl` (`AGS_TELEMETRY_PATH` to change it) and is written when the session ends.

Each line contains only: timestamp, MCP version, session start and duration, a 12-hex-char hash of the project path, load counts per `category/skill`, load counts per workflow, call counts per MCP tool, and the number of calls that matched no skill. It never contains file paths, keywords, prompts, skill text, or the inputs of unmatched calls.

Feed it to the report with `pnpm freshness:audit --internal --telemetry ~/.agent-skills-standard/telemetry.jsonl` (a directory of `.jsonl` files works too, so a team can pool exported logs). The report header shows the session count and window, "Improve next" gains a `loads` column and breaks score ties by usage, and version-sensitive skills that were never loaded across at least `--min-sessions` (default 20) sessions are reported as `unused-skill` (low).
```
Issue-types table: add `| \`unused-skill\` | low | version-sensitive skill never loaded across ≥ \`--min-sessions\` sessions in the telemetry window |`. Commands table: `--telemetry <file|dir>` and `--min-sessions` rows.

`README.md` lines 487-488 become:
```markdown
- **No telemetry by default** — no data collection, no analytics, no background daemons. An opt-in local usage log (`AGS_TELEMETRY=1`) writes per-session skill-load counts to `~/.agent-skills-standard/telemetry.jsonl` and is never uploaded; see [docs/FRESHNESS.md](docs/FRESHNESS.md#usage-telemetry-local-opt-in)
- **No code or project data leaves your machine** — feedback is only sent if you explicitly run `ags feedback`
```

`docs/SECURITY.md` — under `## Governance`, add subsection `### Telemetry & data collection`: two sentences: the CLI and MCP collect nothing by default; the opt-in local usage log contains counts only (list the fields), is written to the user's home directory, is never transmitted, and can be disabled at any time by unsetting the flag; link to FRESHNESS.md.

- [ ] **Step 3: Verify & commit**

`pnpm test:freshness`, `pnpm --filter ./mcp test`, `cd cli && pnpm test`, `pnpm validate:all`, `pnpm audit:sdlc | tail -1`, `npx prettier --check docs/FRESHNESS.md docs/SECURITY.md README.md`. Two commits: `feat(freshness): --telemetry flag reads local MCP usage logs` (index.ts) and `docs(freshness): local telemetry data statement in FRESHNESS, SECURITY, README`.

---

### Task 6: PR

```bash
git push -u origin feat/skill-freshness-p4
gh pr create --base feat/skill-freshness-p3 --title "feat(freshness): opt-in local usage telemetry and load-aware ranking (P4)" --body-file - <<'EOF'
## Summary
Phase 4 of skill freshness (stacked on #195). Spec §5 as amended on 2026-09-14: **local-only** — no server, no network.

- MCP: opt-in (`AGS_TELEMETRY=1` or `.skillsrc` `telemetry: true`) append-only JSONL at `~/.agent-skills-standard/telemetry.jsonl`, written at session end. Counts only: skill/workflow loads, tool calls, no-match calls, hashed project path. Never paths, keywords, prompts, or skill text.
- `pnpm freshness:audit|check --telemetry <file|dir> [--min-sessions 20]`: header shows the session window, "Improve next" gains a `loads` column and usage tie-break, `unused-skill` (low) for version-sensitive skills never loaded.
- `.skillsrc` schema gains `telemetry?: boolean`.
- README/SECURITY: "No telemetry by default" with the exact data statement.

## Test plan
- [ ] `pnpm --filter ./mcp test` (+7), `cd cli && pnpm test` (+1), `pnpm test:freshness` (54)
- [ ] `AGS_TELEMETRY=1 AGS_TELEMETRY_PATH=/tmp/t.jsonl node mcp/dist/index.js < /dev/null` writes one line
- [ ] `pnpm freshness:audit --telemetry /tmp/t.jsonl` shows the telemetry header

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Syp1r29csWEJpssYviqxgc
EOF
```

## Self-review notes
- Spec §5 deviations (user-approved): no server module, no POST, no `GET /telemetry/aggregate`, no hashed no-match inputs (only the count is kept).
- `TelemetryRecord` (mcp) and the reader in `scripts/` are decoupled on purpose (no cross-package import); the reader validates `at` + `skills` and ignores unknown fields so either side can evolve.
- Type consistency: `FreshnessReport.telemetry` shape used by `buildReport`, `renderMarkdown`, `telemetrySignals`; `loadsByTarget` keys match `scoreTargets` target labels (`category/skill`, `category (category)`).
- Test counts: mcp +7 (3 writer + 4 config), cli +1, scripts +5 → freshness 54.
