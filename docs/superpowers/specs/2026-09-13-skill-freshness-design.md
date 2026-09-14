# Skill Freshness: upstream drift + internal signal detection

**Date**: 2026-09-13
**Status**: Approved design, pending implementation plan
**Branch**: `feat/skill-freshness`

## Problem

303 skills across 24 categories; ~244 are version-sensitive (language, framework, database, platform). Nothing links "upstream shipped a new major" to "skill still says the old one".

Today's only freshness marker is a `Reviewed: <date>` line in 13 `skills/<cat>/references/framework-map.md` files (2026-06-17 to 2026-07-15). Seven version-sensitive categories (java, kotlin, swift, php, typescript, javascript, dart) have no framework map. `skills/metadata.json` `last_updated` tracks registry releases, not upstream. Roughly 30 SKILL.md bodies hard-code a version claim (Next.js 15, Angular 20, Java 21, Flutter 3.27, iOS 17) with no tooling reading them. Internal quality signals exist (`benchmarks/evals/remediation-queue.json` classification `outdated domain expectation`, `AGENTS_LEARNING.md`) but are not aggregated per skill.

## Goal

A repeatable, mostly automated way to see **which** skills need an upgrade and **why**, before users hit stale advice. Output is a report and a CI gate. No auto-filed issues, no auto-generated PRs.

## Decisions

| Question | Decision |
|---|---|
| Driving signal | External upstream drift first, internal usage signals second |
| Pin location | Hybrid: category default in `skills/metadata.json`, optional per-skill override in SKILL.md frontmatter |
| Action on drift | Report only (JSON + Markdown artifact); CI exit code |
| Sources v1 | GitHub releases and tags, plus `manual` |
| Internal signals | Evals remediation queue, learning log, opt-in MCP load telemetry |
| Shape | Standalone `scripts/freshness/` audit + weekly cron; `ags freshness` CLI is a later follow-up |

## Design

### 1. Data model

**Category pins** — `skills/metadata.json` `categories.<cat>.upstream[]` (optional, additive):

```json
"nextjs": {
  "version": "1.4.6", "last_updated": "2026-07-15", "tag_prefix": "nextjs-v",
  "upstream": [
    { "name": "next", "source": "github", "repo": "vercel/next.js",
      "pinned": "15.3.0", "tag_pattern": "^v(\\d+\\.\\d+\\.\\d+)$",
      "reviewed": "2026-06-17" }
  ]
}
```

- `source`: `github` | `manual`. `manual` never fetches; only `reviewed` age is checked (ios/Xcode, android AGP).
- `tag_pattern`: regex with capture groups forming the semver; prerelease/canary tags skipped.
- `reviewed`: authoritative review date. framework-map `Reviewed:` line stays as human note; audit warns when the two disagree.
- Seed all 20 version-sensitive categories (~25 entries). Categories without framework-map (java, kotlin, swift, php, typescript, javascript, dart) get pins here. `common`, `specialists`, `system-design` omit `upstream` and are excluded from `missing-pin`.
- No zod/strict schema guards `skills/metadata.json`: all readers (`cli/src/services/MetadataReader.ts:66-127`, `SkillValidator.validateMetadata` :159-193, `scripts/verify-release-tags.ts:6-13`, `calculate-tokens.ts:134`) read specific keys and ignore unknowns. `calculate-tokens.ts:148-182` and `release-utils.ts:156-170` mutate in place → `upstream` survives pre-commit and release. Add `upstream?: UpstreamEntry[]` to `cli/src/models/types.ts:34-49` `CategoryMetadata` for typing only.

Seed table (verified repos / tag patterns):

| category | repo | tag_pattern | source |
|---|---|---|---|
| typescript | microsoft/TypeScript | `^v(\d+\.\d+\.\d+)$` | github |
| javascript | nodejs/node | `^v(\d+\.\d+\.\d+)$` | github |
| react | facebook/react | `^v(\d+\.\d+\.\d+)$` | github |
| react-native | facebook/react-native | `^v(\d+\.\d+\.\d+)$` | github |
| nextjs | vercel/next.js | `^v(\d+\.\d+\.\d+)$` | github |
| nestjs | nestjs/nest | `^v(\d+\.\d+\.\d+)$` | github |
| angular | angular/angular | `^(\d+\.\d+\.\d+)$` | github |
| flutter | flutter/flutter | `^(\d+\.\d+\.\d+)$` | github (tags) |
| dart | dart-lang/sdk | `^(\d+\.\d+\.\d+)$` | github (tags) |
| golang | golang/go | `^go(\d+\.\d+(?:\.\d+)?)$` | github (tags) |
| python | python/cpython | `^v(\d+\.\d+\.\d+)$` | github (tags) |
| php | php/php-src | `^php-(\d+\.\d+\.\d+)$` | github |
| laravel | laravel/framework | `^v(\d+\.\d+\.\d+)$` | github |
| kotlin | JetBrains/kotlin | `^v(\d+\.\d+\.\d+)$` | github |
| java | openjdk/jdk | `^jdk-(\d+)-ga$` | github (tags) |
| spring-boot | spring-projects/spring-boot | `^v(\d+\.\d+\.\d+)$` | github |
| swift | swiftlang/swift | `^swift-(\d+\.\d+(?:\.\d+)?)-RELEASE$` | github |
| android | gradle/gradle secondary; AGP/androidx | manual | manual |
| ios | Xcode / iOS SDK | — | manual |
| quality-engineering | microsoft/playwright | `^v(\d+\.\d+\.\d+)$` | github (optional) |
| database | — category-level none; per-skill pins below | | |

Per-skill pins (first adopters): `database-postgresql` → postgres/postgres `^REL_(\d+)_(\d+)$` (tags), `database-redis` → redis/redis `^(\d+\.\d+\.\d+)$`, `database-mongodb` → mongodb/mongo `^r(\d+\.\d+\.\d+)$` (tags), `database-hana` → manual, `android-agp-upgrade` → manual (AGP 9), `flutter-bloc-state-management` → felangel/bloc.

**Skill pins** — SKILL.md frontmatter `metadata.upstream[]`, same entry shape. Only for skills tracking a lib the category pin does not (e.g. `flutter-bloc-state-management` → `felangel/bloc`). Expect <20 adopters. Effective pin set per skill = category pins ∪ skill pins.

**Version claims** — no new field. Script regex-scans SKILL.md + `references/*.md` using an alias table keyed by `upstream.name` (`Next\.js\s+v?(\d+)`, `Java\s+(\d+)`, `iOS\s+(\d+)`, `Angular\s+v?(\d+)`, `Flutter\s+(\d+\.\d+)`, `Go\s+(\d+\.\d+)`, `PHP\s+(\d+\.\d+)`, `Python\s+(\d+\.\d+)` ...). Alias table lives in `scripts/freshness/claims.ts`.

### 2. Detection

`scripts/freshness/` (tsx, `node --test`, mirrors `scripts/evals/quality.ts` gate shape):

- `sources.ts` — `UpstreamSource { latest(entry): Promise<{version, tag, publishedAt, url} | null> }`. `GithubReleasesSource`: `GET /repos/{repo}/releases/latest`; on 404 fall back to `GET /repos/{repo}/tags?per_page=100` filtered by `tag_pattern`, max semver. `ManualSource` → null. Shared fetch helper: `GITHUB_TOKEN` header when present, 3 retries, concurrency 5, injectable `fetch` for tests. Do not import CLI `GithubService` (workspace boundary); same shape, ~40 lines.
- `pins.ts` — load metadata + walk skills → effective pin set per skill. No shared frontmatter helper exists in `scripts/` (each script hand-rolls); write a small `parseFrontmatter()` copying the CRLF-safe regex + `yaml.load` from `cli/src/services/MetadataReader.ts:147-159`, returning the raw `metadata` object. Walk = readdir categories (skip dot dirs) → readdir skills → require `SKILL.md` exists (category dirs also hold `references/`), same as `scripts/generate-indices.ts:97-111`. Import `ROOT_DIR`, `SKILLS_DIR`, `METADATA_PATH` from `scripts/evals/constants.ts:3-5`.
- `claims.ts` — alias table + scanner → `{skill, name, claimedMajor, file, line}`.
- `index.ts` — actions:
  - `audit` (offline): `reviewed-stale`, `claim-behind-pin`, `claim-ahead-of-pin`, `missing-pin`, framework-map date mismatch. Runs in PR CI.
  - `check` (network): `audit` + `upstream-major-drift`, `upstream-minor-drift`, `fetch-failed`. Runs in weekly cron.
  - `report`: render md from JSON.
  - Flags: `--write`, `--strict`, `--internal` (phase 2), `--telemetry <url>` (phase 3), `--stale-days` (default 120).
  - `audit` is **write-free by default** (print + exit code); `--write` opt-in. `check` and `report` always write. `benchmarks/freshness/` is gitignored so neither CI job (`ci.yml:118-126` fails on a dirty tree) nor the cron needs a commit.
  - Mirror `scripts/evals/quality.ts:690-775`: `action = argv[2]`, `fs.writeJSONSync(..., {spaces: 2})`, `process.exitCode = 1`, entry guard `path.resolve(process.argv[1]) === path.resolve(__filename)` so tests can import pure functions. `fs.ensureDirSync(benchmarks/freshness)` before write.
  - GitHub API: `GET /repos/{o}/{r}/releases/latest` (shape as `cli/src/services/GithubService.ts:124-148`); on 404 → `GET /repos/{o}/{r}/tags?per_page=100`, up to 3 pages, filter by `tag_pattern`, numeric-compare capture groups, take max. Needed for flutter, dart, go, cpython, postgres, mongo, openjdk (no Releases). Send `GITHUB_TOKEN` when set (unauth = 60 req/h).

Issue table:

| type | severity | rule |
|---|---|---|
| `upstream-major-drift` | high | latest major > pinned major |
| `upstream-minor-drift` | low | minor/patch behind |
| `claim-behind-pin` | med | body claims older major than pin |
| `claim-ahead-of-pin` | med | body claims newer than pin (pin stale) |
| `reviewed-stale` | med | `reviewed` older than `--stale-days` |
| `missing-pin` | low | version-sensitive category has no `upstream` |
| `reviewed-mismatch` | low | framework-map `Reviewed:` date differs from pin `reviewed` |
| `fetch-failed` | warn | API error; never gates |

Exit 1: `check` on any high; `audit --strict` on any `claim-*` or `missing-pin`. Ship non-strict until baseline is cleared.

Report: `benchmarks/freshness/freshness-report.json` `{generatedAt, summary:{byCategory, bySeverity}, issues[], upstream:[{category, name, pinned, latest, publishedAt, releaseUrl}]}` and `freshness-report.md` (table per category, severity-sorted, release links, top-10 "improve next" list once phase 2 lands).

### 3. Wiring

- `package.json`: `freshness:audit`, `freshness:check`, `freshness:report` next to `evals:*` (:55-58); `validate:all` (:39) += `&& pnpm freshness:audit`. Not in pre-commit. `test:evals` (:41) glob is `scripts/evals/*.test.ts` only → add `test:freshness: node --import tsx --test scripts/freshness/*.test.ts` and chain into `test` (:40).
- `.github/workflows/ci.yml`: `freshness:audit` step after `check-alignment` (:106-107) in job `validate-skills` — safe because audit is write-free.
- New `.github/workflows/skill-freshness.yml`: `schedule: "0 7 * * 1"` + `workflow_dispatch`; setup copied from `ci.yml:80-92` (checkout@v7, setup-node@v7 20.x, pnpm/action-setup@v6, `pnpm install --frozen-lockfile`; no build) → `freshness:check --write` with `GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}` → `actions/upload-artifact@v7` `benchmarks/freshness/` → `cat freshness-report.md >> $GITHUB_STEP_SUMMARY`. `permissions: contents: read`. `benchmarks/freshness/` gitignored (artifact is the record; cron must not need a commit).
- `cli/src/schemas/skill-frontmatter.ts:47-66`: add `upstreamEntrySchema` (`.strict()`, `repo` required when `source === 'github'`, `reviewed` `YYYY-MM-DD`) after `skillSignatureSchema` (:39); add to `optionalSkillFieldsSchema` a `metadata: z.object({ upstream: z.array(upstreamEntrySchema).optional() }).passthrough().optional()` — `.passthrough()` mandatory so `triggers` is not stripped. Consumer is only `cli/src/services/validation/rules.ts:93` `FrontmatterRule` (`safeParse`, error path `metadata.upstream.0.repo`). `TriggersRule` (:211-252), `mcp/src/services/SkillParser.ts:92-111`, and sync ignore siblings; only Kiro transform (`SkillSyncService.ts:333`) drops whole `metadata` block, acceptable. Add vitest cases in `cli/src/services/__tests__/` FrontmatterRule spec. JSDoc on every export (`docs:scan`).
- Docs: new `docs/FRESHNESS.md`; `CONTRIBUTING.md` §6 gate row; `docs/SECURITY.md` AST07 row; `skills/common/common-skill-creator/references/lifecycle.md` Phase 5 iteration trigger → freshness report.

### 4. Phase 2 — internal signals (`freshness:audit --internal`)

- `signals/evals.ts`: read `benchmarks/evals/remediation-queue.json`; classification `outdated domain expectation` → issue `eval-outdated` (med) with evidence.
- `signals/learning-log.ts`: parse `AGENTS_LEARNING.md` iterations; new convention line `**Skills**: cat/skill, ...` added to `skills/common/common-learning-log` template and `common-session-retrospective` step 6. Entries ≤90 days naming a skill → `learning-log-gap` (low), counted.
- Combined per-skill score (high=3, med=2, low=1) → top-10 list at top of md. No LLM.

### 5. Phase 3 — MCP load telemetry (opt-in)

> **Amended 2026-09-14:** implemented local-only — no server module, no HTTP. The MCP appends counts to `~/.agent-skills-standard/telemetry.jsonl` and `freshness --telemetry <path>` reads it. The original server design below is kept for history.

- `mcp/src/services/SessionTracker.ts` already records per-skill loads. Add `TelemetryFlusher`: on exit or every N calls POST `{skills:{"cat/id":count}, noMatchInputsHashed:[], mcpVersion}`. Off unless `AGS_TELEMETRY=1` or `.skillsrc` `telemetry: true`. No prompts, paths, or raw keywords.
- `server/src/telemetry/` mirrors `server/src/feedback/` (controller, DTO with class-validator, service, same storage). `POST /telemetry`, `GET /telemetry/aggregate?days=30`.
- `freshness --telemetry <url>`: zero-load + drift → severity bump; high-load + drift → top of list. Unreachable → `fetch-failed`, never gates.
- Privacy note in `docs/SECURITY.md` + README.

### 6. Testing

- `scripts/freshness/*.test.ts` via `node:test` + `node:assert/strict` (pattern: `scripts/evals/quality.test.ts:1-3`). Cover: tag_pattern extraction incl. `/tags` fallback + prerelease exclusion, claim regex table on fixture snippets, severity rules, pin merge (category ∪ skill), frontmatter parser CRLF, learning-log parser, md renderer. `sources.ts` takes injectable `fetchImpl: typeof fetch = globalThis.fetch`; tests pass a stub (no vitest at root; Node 22 local, engine >=20).
- Fixture: temp dir via `mkdtemp` + `fs.writeJson(skills/metadata.json)` + SKILL.md strings, as in `scripts/evals/evals-v2.test.ts:93-124`; 3 fake skills → assert report JSON.
- Server: `telemetry.controller.spec.ts` like feedback spec.
- `pnpm freshness:audit` on real repo: expect baseline `claim-*` + `reviewed-stale`; record counts in `docs/FRESHNESS.md` baseline section.
- Cron: one `workflow_dispatch` run, confirm artifact + step summary.

## Rollout (one PR each, stacked off develop)

1. **P1 schema + pins + offline audit**: metadata `upstream` seed, frontmatter schema, `scripts/freshness/{pins,claims,index}.ts` `audit` + `report`, tests, `validate:all` + `ci.yml` step, `docs/FRESHNESS.md`.
2. **P2 network check + cron**: `sources.ts`, `check` action, `skill-freshness.yml`, SECURITY/CONTRIBUTING rows.
3. **P3 internal signals**: `signals/*`, learning-log `Skills:` convention, retrospective + learning-log skill edits, combined score.
4. **P4 telemetry**: MCP flusher, server module, `--telemetry` flag, privacy docs.

Follow-up (out of scope): `ags freshness` CLI command comparing consumer project deps vs registry pins.


## Verification

- `pnpm test` green including new `test:freshness`; `pnpm lint`; `pnpm validate:all` passes with non-strict `freshness:audit`.
- `pnpm freshness:audit --write` emits `benchmarks/freshness/freshness-report.{json,md}` listing baseline issues per category.
- `GITHUB_TOKEN=... pnpm freshness:check --write` fills `upstream[]` with latest versions; at least one drift issue expected since framework-map reviews are two-plus months old.
- `gh workflow run skill-freshness.yml` produces an artifact and a step summary.
- Existing gates unchanged: `check-alignment`, `evals:preflight`, `audit:skills` counts match the pre-change baseline.
