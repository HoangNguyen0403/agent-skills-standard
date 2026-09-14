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

| command                                | what it does                                                                                                 | writes files                               |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| `pnpm freshness:audit`                 | offline rules (below); runs in PR CI and `validate:all`                                                      | no (`--write` to save)                     |
| `pnpm freshness:audit --strict`        | same, exit 1 on any `missing-pin` or any `claim-*` issue that is not `low` (historical references are `low`) | no                                         |
| `pnpm freshness:report`                | re-render Markdown from the last JSON                                                                        | `benchmarks/freshness/freshness-report.md` |
| `pnpm freshness:audit --stale-days 90` | change the review-age threshold (default 120)                                                                | —                                          |
| `pnpm freshness:check`                 | offline rules **plus** latest GitHub release/tag per pin; runs weekly                                        | always writes both report files            |
| `pnpm freshness:check --concurrency 3` | limit parallel GitHub requests (default 5)                                                                   | —                                          |

Reports land in `benchmarks/freshness/` (gitignored).

## Issue types

| type                   | severity  | rule                                                                                                                                                                                                                                                                                      |
| ---------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `claim-ahead-of-pin`   | med       | prose claims a newer version than the pin: bump the pin                                                                                                                                                                                                                                   |
| `claim-behind-pin`     | med / low | prose claims an older version and is not a floor (`15+`). `low` when the same line reads as a historical reference (`since`, `pre-`, `before`, `legacy`, `migrat…`, `upgrad…`, `deprecated`, `unsupported`, `older`, `previous`, `from`); `med` otherwise: update the guidance or add `+` |
| `reviewed-stale`       | med       | pin `reviewed` older than the threshold                                                                                                                                                                                                                                                   |
| `reviewed-mismatch`    | low       | `framework-map.md` `Reviewed:` differs from the pin date                                                                                                                                                                                                                                  |
| `missing-pin`          | low       | version-sensitive category with no `upstream`                                                                                                                                                                                                                                             |
| `upstream-major-drift` | high      | upstream major newer than pin                                                                                                                                                                                                                                                             |
| `upstream-minor-drift` | low       |                                                                                                                                                                                                                                                                                           |
| `fetch-failed`         | warn      | never gates                                                                                                                                                                                                                                                                               |

## Upstream check

`pnpm freshness:check` resolves every `source: github` pin through the GitHub API: `GET /repos/{repo}/releases/latest` first, then `GET /repos/{repo}/tags` (up to 300 tags) when the repo publishes no Releases or the latest release tag does not match `tag_pattern`. Prerelease tags never match a well-formed `tag_pattern`, so they are ignored. `source: manual` pins are listed in the report with no `latest`.

Repositories with thousands of tags and no Releases (today: `flutter/flutter`) can exhaust the 300-tag window before a stable tag appears and show `latest: ?`; treat them like `manual` pins until the source supports prefix lookups via `git/matching-refs`.

Set `GITHUB_TOKEN` (any token with public repo read) to lift the unauthenticated limit of 60 requests/hour; the token is only sent as a header and never written to the report. Requests that fail (rate limit, 5xx, network) become `fetch-failed` (warn) and never fail the run.

The weekly workflow `.github/workflows/skill-freshness.yml` runs the check every Monday, attaches `benchmarks/freshness/` as the `freshness-report` artifact, prints the Markdown report as the job summary, and goes red only on `upstream-major-drift`. Trigger it by hand from the Actions tab (`workflow_dispatch`, optional `stale_days`).

## Reviewing a category

1. Read the upstream release notes since `pinned`.
2. Update the affected `SKILL.md` and `references/*.md`.
3. Set `pinned` to the version you reviewed against and `reviewed` to today, in `skills/metadata.json` (and the category `framework-map.md` `Reviewed:` line).
4. Run `pnpm freshness:audit --strict` and `pnpm check-alignment`.

## Baseline (2026-09-14)

Issues present when the gate landed. Strict mode stays off until no `claim-*` or `missing-pin` issues remain (`reviewed-stale` never blocks).

Historical references on the same line (`since Go 1.21`, `pre-iOS 17`, `migrating from PHP 7`) are reported at `low` and do not block `--strict`; only `med` claim mismatches and `missing-pin` do. Do not rewrite prose to silence a `low` hit.

The `nextjs` pin was raised from 15.3.0 to 16.0.0 on the strength of three reference files that already document Next.js 16 (`nextjs-architecture`, `nextjs-caching`, `nextjs-data-fetching`); most prose still says 15+. A full category review against 16 is pending; `reviewed` was left at the framework-map date on purpose.

Skill-level pins cost 5-7 frontmatter lines against the SKILL.md size budget. Prefer category pins; add a skill pin only for a library or engine the category does not track (databases, AGP, bloc).

`reviewed-mismatch` compares category pins against `framework-map.md` only. Skill-level pins track a library or engine the category map does not cover, so their `reviewed` date is independent of the map by design.

`file:line` points at the real line in the file on disk (frontmatter included).

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
