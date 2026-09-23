# Skill Freshness

How the registry notices that a language, framework, or database skill has fallen behind its upstream.

Design: `docs/superpowers/specs/2026-09-13-skill-freshness-design.md`.

## Pins

Every version-sensitive category declares what its skills were reviewed against in `skills/metadata.json`:

```json
"nextjs": {
  "upstream": [
    { "name": "next", "source": "github", "repo": "vercel/next.js",
      "pinned": "16.0.0", "tag_pattern": "^v(\\d+\\.\\d+\\.\\d+)$",
      "reviewed": "2026-06-17" }
  ]
}
```

| field         | meaning                                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------ |
| `name`        | stable key; also selects the regex in `scripts/freshness/claims.ts` that finds version claims in prose |
| `source`      | `github` (releases, then tags) or `manual` (only the review date is checked)                           |
| `repo`        | `owner/name`; required for `github`                                                                    |
| `pinned`      | version the skill content was reviewed against, not the newest release                                 |
| `tag_pattern` | regex whose capture groups form the version; used by the network check                                 |
| `reviewed`    | `YYYY-MM-DD` of the last human review                                                                  |

A skill that tracks something its category does not (a library, a database engine) adds the same shape under `metadata.upstream` in its `SKILL.md` frontmatter. A skill entry with the same `name` as a category entry overrides it.

Categories `common`, `specialists`, and `system-design` are version-agnostic and carry no pins.

## Commands

| command                                        | what it does                                                                                                                         | writes files                               |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| `pnpm freshness:audit`                         | offline rules (below); runs in PR CI and `validate:all`                                                                              | no (`--write` to save)                     |
| `pnpm freshness:audit --strict`                | same, exit 1 on any `missing-pin` or any `claim-*` issue that is not `low` (historical references are `low`)                         | no                                         |
| `pnpm freshness:report`                        | re-render Markdown from the last JSON                                                                                                | `benchmarks/freshness/freshness-report.md` |
| `pnpm freshness:audit --stale-days 90`         | change the review-age threshold (default 120)                                                                                        | —                                          |
| `pnpm freshness:check`                         | offline rules **plus** latest GitHub release/tag per pin; runs weekly                                                                | always writes both report files            |
| `pnpm freshness:check --concurrency 3`         | limit parallel GitHub requests (default 5)                                                                                           | —                                          |
| `pnpm freshness:audit --internal`              | adds eval-queue and learning-log signals (`--window-days`, default 90; also bounds `check --internal` and the eval queue's run date) | no                                         |
| `pnpm freshness:audit --telemetry <file\|dir>` | reads local MCP usage logs (JSONL); adds `unused-skill` issues and a `loads` column to "Improve next"                                | no                                         |
| `pnpm freshness:audit --min-sessions <n>`      | minimum telemetry sessions before `unused-skill` fires (default 20)                                                                  | no                                         |

Reports land in `benchmarks/freshness/` (gitignored). The weekly workflow runs `check --internal`.

## Issue types

| type                   | severity  | rule                                                                                                                                                                                                                                                                                      |
| ---------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `claim-ahead-of-pin`   | med       | prose claims a newer version than the pin: bump the pin                                                                                                                                                                                                                                   |
| `claim-behind-pin`     | med / low | prose claims an older version and is not a floor (`15+`). `low` when the same line reads as a historical reference (`since`, `pre-`, `before`, `legacy`, `migrat…`, `upgrad…`, `deprecated`, `unsupported`, `older`, `previous`, `from`); `med` otherwise: update the guidance or add `+` |
| `reviewed-stale`       | med       | pin `reviewed` older than the threshold                                                                                                                                                                                                                                                   |
| `reviewed-mismatch`    | low       | `framework-map.md` `Reviewed:` differs from the pin date                                                                                                                                                                                                                                  |
| `missing-pin`          | low       | version-sensitive category with no `upstream`                                                                                                                                                                                                                                             |
| `upstream-major-drift` | high      | upstream major newer than pin                                                                                                                                                                                                                                                             |
| `upstream-minor-drift` | low       | upstream minor/patch newer than the pin at the same major (or same major.minor for Go/Flutter-style versioning); informational                                                                                                                                                            |
| `fetch-failed`         | warn      | never gates                                                                                                                                                                                                                                                                               |
| `eval-outdated`        | med       | reserved for the eval runner's "outdated domain expectation" classification; the current classifier in `scripts/evals/quality.ts` never emits it, so this row stays empty until that lands                                                                                                |
| `eval-remediation`     | low       | one per skill; message lists failing cases per classification (deduped case ids); queues older than `--window-days` are ignored                                                                                                                                                           |
| `learning-log-gap`     | low       | `AGENTS_LEARNING.md` entries in the window name the skill                                                                                                                                                                                                                                 |
| `unused-skill`         | low       | version-sensitive skill never loaded although its category was, across ≥ `--min-sessions` sessions in the telemetry window                                                                                                                                                                |

## Upstream check

`pnpm freshness:check` resolves every `source: github` pin through the GitHub API: `GET /repos/{repo}/releases` (newest 100; highest non-prerelease version wins, so multi-line repos like Node report the true maximum) first, then `GET /repos/{repo}/tags` (up to 1,000 tags) when the repo publishes no Releases or the latest release tag does not match `tag_pattern`. Prerelease tags never match a well-formed `tag_pattern`, so they are ignored. `source: manual` pins are listed in the report with no `latest`.

Repositories with thousands of tags and no Releases (today: `flutter/flutter`) can exhaust the 1,000-tag window before a stable tag appears and show `latest: ?`; treat them like `manual` pins until the source supports prefix lookups via `git/matching-refs`.

Set `GITHUB_TOKEN` (any token with public repo read) to lift the unauthenticated limit of 60 requests/hour; the token is only sent as a header and never written to the report. Requests that fail (rate limit, 5xx, network) become `fetch-failed` (warn) and never fail the run.

Requests are not retried: a transient failure shows as `fetch-failed` this week and resolves itself next week. A `github` pin whose repo or `tag_pattern` matches nothing is also reported as `fetch-failed` rather than silently showing `?`, so a misconfigured pin is visible in every run. Repos that reach the tags fallback today (no Releases, or release tags that miss the pattern): dart, flutter, go, cpython, openjdk, postgres, mongo.

The weekly workflow `.github/workflows/skill-freshness.yml` runs the check every Monday, attaches `benchmarks/freshness/` as the `freshness-report` artifact, prints the Markdown report as the job summary, and goes red only on `upstream-major-drift`. Trigger it by hand from the Actions tab (`workflow_dispatch`, optional `stale_days`). The weekly run passes `--internal`, so its report also carries eval-queue and learning-log signals.

## Internal signals

`--internal` adds two offline readers, both of which fail open (missing file → no issues, never an error):

- `scripts/freshness/signals/evals.ts` reads `benchmarks/evals/remediation-queue.json` (overwritten each time the eval suite runs — it is a snapshot of the latest run, not a history) and reports at most two issues per skill: one `eval-remediation` (low) summarising every failing classification for that skill as a breakdown (case ids deduped so a case with several failed assertions counts once), plus one `eval-outdated` (med) when the run classified any case as an outdated domain expectation. Queues older than `--window-days` (by `generatedAt`) are ignored.
- `scripts/freshness/signals/learning-log.ts` reads `AGENTS_LEARNING.md` and reports one `learning-log-gap` (low) per skill named by at least one entry inside `--window-days` (default 90). An entry names a skill via an explicit `**Skills**: category/skill-name` line (see `skills/common/common-learning-log/references/log-format.md`) or by simply mentioning a known `category/skill` id in its body — the explicit line is optional, not required, because older entries and prose mentions are picked up too. An explicit id must name an existing skill; unknown or malformed ids are ignored and logged as a warning on stderr rather than silently dropped.

Both signals are informational: `--strict` never blocks on `eval-*` or `learning-log-gap` issues, in either `audit` or `check`.

## Usage telemetry (local, opt-in)

The MCP server can append one line per session to a local JSON Lines file. It is **off by default** and nothing is ever uploaded.

Enable it with `AGS_TELEMETRY=1` in the MCP server's environment, or `telemetry: true` in the project's `.skillsrc` (`AGS_TELEMETRY=0` overrides). The file is `~/.agent-skills-standard/telemetry.jsonl` (`AGS_TELEMETRY_PATH` to change it) and is written when the session ends (stdio); the SSE server writes one line per process on shutdown.

`telemetry: true` in a committed `.skillsrc` enables the log for everyone who clones that project; the server prints `[ags-mcp] telemetry: on (skillsrc) → <path>` at startup, and `AGS_TELEMETRY=0` opts out locally. This repository's own `.skillsrc` sets `telemetry: true` so the project dogfoods its own instrument — export `AGS_TELEMETRY=0` before starting the MCP server to opt out locally.

Each line contains only: timestamp, MCP version, session start and duration, load counts per `category/skill`, load counts per category guide, load counts per workflow, call counts per MCP tool, and the number of calls that matched no skill. When the session called `get_session_cost` at least once, the line also carries the workflow name, a user-authored feature/workspace `slug`, and the workflow's terminal `outcome` (`feature_status`, e.g. `verified`, `blocked`) from that call — all three are optional and omitted entirely when never supplied, so older lines and non-workflow sessions still parse. It never contains file paths, keywords, prompts, skill text, or the inputs of unmatched calls.

Feed it to the report with `pnpm freshness:audit --internal --telemetry ~/.agent-skills-standard/telemetry.jsonl` (a directory of `.jsonl` files works too, so a team can pool exported logs). The report header shows the session count, window, and no-match call count, "Improve next" gains a `loads` column and breaks score ties by usage, and version-sensitive skills that were never loaded although their category was, across at least `--min-sessions` (default 20) sessions, are reported as `unused-skill` (low).

Skill ids from the public registry are not sensitive; custom workflow names, project-local skill ids, and user-authored feature `slug`s are user-authored and will appear in pooled logs.

## Acknowledged drift

A pin's `upstream` entry accepts an optional `acknowledged` version (same shape as `pinned`). Set it when you know upstream has shipped past the pin, the drift is expected, and a review is already scheduled — for example, after triaging a release and deciding it can wait a sprint. The comparison is at the alias's drift significance, not full-version equality: acknowledging `18` covers every `18.x` release for a major-significant alias, and for Go/Flutter-style minor-significant aliases, acknowledging `1.25` covers every `1.25.x` release. While the current upstream version is covered, `upstream-major-drift` reports `low` instead of `high` (message: "Drift acknowledged up to `<version>`; review pending"). An `acknowledged` value that does not parse as a version is treated as not covering anything, and the `high` message says so (`... is not a version`). Acknowledgements are not aged — remove `acknowledged` or bump it forward once the review lands, or a stale acknowledgement will keep hiding real drift.

## Reviewing a category

1. Read the upstream release notes since `pinned`.
2. Update the affected `SKILL.md` and `references/*.md`.
3. Set `pinned` to the version you reviewed against and `reviewed` to today, in `skills/metadata.json` (and the category `framework-map.md` `Reviewed:` line).
4. Run `pnpm freshness:audit --strict` and `pnpm check-alignment`.

The Markdown report's "Improve next" table ranks skills and categories by a weighted score (high 3, med 2, low 1) over all their issues, highest first. Use it as the suggested order for a review sweep when there is more to fix than time to fix it.

## Baseline (2026-09-14)

Issues present when the gate landed. Strict mode stays off until no `claim-*` or `missing-pin` issues remain (`reviewed-stale` never blocks).

Historical references on the same line (`since Go 1.21`, `pre-iOS 17`, `migrating from PHP 7`) are reported at `low` and do not block `--strict`; only `med` claim mismatches and `missing-pin` do. Do not rewrite prose to silence a `low` hit.

The `nextjs` pin was raised from 15.3.0 to 16.0.0 on the strength of three reference files that already document Next.js 16 (`nextjs-architecture`, `nextjs-caching`, `nextjs-data-fetching`); most prose still says 15+. A full category review against 16 is pending; `reviewed` was left at the framework-map date on purpose.

Skill-level pins cost 5-7 frontmatter lines against the SKILL.md size budget. Prefer category pins; add a skill pin only for a library or engine the category does not track (databases, AGP, bloc).

`reviewed-mismatch` compares category pins against `framework-map.md` only. Skill-level pins track a library or engine the category map does not cover, so their `reviewed` date is independent of the map by design.

`file:line` points at the real line in the file on disk (frontmatter included).

Known follow-ups (P3): a separate drift significance from the claim significance (PHP 8.4→8.5 currently counts as major drift).

```
Freshness audit: 8 issues (high 0, med 3, low 5, warn 0)
  med  claim-behind-pin     android/android-compose-migration [skills/android/android-compose-migration/references/dependency-setup.md:29]: Claims "agp 8" but pin is 9.0.0; update the guidance or mark as a floor with "+"
  low  claim-behind-pin     android/android-agp-upgrade [skills/android/android-agp-upgrade/references/dsl-migration.md:6]: Claims "agp 8" but pin is 9.0.0; historical reference on the same line, review only if the guidance itself is stale
  low  claim-behind-pin     golang/golang-logging [skills/golang/golang-logging/SKILL.md:30]: Claims "go 1.21" but pin is 1.24.0; historical reference on the same line, review only if the guidance itself is stale
  low  claim-behind-pin     ios/ios-swiftui [skills/ios/ios-swiftui/SKILL.md:27]: Claims "ios 17" but pin is 18; historical reference on the same line, review only if the guidance itself is stale
  low  claim-behind-pin     nextjs/nextjs-pages-router [skills/nextjs/nextjs-pages-router/SKILL.md:41]: Claims "next 15" but pin is 16.0.0; historical reference on the same line, review only if the guidance itself is stale
  low  claim-behind-pin     nextjs/nextjs-upgrade [skills/nextjs/nextjs-upgrade/SKILL.md:37]: Claims "next 15" but pin is 16.0.0; historical reference on the same line, review only if the guidance itself is stale
  med  reviewed-stale       php/-: Pin "php" (8.4.0) last reviewed 2026-05-16, 121 days ago (> 120)
  med  claim-behind-pin     php/php-error-handling [skills/php/php-error-handling/SKILL.md:33]: Claims "php 7" but pin is 8.4.0; update the guidance or mark as a floor with "+"
```
