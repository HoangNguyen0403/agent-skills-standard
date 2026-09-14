# Skill Freshness P2 (upstream check + cron + historical-claim filter) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the freshness audit see the outside world: fetch each pin's latest upstream version from GitHub, report major/minor drift, run it weekly, and stop flagging historical version references as guidance.

**Architecture:** Two new pure modules in `scripts/freshness/`: `sources.ts` (an `UpstreamSource` interface with a GitHub releases→tags implementation and a `manual` no-op, injectable `fetch`) and `check.ts` (turns pin + latest into `upstream-*-drift` / `fetch-failed` issues and `UpstreamStatus` rows). `index.ts` gains a `check` action that runs the P1 offline audit plus the network check and always writes the report. `claims.ts` learns to tag a claim as `historical` from same-line context words, and `audit.ts` downgrades such `claim-behind-pin` hits to `low` so `--strict` can eventually be turned on. A new weekly workflow runs `check` and publishes the report as an artifact and step summary.

**Tech Stack:** TypeScript via `tsx`, global `fetch` (Node 20+), `fs-extra`, `node:test` + `node:assert/strict`; GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-13-skill-freshness-design.md` (§2 Detection — `check` action, `sources.ts`; §3 Wiring — cron workflow, SECURITY row). Follow-ups from the P1 final review that this plan absorbs: historical-claim context filter, precompiled alias regexes, `reviewed-mismatch` scope note for skill-level pins.

## Global Constraints

- Node `>=20`; scripts run with `node --import tsx`, no typecheck on `scripts/` — keep types explicit.
- `scripts/freshness/` never imports from `cli/`. Path constants come from `scripts/evals/constants.ts`.
- Every exported symbol (functions, interfaces, types, consts) has a JSDoc comment.
- Tests use `node:test` + `node:assert/strict`; network code takes an injectable `fetchImpl: typeof fetch` and tests pass a stub — no real network in tests.
- `audit` stays write-free by default. `check` always writes `benchmarks/freshness/freshness-report.{json,md}` (dir is gitignored).
- Exit codes: `check` exits 1 on any `high` issue. `audit --strict` exits 1 on any `missing-pin`, or any `claim-*` issue whose severity is not `low`.
- Severities: `upstream-major-drift` high, `upstream-minor-drift` low, `fetch-failed` warn (never gates). Historical `claim-behind-pin` is `low`.
- `GITHUB_TOKEN` is read from the environment only; never logged, never written to the report.
- Commit messages: Conventional Commits, ending with the session's attribution trailer lines.
- Work in worktree `/Users/nguyenhuyhoang/OtherProjects/agent-skills-standard-freshness-p2`, branch `feat/skill-freshness-p2` (off `develop` after PR #193). Pre-commit hook regenerates indices/mirrors; include what it stages.

---

## File Map

| Path | Responsibility |
|---|---|
| `scripts/freshness/sources.ts` | `UpstreamSource`, `LatestRelease`, `extractVersionFromTag`, `GithubSource`, `ManualSource`, `resolveSource` |
| `scripts/freshness/check.ts` | `checkUpstream()` → drift issues + `UpstreamStatus[]`; bounded concurrency; dedupe |
| `scripts/freshness/claims.ts` | `HISTORICAL_CONTEXT`, `VersionClaim.context`, precompiled alias regexes |
| `scripts/freshness/audit.ts` | downgrade historical `claim-behind-pin` to `low` |
| `scripts/freshness/index.ts` | `check` action, `--concurrency`, strict-blocking rule |
| `scripts/freshness/types.ts` | `VersionClaim.context` |
| `scripts/freshness/{sources,check}.test.ts`, updated `claims.test.ts`, `audit.test.ts` | tests |
| `.github/workflows/skill-freshness.yml` | weekly cron + dispatch |
| `package.json` | `freshness:check` |
| `docs/FRESHNESS.md`, `docs/SECURITY.md`, `CONTRIBUTING.md` | docs |

---

### Task 1: Upstream sources (GitHub releases → tags, manual)

**Files:**
- Create: `scripts/freshness/sources.ts`
- Test: `scripts/freshness/sources.test.ts`

**Interfaces:**
- Consumes: `UpstreamEntry` from `types.ts`; `parseVersion`, `compareVersions` from `versions.ts`.
- Produces:
  - `interface LatestRelease { version: string; tag: string; publishedAt: string | null; url: string }`
  - `interface UpstreamSource { latest(entry: UpstreamEntry): Promise<LatestRelease | null> }` — `null` means "nothing to compare" (manual, or no matching tag). Errors are thrown, not swallowed; `check.ts` turns them into `fetch-failed`.
  - `extractVersionFromTag(tag: string, tagPattern: string | undefined): string | null` — applies the pattern, joins capture groups with `.`; without a pattern, strips a leading `v` and requires 1-3 numeric parts.
  - `class GithubSource implements UpstreamSource` with constructor `(options?: { fetchImpl?: typeof fetch; token?: string; baseUrl?: string; maxTagPages?: number })`.
  - `class ManualSource implements UpstreamSource` — always resolves `null`.
  - `resolveSource(entry: UpstreamEntry, github: GithubSource): UpstreamSource`.

Behavior of `GithubSource.latest`:
1. `GET {baseUrl}/repos/{repo}/releases/latest`. On 200, if `tag_name` matches `tag_pattern`, return `{version, tag, publishedAt: published_at, url: html_url}`. If it does not match (e.g. the latest release tag is a prerelease-style name), fall through to tags.
2. On 404 (repo has no Releases) or pattern miss: `GET {baseUrl}/repos/{repo}/tags?per_page=100&page=N` for N = 1..maxTagPages (default 3), stop early on an empty page. Filter by `tag_pattern`, pick the max by `compareVersions`. Return `{version, tag, publishedAt: null, url: https://github.com/{repo}/releases/tag/{tag}}`. Return `null` if nothing matches.
3. Any other non-OK status (403 rate limit, 5xx) or network error → throw `Error("GitHub {status} for {repo}: {statusText}")`.
4. Headers: `Accept: application/vnd.github+json`, `User-Agent: agent-skills-standard-freshness`, and `Authorization: Bearer {token}` only when a token is given.

- [ ] **Step 1: Write the failing test**

```ts
// scripts/freshness/sources.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { GithubSource, ManualSource, extractVersionFromTag, resolveSource } from "./sources";
import type { UpstreamEntry } from "./types";

const next: UpstreamEntry = {
  name: "next",
  source: "github",
  repo: "vercel/next.js",
  pinned: "16.0.0",
  tag_pattern: "^v(\\d+\\.\\d+\\.\\d+)$",
  reviewed: "2026-06-17",
};

const postgres: UpstreamEntry = {
  name: "postgresql",
  source: "github",
  repo: "postgres/postgres",
  pinned: "17",
  tag_pattern: "^REL_(\\d+)_(\\d+)$",
  reviewed: "2026-06-17",
};

/** Builds a fetch stub keyed by URL (query string included). Records calls. */
function stubFetch(routes: Record<string, { status: number; body?: unknown }>) {
  const calls: { url: string; headers: Record<string, string> }[] = [];
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, headers: Object.fromEntries(Object.entries(init?.headers ?? {})) as Record<string, string> });
    const route = routes[url];
    if (!route) return new Response("not stubbed", { status: 500, statusText: "Unstubbed" });
    return new Response(route.body === undefined ? "" : JSON.stringify(route.body), {
      status: route.status,
      statusText: route.status === 200 ? "OK" : "Error",
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
  return { fetchImpl, calls };
}

const API = "https://api.github.com";

test("extractVersionFromTag applies the pattern and joins capture groups", () => {
  assert.equal(extractVersionFromTag("v16.0.1", "^v(\\d+\\.\\d+\\.\\d+)$"), "16.0.1");
  assert.equal(extractVersionFromTag("REL_17_2", "^REL_(\\d+)_(\\d+)$"), "17.2");
  assert.equal(extractVersionFromTag("jdk-25-ga", "^jdk-(\\d+)-ga$"), "25");
  assert.equal(extractVersionFromTag("v16.0.0-canary.3", "^v(\\d+\\.\\d+\\.\\d+)$"), null);
  assert.equal(extractVersionFromTag("v3.14.0rc1", "^v(\\d+\\.\\d+\\.\\d+)$"), null);
});

test("extractVersionFromTag without a pattern accepts plain semver with optional v", () => {
  assert.equal(extractVersionFromTag("v9.0.0", undefined), "9.0.0");
  assert.equal(extractVersionFromTag("9.1", undefined), "9.1");
  assert.equal(extractVersionFromTag("release-9", undefined), null);
});

test("GithubSource uses releases/latest when its tag matches the pattern", async () => {
  const { fetchImpl, calls } = stubFetch({
    [`${API}/repos/vercel/next.js/releases/latest`]: {
      status: 200,
      body: { tag_name: "v16.2.0", published_at: "2026-08-01T00:00:00Z", html_url: "https://github.com/vercel/next.js/releases/tag/v16.2.0" },
    },
  });
  const source = new GithubSource({ fetchImpl, token: "secret" });
  const latest = await source.latest(next);
  assert.deepEqual(latest, {
    version: "16.2.0",
    tag: "v16.2.0",
    publishedAt: "2026-08-01T00:00:00Z",
    url: "https://github.com/vercel/next.js/releases/tag/v16.2.0",
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].headers.Authorization, "Bearer secret");
  assert.equal(calls[0].headers.Accept, "application/vnd.github+json");
});

test("GithubSource falls back to tags on 404 and picks the highest matching tag across pages", async () => {
  const { fetchImpl, calls } = stubFetch({
    [`${API}/repos/postgres/postgres/releases/latest`]: { status: 404 },
    [`${API}/repos/postgres/postgres/tags?per_page=100&page=1`]: {
      status: 200,
      body: [{ name: "REL_17_2" }, { name: "REL_18_BETA3" }, { name: "REL_16_9" }],
    },
    [`${API}/repos/postgres/postgres/tags?per_page=100&page=2`]: {
      status: 200,
      body: [{ name: "REL_18_1" }, { name: "REL_17_5" }],
    },
    [`${API}/repos/postgres/postgres/tags?per_page=100&page=3`]: { status: 200, body: [] },
  });
  const source = new GithubSource({ fetchImpl });
  const latest = await source.latest(postgres);
  assert.deepEqual(latest, {
    version: "18.1",
    tag: "REL_18_1",
    publishedAt: null,
    url: "https://github.com/postgres/postgres/releases/tag/REL_18_1",
  });
  assert.equal(calls.length, 4);
  assert.equal(calls[0].headers.Authorization, undefined);
});

test("GithubSource falls back to tags when the latest release tag does not match the pattern", async () => {
  const { fetchImpl } = stubFetch({
    [`${API}/repos/vercel/next.js/releases/latest`]: {
      status: 200,
      body: { tag_name: "v17.0.0-canary.1", published_at: null, html_url: "x" },
    },
    [`${API}/repos/vercel/next.js/tags?per_page=100&page=1`]: {
      status: 200,
      body: [{ name: "v17.0.0-canary.1" }, { name: "v16.3.0" }],
    },
    [`${API}/repos/vercel/next.js/tags?per_page=100&page=2`]: { status: 200, body: [] },
  });
  const latest = await new GithubSource({ fetchImpl }).latest(next);
  assert.equal(latest?.version, "16.3.0");
});

test("GithubSource returns null when no tag matches and throws on other errors", async () => {
  const none = stubFetch({
    [`${API}/repos/vercel/next.js/releases/latest`]: { status: 404 },
    [`${API}/repos/vercel/next.js/tags?per_page=100&page=1`]: { status: 200, body: [{ name: "weird" }] },
    [`${API}/repos/vercel/next.js/tags?per_page=100&page=2`]: { status: 200, body: [] },
  });
  assert.equal(await new GithubSource({ fetchImpl: none.fetchImpl }).latest(next), null);

  const limited = stubFetch({
    [`${API}/repos/vercel/next.js/releases/latest`]: { status: 403 },
  });
  await assert.rejects(
    () => new GithubSource({ fetchImpl: limited.fetchImpl }).latest(next),
    /GitHub 403 for vercel\/next\.js/,
  );
});

test("ManualSource and resolveSource", async () => {
  const manual: UpstreamEntry = { name: "ios", source: "manual", pinned: "18", reviewed: "2026-07-09" };
  assert.equal(await new ManualSource().latest(manual), null);
  const gh = new GithubSource({ fetchImpl: stubFetch({}).fetchImpl });
  assert.ok(resolveSource(manual, gh) instanceof ManualSource);
  assert.equal(resolveSource(next, gh), gh);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/nguyenhuyhoang/OtherProjects/agent-skills-standard-freshness-p2 && node --import tsx --test scripts/freshness/sources.test.ts`
Expected: FAIL, cannot find module `./sources`.

- [ ] **Step 3: Write `sources.ts`**

```ts
// scripts/freshness/sources.ts
import type { UpstreamEntry } from "./types";
import { compareVersions, parseVersion } from "./versions";

/** Newest upstream version resolved for a pin. */
export interface LatestRelease {
  /** Normalized version, e.g. "16.2.0" or "18.1". */
  version: string;
  /** Raw tag name as published upstream. */
  tag: string;
  /** ISO timestamp when known (Releases API); null for bare tags. */
  publishedAt: string | null;
  /** Human-facing release or tag page. */
  url: string;
}

/**
 * Resolves the latest upstream version for a pin. Returns null when there
 * is nothing to compare (manual pins, no matching tag). Throws on transport
 * or API errors so the caller can report `fetch-failed`.
 */
export interface UpstreamSource {
  latest(entry: UpstreamEntry): Promise<LatestRelease | null>;
}

/**
 * Turns a tag into a comparable version. With a pattern, every capture
 * group is joined with "."; without one, a leading "v" is stripped and the
 * remainder must be 1-3 numeric parts. Returns null when the tag does not
 * qualify (prereleases, unrelated tags).
 */
export function extractVersionFromTag(
  tag: string,
  tagPattern: string | undefined,
): string | null {
  if (tagPattern) {
    const match = tag.match(new RegExp(tagPattern));
    if (!match || match.length < 2) return null;
    const version = match.slice(1).filter((g) => g !== undefined).join(".");
    return parseVersion(version) ? version : null;
  }
  const bare = tag.replace(/^v/i, "");
  return parseVersion(bare) ? bare : null;
}

interface GithubSourceOptions {
  /** Injectable fetch for tests; defaults to the global fetch. */
  fetchImpl?: typeof fetch;
  /** Personal/Actions token; sent as a Bearer header when present. */
  token?: string;
  /** API origin; defaults to https://api.github.com. */
  baseUrl?: string;
  /** How many 100-tag pages to scan when falling back to tags. */
  maxTagPages?: number;
}

/** GitHub releases/latest with a tags fallback for repos that publish no Releases. */
export class GithubSource implements UpstreamSource {
  private readonly fetchImpl: typeof fetch;
  private readonly token: string | undefined;
  private readonly baseUrl: string;
  private readonly maxTagPages: number;

  constructor(options: GithubSourceOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
    this.token = options.token;
    this.baseUrl = options.baseUrl ?? "https://api.github.com";
    this.maxTagPages = options.maxTagPages ?? 3;
  }

  /** See UpstreamSource.latest. */
  async latest(entry: UpstreamEntry): Promise<LatestRelease | null> {
    if (entry.source !== "github" || !entry.repo) return null;
    const fromRelease = await this.latestRelease(entry);
    if (fromRelease) return fromRelease;
    return this.latestTag(entry);
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "agent-skills-standard-freshness",
    };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    return headers;
  }

  private async get(path: string, repo: string): Promise<{ status: number; json: unknown }> {
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, { headers: this.headers() });
    if (res.status === 404) return { status: 404, json: null };
    if (!res.ok) throw new Error(`GitHub ${res.status} for ${repo}: ${res.statusText}`);
    return { status: res.status, json: await res.json() };
  }

  private async latestRelease(entry: UpstreamEntry): Promise<LatestRelease | null> {
    const repo = entry.repo as string;
    const { status, json } = await this.get(`/repos/${repo}/releases/latest`, repo);
    if (status === 404 || !json || typeof json !== "object") return null;
    const data = json as { tag_name?: string; published_at?: string | null; html_url?: string };
    if (!data.tag_name) return null;
    const version = extractVersionFromTag(data.tag_name, entry.tag_pattern);
    if (!version) return null;
    return {
      version,
      tag: data.tag_name,
      publishedAt: data.published_at ?? null,
      url: data.html_url ?? `https://github.com/${repo}/releases/tag/${data.tag_name}`,
    };
  }

  private async latestTag(entry: UpstreamEntry): Promise<LatestRelease | null> {
    const repo = entry.repo as string;
    let best: { version: string; parts: number[]; tag: string } | null = null;
    for (let page = 1; page <= this.maxTagPages; page++) {
      const { status, json } = await this.get(`/repos/${repo}/tags?per_page=100&page=${page}`, repo);
      if (status === 404 || !Array.isArray(json) || json.length === 0) break;
      for (const item of json as { name?: string }[]) {
        if (!item.name) continue;
        const version = extractVersionFromTag(item.name, entry.tag_pattern);
        const parts = version ? parseVersion(version) : null;
        if (!version || !parts) continue;
        if (!best || compareVersions(parts, best.parts) > 0) best = { version, parts, tag: item.name };
      }
    }
    if (!best) return null;
    return {
      version: best.version,
      tag: best.tag,
      publishedAt: null,
      url: `https://github.com/${repo}/releases/tag/${best.tag}`,
    };
  }
}

/** Pins with `source: manual` are never fetched; only their review age is audited. */
export class ManualSource implements UpstreamSource {
  /** Always null: nothing to compare. */
  async latest(): Promise<LatestRelease | null> {
    return null;
  }
}

const MANUAL = new ManualSource();

/** Picks the source implementation for an entry. */
export function resolveSource(entry: UpstreamEntry, github: GithubSource): UpstreamSource {
  return entry.source === "github" ? github : MANUAL;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import tsx --test scripts/freshness/sources.test.ts`
Expected: 7 passing, pristine.

- [ ] **Step 5: Commit**

```bash
git add scripts/freshness/sources.ts scripts/freshness/sources.test.ts
git commit -m "feat(freshness): GitHub releases/tags upstream source with manual no-op"
```

---

### Task 2: Upstream drift check

**Files:**
- Create: `scripts/freshness/check.ts`
- Test: `scripts/freshness/check.test.ts`

**Interfaces:**
- Consumes: `EffectivePin`, `FreshnessIssue`, `UpstreamStatus` from `types.ts`; `UpstreamSource`, `GithubSource`, `resolveSource` from `sources.ts`; `CLAIM_ALIASES` from `claims.ts` (for significance); `parseVersion`, `compareVersions`, `significantPart` from `versions.ts`.
- Produces:
  - `interface CheckResult { issues: FreshnessIssue[]; upstream: UpstreamStatus[] }`
  - `checkUpstream(pins: EffectivePin[], github: GithubSource, options?: { concurrency?: number }): Promise<CheckResult>`
  - `uniquePins(pins: EffectivePin[]): EffectivePin[]` — dedupe on `category + (origin === "category" ? "" : skillName) + name`, same rule `audit.ts` uses for `reviewed-stale`, so a category pin shared by 18 skills is fetched once.
  - `driftIssue(pin: EffectivePin, latest: LatestRelease): FreshnessIssue | null` — pure comparison.

Rules:
- Significance = `CLAIM_ALIASES[pin.name]?.significance ?? "major"`.
- `upstream-major-drift` (high) when `latest` major > pinned major.
- `upstream-minor-drift` (low) when majors equal and `latest` > pinned at minor/patch (compare full parsed arrays).
- Equal or pinned ahead → no issue.
- `source.latest` throws → `fetch-failed` (warn) with the error message; `UpstreamStatus.latest = null`.
- Manual / null → no issue; still an `UpstreamStatus` row with `latest: null` so the report shows what was skipped.
- Every row's `skillName` is `""` for category-origin pins.

- [ ] **Step 1: Write the failing test**

```ts
// scripts/freshness/check.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { checkUpstream, driftIssue, uniquePins } from "./check";
import { GithubSource } from "./sources";
import type { EffectivePin } from "./types";

function pin(over: Partial<EffectivePin>): EffectivePin {
  return {
    name: "next",
    source: "github",
    repo: "vercel/next.js",
    pinned: "16.0.0",
    tag_pattern: "^v(\\d+\\.\\d+\\.\\d+)$",
    reviewed: "2026-06-17",
    category: "nextjs",
    skillName: "nextjs-app-router",
    origin: "category",
    ...over,
  };
}

test("uniquePins collapses category pins shared by many skills, keeps skill pins apart", () => {
  const pins = [
    pin({ skillName: "nextjs-app-router" }),
    pin({ skillName: "nextjs-caching" }),
    pin({ name: "react", repo: "facebook/react", pinned: "19.1.0", skillName: "nextjs-caching", origin: "skill" }),
    pin({ name: "react", repo: "facebook/react", pinned: "19.1.0", skillName: "nextjs-app-router", origin: "skill" }),
  ];
  const unique = uniquePins(pins);
  assert.deepEqual(
    unique.map((p) => `${p.category}:${p.origin === "category" ? "" : p.skillName}:${p.name}`),
    ["nextjs::next", "nextjs:nextjs-caching:react", "nextjs:nextjs-app-router:react"],
  );
});

test("driftIssue classifies major, minor, equal, and pinned-ahead", () => {
  const rel = (version: string) => ({ version, tag: `v${version}`, publishedAt: null, url: "u" });
  assert.equal(driftIssue(pin({}), rel("17.0.0"))?.type, "upstream-major-drift");
  assert.equal(driftIssue(pin({}), rel("17.0.0"))?.severity, "high");
  assert.equal(driftIssue(pin({}), rel("16.3.1"))?.type, "upstream-minor-drift");
  assert.equal(driftIssue(pin({}), rel("16.3.1"))?.severity, "low");
  assert.equal(driftIssue(pin({}), rel("16.0.0")), null);
  assert.equal(driftIssue(pin({}), rel("15.9.0")), null);
  // minor-significant alias: go 1.24 -> 1.25 is a major-class drift
  const go = pin({ name: "go", repo: "golang/go", pinned: "1.24.0", category: "golang", tag_pattern: "^go(\\d+\\.\\d+(?:\\.\\d+)?)$" });
  assert.equal(driftIssue(go, rel("1.25.0"))?.type, "upstream-major-drift");
  assert.equal(driftIssue(go, rel("1.24.6"))?.type, "upstream-minor-drift");
  // unknown alias defaults to major
  const bloc = pin({ name: "bloc", repo: "felangel/bloc", pinned: "9.0.0", category: "flutter", origin: "skill", skillName: "flutter-bloc-state-management" });
  assert.equal(driftIssue(bloc, rel("9.1.0"))?.type, "upstream-minor-drift");
});

test("checkUpstream fetches once per unique pin, reports drift, fetch-failed, and manual rows", async () => {
  const urls: string[] = [];
  const fetchImpl = (async (input: string | URL | Request) => {
    const url = String(input);
    urls.push(url);
    if (url.includes("vercel/next.js/releases/latest")) {
      return new Response(JSON.stringify({ tag_name: "v17.0.0", published_at: "2026-09-01T00:00:00Z", html_url: "https://github.com/vercel/next.js/releases/tag/v17.0.0" }), { status: 200 });
    }
    if (url.includes("facebook/react/releases/latest")) {
      return new Response("", { status: 403, statusText: "rate limited" });
    }
    return new Response("", { status: 500, statusText: "unexpected" });
  }) as typeof fetch;

  const pins: EffectivePin[] = [
    pin({ skillName: "nextjs-app-router" }),
    pin({ skillName: "nextjs-caching" }),
    pin({ name: "react", repo: "facebook/react", pinned: "19.1.0", category: "react", skillName: "react-hooks" }),
    pin({ name: "ios", source: "manual", repo: undefined, tag_pattern: undefined, pinned: "18", category: "ios", skillName: "ios-swiftui" }),
  ];
  const result = await checkUpstream(pins, new GithubSource({ fetchImpl }), { concurrency: 2 });

  assert.equal(urls.filter((u) => u.includes("vercel/next.js")).length, 1);
  const types = result.issues.map((i) => `${i.type}:${i.category}:${i.upstream}`).sort();
  assert.deepEqual(types, ["fetch-failed:react:react", "upstream-major-drift:nextjs:next"]);
  const drift = result.issues.find((i) => i.type === "upstream-major-drift");
  assert.equal(drift?.severity, "high");
  assert.equal(drift?.skillName, "");
  assert.match(drift?.message ?? "", /17\.0\.0/);
  const failed = result.issues.find((i) => i.type === "fetch-failed");
  assert.equal(failed?.severity, "warn");
  assert.match(failed?.message ?? "", /403/);

  const rows = result.upstream.map((u) => [u.category, u.name, u.pinned, u.latest, u.releaseUrl]);
  assert.deepEqual(rows.sort(), [
    ["ios", "ios", "18", null, null],
    ["nextjs", "next", "16.0.0", "17.0.0", "https://github.com/vercel/next.js/releases/tag/v17.0.0"],
    ["react", "react", "19.1.0", null, null],
  ]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test scripts/freshness/check.test.ts`
Expected: FAIL, cannot find module `./check`.

- [ ] **Step 3: Write `check.ts`**

```ts
// scripts/freshness/check.ts
import { CLAIM_ALIASES } from "./claims";
import { GithubSource, resolveSource, type LatestRelease } from "./sources";
import type { EffectivePin, FreshnessIssue, UpstreamStatus } from "./types";
import { compareVersions, parseVersion, significantPart } from "./versions";

/** Output of the network check: drift issues plus one status row per unique pin. */
export interface CheckResult {
  issues: FreshnessIssue[];
  upstream: UpstreamStatus[];
}

interface CheckOptions {
  /** Parallel fetches; defaults to 5. */
  concurrency?: number;
}

/**
 * One entry per distinct pin. Category pins are shared by every skill in
 * the category, so they collapse to a single row (skillName ""), matching
 * the dedupe rule audit.ts uses for reviewed-stale.
 */
export function uniquePins(pins: EffectivePin[]): EffectivePin[] {
  const seen = new Map<string, EffectivePin>();
  for (const pin of pins) {
    const skillName = pin.origin === "category" ? "" : pin.skillName;
    const key = `${pin.category}:${skillName}:${pin.name}`;
    if (!seen.has(key)) seen.set(key, { ...pin, skillName });
  }
  return [...seen.values()];
}

/**
 * Compares a pin against the latest upstream version at the alias's
 * significance (major, or major.minor for Go/Flutter-style versioning;
 * unknown aliases default to major). Returns null when not behind.
 */
export function driftIssue(pin: EffectivePin, latest: LatestRelease): FreshnessIssue | null {
  const pinned = parseVersion(pin.pinned);
  const current = parseVersion(latest.version);
  if (!pinned || !current) return null;
  const significance = CLAIM_ALIASES[pin.name]?.significance ?? "major";
  const base = {
    category: pin.category,
    skillName: pin.skillName,
    upstream: pin.name,
  };
  if (compareVersions(significantPart(current, significance), significantPart(pinned, significance)) > 0) {
    return {
      ...base,
      type: "upstream-major-drift",
      severity: "high",
      message: `Upstream "${pin.name}" is at ${latest.version} (${latest.tag}); pin is ${pin.pinned}. Review the skill(s) against the new release: ${latest.url}`,
    };
  }
  if (compareVersions(current, pinned) > 0) {
    return {
      ...base,
      type: "upstream-minor-drift",
      severity: "low",
      message: `Upstream "${pin.name}" is at ${latest.version}; pin is ${pin.pinned} (same ${significance})`,
    };
  }
  return null;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * Fetches the latest version for every unique pin and turns the result
 * into drift issues and status rows. Transport/API errors become
 * `fetch-failed` (warn) and never throw.
 */
export async function checkUpstream(
  pins: EffectivePin[],
  github: GithubSource,
  options: CheckOptions = {},
): Promise<CheckResult> {
  const unique = uniquePins(pins);
  const issues: FreshnessIssue[] = [];
  const upstream: UpstreamStatus[] = [];

  const rows = await mapWithConcurrency(unique, options.concurrency ?? 5, async (pin) => {
    const status: UpstreamStatus = {
      category: pin.category,
      skillName: pin.skillName,
      name: pin.name,
      pinned: pin.pinned,
      latest: null,
      publishedAt: null,
      releaseUrl: null,
    };
    try {
      const latest = await resolveSource(pin, github).latest(pin);
      if (!latest) return { status, issue: null };
      status.latest = latest.version;
      status.publishedAt = latest.publishedAt;
      status.releaseUrl = latest.url;
      return { status, issue: driftIssue(pin, latest) };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        status,
        issue: {
          type: "fetch-failed" as const,
          severity: "warn" as const,
          category: pin.category,
          skillName: pin.skillName,
          upstream: pin.name,
          message: `Could not fetch upstream "${pin.name}" (${pin.repo ?? "manual"}): ${message}`,
        },
      };
    }
  });

  for (const row of rows) {
    upstream.push(row.status);
    if (row.issue) issues.push(row.issue);
  }
  return { issues, upstream };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import tsx --test scripts/freshness/check.test.ts`
Expected: 3 passing.

- [ ] **Step 5: Commit**

```bash
git add scripts/freshness/check.ts scripts/freshness/check.test.ts
git commit -m "feat(freshness): upstream drift check with bounded concurrency"
```

---

### Task 3: `check` action, package script, strict-blocking rule

**Files:**
- Modify: `scripts/freshness/index.ts`
- Modify: `package.json` (after `freshness:audit`)

**Interfaces:**
- Consumes: `checkUpstream`, `GithubSource`, plus existing `auditFreshness`, `buildReport`, `renderMarkdown`. Needs the effective pins: reuse `walkSkills`, `loadCategoryPins`, `effectivePins` from `skills.ts`/`pins.ts`.
- Produces: `pnpm freshness:check [--stale-days n] [--concurrency n]`; exit 1 on any `high`.

- [ ] **Step 1: Rewrite `main` in `index.ts`**

Replace the whole file body below the constants with:

```ts
const DEFAULT_STALE_DAYS = 120;
const DEFAULT_CONCURRENCY = 5;

function flagValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  if (index + 1 >= process.argv.length) {
    throw new Error(`${name} requires a value`);
  }
  return process.argv[index + 1];
}

function positiveNumberFlag(name: string, fallback: number): number {
  const value = Number(flagValue(name) ?? fallback);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number`);
  }
  return value;
}

function writeReport(report: FreshnessReport): void {
  fs.ensureDirSync(FRESHNESS_DIR);
  fs.writeJSONSync(FRESHNESS_JSON, report, { spaces: 2 });
  fs.writeFileSync(FRESHNESS_MD, renderMarkdown(report));
}

function printIssues(report: FreshnessReport, label: string, suffix: string): void {
  const s = report.summary.bySeverity;
  console.log(
    `${label}: ${report.summary.issueCount} issues (high ${s.high}, med ${s.med}, low ${s.low}, warn ${s.warn})${suffix}`,
  );
  for (const issue of report.issues) {
    const loc = issue.file ? ` [${issue.file}${issue.line ? `:${issue.line}` : ""}]` : "";
    console.log(
      `  ${issue.severity.padEnd(4)} ${issue.type.padEnd(20)} ${issue.category}/${issue.skillName || "-"}${loc}: ${issue.message}`,
    );
  }
}

/** Issues that block `audit --strict`: missing pins and non-historical claim mismatches. */
export function isStrictBlocking(issue: FreshnessIssue): boolean {
  if (issue.type === "missing-pin") return true;
  return issue.type.startsWith("claim-") && issue.severity !== "low";
}

/** Effective pins for every skill in the repo (category ∪ skill), flattened. */
function collectPins(): EffectivePin[] {
  const skillsDir = path.join(ROOT_DIR, "skills");
  const categoryPins = loadCategoryPins(path.join(skillsDir, "metadata.json"));
  return walkSkills(skillsDir).flatMap((skill) => effectivePins(skill, categoryPins));
}

/**
 * CLI entry. Actions:
 * - `audit` (default): offline rules; prints a summary; `--write` saves the
 *   report; `--strict` exits 1 on any missing-pin or non-low claim-* issue.
 * - `check`: offline rules plus the GitHub upstream check; always writes
 *   the report; exits 1 on any high issue. Reads GITHUB_TOKEN when set.
 * - `report`: re-renders Markdown from the last JSON report.
 * Flags: `--stale-days <n>` (default 120), `--concurrency <n>` (check, default 5).
 */
export async function main(): Promise<void> {
  const action = process.argv[2] ?? "audit";
  const staleDays = positiveNumberFlag("--stale-days", DEFAULT_STALE_DAYS);

  if (action === "audit") {
    const issues = auditFreshness(ROOT_DIR, { staleDays });
    const report = buildReport("audit", staleDays, issues, []);
    const write = process.argv.includes("--write");
    if (write) writeReport(report);
    printIssues(report, "Freshness audit", write ? ` → ${FRESHNESS_JSON}` : "");
    const blocking = issues.filter(isStrictBlocking);
    if (process.argv.includes("--strict") && blocking.length > 0) {
      console.error(`Strict mode: ${blocking.length} blocking issue(s)`);
      process.exitCode = 1;
    }
    return;
  }

  if (action === "check") {
    const concurrency = positiveNumberFlag("--concurrency", DEFAULT_CONCURRENCY);
    const offline = auditFreshness(ROOT_DIR, { staleDays });
    const github = new GithubSource({ token: process.env.GITHUB_TOKEN || undefined });
    const { issues: drift, upstream } = await checkUpstream(collectPins(), github, { concurrency });
    const report = buildReport("check", staleDays, [...offline, ...drift], upstream);
    writeReport(report);
    printIssues(report, "Freshness check", ` → ${FRESHNESS_JSON}`);
    if (!process.env.GITHUB_TOKEN) {
      console.log("  (no GITHUB_TOKEN set; unauthenticated GitHub API limit is 60 requests/hour)");
    }
    if (report.summary.bySeverity.high > 0) {
      console.error(`${report.summary.bySeverity.high} high-severity upstream drift issue(s)`);
      process.exitCode = 1;
    }
    return;
  }

  if (action === "report") {
    if (!fs.existsSync(FRESHNESS_JSON)) {
      throw new Error(`No report at ${FRESHNESS_JSON}; run "freshness:audit --write" or "freshness:check" first`);
    }
    const report = fs.readJSONSync(FRESHNESS_JSON) as FreshnessReport;
    fs.writeFileSync(FRESHNESS_MD, renderMarkdown(report));
    console.log(`Freshness report rendered → ${FRESHNESS_MD}`);
    return;
  }

  throw new Error(`Unknown action: ${action}; use audit, check, or report`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
```

Update the imports at the top of the file to:

```ts
import fs from "fs-extra";
import path from "path";
import { ROOT_DIR } from "../evals/constants";
import { auditFreshness } from "./audit";
import { checkUpstream } from "./check";
import { effectivePins, loadCategoryPins } from "./pins";
import { buildReport, renderMarkdown } from "./report";
import { walkSkills } from "./skills";
import { GithubSource } from "./sources";
import type { EffectivePin, FreshnessIssue, FreshnessReport } from "./types";
```

- [ ] **Step 2: Add the package script**

In `package.json`, after `"freshness:audit"` add:
```json
"freshness:check": "tsx scripts/freshness/index.ts check",
```

- [ ] **Step 3: Verify locally**

Run, in order:
```bash
pnpm freshness:audit | head -3                                   # unchanged behaviour, exit 0
pnpm freshness:audit --strict; echo "exit=$?"                    # exit 1 (7 med claim-behind-pin today)
pnpm freshness:check --concurrency 3; echo "exit=$?"             # network; see below
head -40 benchmarks/freshness/freshness-report.md
git status --porcelain                                           # empty (report dir is gitignored)
```
`check` expectations: the `## Upstream` table has one row per unique pin (~24). With a `GITHUB_TOKEN` in the environment most rows have a `latest`; without one you may see `fetch-failed` 403 rows once the 60/h limit is hit — that is the documented behaviour, not a bug. Exit code is 1 if any `upstream-major-drift` appeared. Paste the printed summary line and the `## Upstream` table into your report.

Add a unit test for the pure helper in a new file `scripts/freshness/index.test.ts`:

```ts
// scripts/freshness/index.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { isStrictBlocking } from "./index";
import type { FreshnessIssue } from "./types";

const base = { category: "x", skillName: "", message: "" };

test("isStrictBlocking: missing-pin and non-low claim issues block; historical (low) claims do not", () => {
  const cases: [FreshnessIssue, boolean][] = [
    [{ ...base, type: "missing-pin", severity: "low" }, true],
    [{ ...base, type: "claim-behind-pin", severity: "med" }, true],
    [{ ...base, type: "claim-ahead-of-pin", severity: "med" }, true],
    [{ ...base, type: "claim-behind-pin", severity: "low" }, false],
    [{ ...base, type: "reviewed-stale", severity: "med" }, false],
    [{ ...base, type: "upstream-major-drift", severity: "high" }, false],
  ];
  for (const [issue, expected] of cases) assert.equal(isStrictBlocking(issue), expected, issue.type);
});
```

Run: `pnpm test:freshness` → all passing (the previous 22 + 7 sources + 3 check + 1 index = 33). Importing `./index` in a test must not execute `main()` — the entry guard compares `process.argv[1]` to `__filename`, which differs under `node --test`, so it stays inert; confirm no report file is written by the test run.

- [ ] **Step 4: Commit**

```bash
git add scripts/freshness/index.ts scripts/freshness/index.test.ts package.json
git commit -m "feat(freshness): check action with GitHub upstream drift, strict rule excludes low claims"
```

---

### Task 4: Historical-claim context filter and precompiled alias regexes

**Files:**
- Modify: `scripts/freshness/types.ts` (`VersionClaim`)
- Modify: `scripts/freshness/claims.ts` (`HISTORICAL_CONTEXT`, `scanText`)
- Modify: `scripts/freshness/audit.ts` (claim-behind-pin severity)
- Test: `scripts/freshness/claims.test.ts`, `scripts/freshness/audit.test.ts`

**Interfaces:**
- Produces: `VersionClaim.context: "current" | "historical"`; `HISTORICAL_CONTEXT: RegExp` exported from `claims.ts`.
- Behavior: a claim is `historical` when the same line, lowercased, matches `HISTORICAL_CONTEXT` = `/\b(since|pre-|before|legacy|migrat\w*|upgrad\w*|deprecated|unsupported|older|previous|from)\b|\bpre-/`. Only affects `claim-behind-pin`: severity becomes `low` and the message gets the suffix ` (historical reference on the same line)`. `claim-ahead-of-pin` is unaffected (a newer version mentioned anywhere still means the pin is stale).

- [ ] **Step 1: Add the failing tests**

Append to `scripts/freshness/claims.test.ts`:

```ts
test("scanText marks claims as historical from same-line context words", () => {
  const text = [
    "Stdlib since Go 1.21 ships log/slog.",          // historical
    "Use Go 1.24 generics freely.",                  // current
    "Pre-iOS 17 builds need the fallback.",          // historical (pre-)
    "Migrating from PHP 7 to PHP 8 is documented.",  // both historical (migrat + from)
    "AGP 8 → AGP 9 upgrade guide",                   // historical (upgrad)
  ].join("\n");
  const claims = scanText(text, "f.md", who);
  const ctx = Object.fromEntries(claims.map((c) => [`${c.name}:${c.version}:${c.line}`, c.context]));
  assert.equal(ctx["go:1.21:1"], "historical");
  assert.equal(ctx["go:1.24:2"], "current");
  assert.equal(ctx["ios:17:3"], "historical");
  assert.equal(ctx["php:7:4"], "historical");
  assert.equal(ctx["php:8:4"], "historical");
  assert.equal(ctx["agp:8:5"], "historical");
  assert.equal(ctx["agp:9:5"], "historical");
});
```

Note: the existing first test asserts `claims.length === 5` on a five-line text and reads `.version`/`.floor`/`.line`; it keeps passing because `context` is an additional field.

In `scripts/freshness/audit.test.ts`, extend `fixture()` with one more skill in the existing `nextjs` category:

```ts
  await mk("nextjs", "nextjs-upgrade", "Upgrading from Next.js 14 to 16.\nStill targets Next.js 14 in the old app.");
```

and add to the expected sorted key list (alphabetical, after `"claim-behind-pin:nextjs:nextjs-legacy:next"`):

```ts
      "claim-behind-pin:nextjs:nextjs-upgrade:next",
      "claim-behind-pin:nextjs:nextjs-upgrade:next",
```

(two hits: line 5 historical, line 6 current — same key). Then add a new test after the existing issue-set test:

```ts
test("historical claim-behind-pin is downgraded to low; current stays med", async () => {
  const { root, cleanup } = await fixture();
  try {
    const issues = auditFreshness(root, { staleDays: 60, today: TODAY }).filter(
      (i) => i.type === "claim-behind-pin" && i.skillName === "nextjs-upgrade",
    );
    assert.equal(issues.length, 2);
    const byLine = Object.fromEntries(issues.map((i) => [i.line, i]));
    assert.equal(byLine[5]?.severity, "low");
    assert.match(byLine[5]?.message ?? "", /historical reference/);
    assert.equal(byLine[6]?.severity, "med");
  } finally {
    await cleanup();
  }
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --import tsx --test scripts/freshness/claims.test.ts scripts/freshness/audit.test.ts`
Expected: the new claims test fails (`context` undefined); the audit issue-set test fails on the key list; the new audit test fails on severity.

- [ ] **Step 3: Implement**

`scripts/freshness/types.ts` — in `VersionClaim`, after `floor: boolean;` add:
```ts
  /**
   * "historical" when the same line reads as a reference to an older
   * version ("since Go 1.21", "pre-iOS 17", "migrating from PHP 7"),
   * "current" otherwise. Only claim-behind-pin severity depends on it.
   */
  context: "current" | "historical";
```

`scripts/freshness/claims.ts`:

After `CLAIM_ALIASES`, add:
```ts
/**
 * Same-line words that mark a version mention as a reference to the past
 * rather than guidance to use that version. Matched case-insensitively.
 */
export const HISTORICAL_CONTEXT =
  /\b(since|before|legacy|migrat\w*|upgrad\w*|deprecated|unsupported|older|previous|from)\b|\bpre-/i;

/** Alias regexes compiled once with the global flag; reset lastIndex before each use. */
const COMPILED_ALIASES: [string, RegExp][] = Object.entries(CLAIM_ALIASES).map(
  ([name, alias]) => [name, new RegExp(alias.pattern.source, "g")],
);
```

Replace the body of `scanText` with:
```ts
  const claims: VersionClaim[] = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((lineText, index) => {
    const context = HISTORICAL_CONTEXT.test(lineText) ? "historical" : "current";
    for (const [name, re] of COMPILED_ALIASES) {
      re.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = re.exec(lineText)) !== null) {
        const after = lineText.charAt(match.index + match[0].length);
        claims.push({
          category: skill.category,
          skillName: skill.name,
          name,
          version: match[1],
          floor: after === "+",
          context,
          file,
          line: index + 1,
        });
      }
    }
  });
  return claims;
```

`scripts/freshness/audit.ts` — in the `claim-behind-pin` branch, replace the pushed object with:
```ts
        const historical = claim.context === "historical";
        issues.push({
          type: "claim-behind-pin",
          severity: historical ? "low" : "med",
          category: skill.category,
          skillName: skill.name,
          upstream: claim.name,
          message:
            `Claims "${claim.name} ${claim.version}" but pin is ${pin.pinned}; ` +
            (historical
              ? "historical reference on the same line, review only if the guidance itself is stale"
              : 'update the guidance or mark as a floor with "+"'),
          file: claim.file,
          line: claim.line,
        });
```

- [ ] **Step 4: Run tests, then the real audit**

Run: `pnpm test:freshness` → 35 passing (33 + 2 new).
Run: `pnpm freshness:audit` and paste the output into your report. Expected shape: still 8 issues, but `golang-logging` ("since Go 1.21"), `ios-swiftui` ("pre-iOS 17" — confirm the exact line text; if the line does not contain a context word it stays `med`), `php-error-handling` ("PHP 7 ..."), the two `android` AGP hits (BEFORE/migration tables) and `nextjs-upgrade` become `low`; `nextjs-pages-router` stays `med` unless its line has a context word. Then `pnpm freshness:audit --strict; echo $?` — exit 1 only if any `med` claim remains. Report exactly which remained `med` and the line text; do not edit skill prose.

- [ ] **Step 5: Commit**

```bash
git add scripts/freshness/types.ts scripts/freshness/claims.ts scripts/freshness/audit.ts scripts/freshness/claims.test.ts scripts/freshness/audit.test.ts
git commit -m "feat(freshness): downgrade historical version references, precompile alias regexes"
```

---

### Task 5: Weekly workflow, docs, security row

**Files:**
- Create: `.github/workflows/skill-freshness.yml`
- Modify: `docs/FRESHNESS.md`
- Modify: `docs/SECURITY.md` (AST07 row, line 15)
- Modify: `CONTRIBUTING.md` (line ~91, next to `pnpm freshness:audit`)

- [ ] **Step 1: Workflow**

```yaml
# .github/workflows/skill-freshness.yml
name: Skill Freshness Check

# Weekly upstream drift check: compares every pin in skills/metadata.json
# (and per-skill metadata.upstream) against the latest GitHub release/tag
# and publishes benchmarks/freshness/ as an artifact and step summary.
# A red run means at least one upstream shipped a new major; see
# docs/FRESHNESS.md "Reviewing a category".

on:
  schedule:
    - cron: "0 7 * * 1" # Mondays 07:00 UTC, an hour after skillspector-scan
  workflow_dispatch:
    inputs:
      stale_days:
        description: "Days before a pin's reviewed date counts as stale"
        required: false
        default: "120"

permissions:
  contents: read

jobs:
  check:
    name: Upstream drift
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      - uses: actions/setup-node@v7
        with:
          node-version: "20.x"

      - name: Install pnpm
        uses: pnpm/action-setup@v6

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Freshness check (audit + GitHub upstream)
        id: check
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: pnpm freshness:check --stale-days "${{ github.event.inputs.stale_days || '120' }}"
        continue-on-error: true

      - name: Publish step summary
        if: always()
        run: cat benchmarks/freshness/freshness-report.md >> "$GITHUB_STEP_SUMMARY"

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v7
        with:
          name: freshness-report
          path: benchmarks/freshness/
          retention-days: 90

      - name: Fail on high-severity drift
        if: steps.check.outcome == 'failure'
        run: |
          echo "::error::Upstream major drift detected — open the step summary for the affected categories."
          exit 1
```

`continue-on-error` on the check step plus the final gate step means the summary and artifact are always published even when the run is red.

- [ ] **Step 2: `docs/FRESHNESS.md`**

Make these edits (keep everything else):

1. Commands table: add rows
```markdown
| `pnpm freshness:check` | offline rules **plus** latest GitHub release/tag per pin; runs weekly | always writes both report files |
| `pnpm freshness:check --concurrency 3` | limit parallel GitHub requests (default 5) | — |
```
and change the `--strict` row description to "same, exit 1 on any `missing-pin` or any `claim-*` issue that is not `low` (historical references are `low`)".

2. Issue-types table: remove the "(network check, phase 2)" parentheticals from `upstream-major-drift`, `upstream-minor-drift`, `fetch-failed`, and change the `claim-behind-pin` row to:
```markdown
| `claim-behind-pin` | med / low | prose claims an older version and is not a floor (`15+`). `low` when the same line reads as a historical reference (`since`, `pre-`, `before`, `legacy`, `migrat…`, `upgrad…`, `deprecated`, `unsupported`, `older`, `previous`, `from`); `med` otherwise: update the guidance or add `+` |
```

3. New section after "## Issue types":
```markdown
## Upstream check

`pnpm freshness:check` resolves every `source: github` pin through the GitHub API: `GET /repos/{repo}/releases/latest` first, then `GET /repos/{repo}/tags` (up to 300 tags) when the repo publishes no Releases or the latest release tag does not match `tag_pattern`. Prerelease tags never match a well-formed `tag_pattern`, so they are ignored. `source: manual` pins are listed in the report with no `latest`.

Set `GITHUB_TOKEN` (any token with public repo read) to lift the unauthenticated limit of 60 requests/hour; the token is only sent as a header and never written to the report. Requests that fail (rate limit, 5xx, network) become `fetch-failed` (warn) and never fail the run.

The weekly workflow `.github/workflows/skill-freshness.yml` runs the check every Monday, attaches `benchmarks/freshness/` as the `freshness-report` artifact, prints the Markdown report as the job summary, and goes red only on `upstream-major-drift`. Trigger it by hand from the Actions tab (`workflow_dispatch`, optional `stale_days`).
```

4. Baseline section: replace the paragraph starting "Most `claim-behind-pin` hits in this baseline are historical references" with:
```markdown
Historical references on the same line (`since Go 1.21`, `pre-iOS 17`, `migrating from PHP 7`) are reported at `low` and do not block `--strict`; only `med` claim mismatches and `missing-pin` do. Do not rewrite prose to silence a `low` hit.
```
Replace the paragraph starting "`reviewed-mismatch` currently compares only category pins" with:
```markdown
`reviewed-mismatch` compares category pins against `framework-map.md` only. Skill-level pins track a library or engine the category map does not cover, so their `reviewed` date is independent of the map by design.
```
Replace the fenced baseline block with the current `pnpm freshness:audit` output from Task 4 Step 4 and update the heading date to today.

- [ ] **Step 3: `docs/SECURITY.md` and `CONTRIBUTING.md`**

In `docs/SECURITY.md` line 15 (AST07 row), append to the controls cell, before the closing `|`:
```
; weekly `skill-freshness.yml` compares every upstream pin in `skills/metadata.json` against the latest GitHub release/tag and flags major drift (`docs/FRESHNESS.md`)
```

In `CONTRIBUTING.md`, directly after the `pnpm freshness:audit` line inside the command block, add:
```
pnpm freshness:check   # network: latest GitHub release per pin (set GITHUB_TOKEN)
```

- [ ] **Step 4: Verify**

```bash
pnpm test:freshness            # 35 passing
pnpm validate:all              # exit 0
pnpm audit:sdlc | tail -1      # passed
npx prettier --check .github/workflows/skill-freshness.yml docs/FRESHNESS.md
git status --porcelain         # only the files above (+ hook-staged mirrors if any)
```

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/skill-freshness.yml docs/FRESHNESS.md docs/SECURITY.md CONTRIBUTING.md
git commit -m "ci(freshness): weekly upstream drift workflow, check docs, AST07 row"
```

---

### Task 6: Push and open the PR

- [ ] **Step 1: Full verification on the final tree**

```bash
pnpm test && pnpm validate:all && pnpm audit:sdlc | tail -1
```
All green, `git status --porcelain` empty.

- [ ] **Step 2: Push and PR**

```bash
git push -u origin feat/skill-freshness-p2
gh pr create --base develop --title "feat(freshness): GitHub upstream drift check, weekly workflow, historical-claim filter (P2)" --body-file - <<'EOF'
## Summary

Phase 2 of skill freshness (spec: `docs/superpowers/specs/2026-09-13-skill-freshness-design.md`, plan: `docs/superpowers/plans/2026-09-14-skill-freshness-p2.md`).

- **`pnpm freshness:check`**: offline audit plus the latest GitHub release (fallback: tags, up to 300) for every `source: github` pin; emits `upstream-major-drift` (high, exit 1), `upstream-minor-drift` (low), `fetch-failed` (warn). Injectable fetch, bounded concurrency, `GITHUB_TOKEN` header only.
- **Weekly workflow** `.github/workflows/skill-freshness.yml` (Mondays 07:00 UTC + dispatch): report as artifact + job summary; red only on major drift.
- **Historical-claim filter**: `claim-behind-pin` on a line with `since` / `pre-` / `before` / `legacy` / `migrat…` / `upgrad…` / `deprecated` / `unsupported` / `older` / `previous` / `from` is `low` and no longer blocks `--strict`.
- Alias regexes precompiled once; `reviewed-mismatch` scope for skill pins documented as by-design.

## Test plan
- [ ] `pnpm test` (freshness 35/35, CLI, evals)
- [ ] `pnpm validate:all`, `pnpm audit:sdlc`
- [ ] `GITHUB_TOKEN=… pnpm freshness:check` locally: upstream table populated, exit code reflects major drift
- [ ] `gh workflow run skill-freshness.yml` after merge: artifact + summary present

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Syp1r29csWEJpssYviqxgc
EOF
```

---

## Self-review notes

- Spec coverage: §2 `sources.ts` / `check` / issue table network rows → Tasks 1-3. §3 cron workflow, SECURITY AST07 → Task 5. P1 final-review follow-ups (context filter, precompiled regexes, skill-pin `reviewed-mismatch` note, `--strict` semantics) → Tasks 3-5. `SkillRecord.body` removal deliberately skipped (used by `skills.test.ts`; zero cost to keep).
- Type consistency: `LatestRelease`, `UpstreamSource`, `GithubSource(options)`, `checkUpstream(pins, github, {concurrency})`, `uniquePins`, `driftIssue`, `isStrictBlocking`, `VersionClaim.context`, `HISTORICAL_CONTEXT` used identically across tasks.
- Test count: 22 (P1) + 7 (sources) + 3 (check) + 1 (index) + 2 (claims/audit) = 35.
