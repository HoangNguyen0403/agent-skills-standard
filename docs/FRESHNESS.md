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

Issues present when the gate landed. Strict mode stays off until no `claim-*` or `missing-pin` issues remain (`reviewed-stale` never blocks).

Most `claim-behind-pin` hits in this baseline are historical references ("since Go 1.21", "pre-iOS 17", "PHP 7 is unsupported"), not guidance to use the old version. The scanner cannot yet tell the two apart; a same-line context filter (`since`, `pre-`, `before`, `legacy`, `migrat`, `upgrad`) that downgrades such hits is the first P2 task. Do not rewrite prose to silence them.

The `nextjs` pin was raised from 15.3.0 to 16.0.0 on the strength of three reference files that already document Next.js 16 (`nextjs-architecture`, `nextjs-caching`, `nextjs-data-fetching`); most prose still says 15+. A full category review against 16 is pending; `reviewed` was left at the framework-map date on purpose.

Skill-level pins cost 5-7 frontmatter lines against the SKILL.md size budget. Prefer category pins; add a skill pin only for a library or engine the category does not track (databases, AGP, bloc).

`reviewed-mismatch` currently compares only category pins against `framework-map.md`; skill-level pins are not checked (P2).

`file:line` points at the real line in the file on disk (frontmatter included).

```
Freshness audit: 8 issues (high 0, med 8, low 0, warn 0)
  med  claim-behind-pin     android/android-agp-upgrade [skills/android/android-agp-upgrade/references/dsl-migration.md:6]: Claims "agp 8" but pin is 9.0.0; update the guidance or mark as a floor with "+"
  med  claim-behind-pin     android/android-compose-migration [skills/android/android-compose-migration/references/dependency-setup.md:29]: Claims "agp 8" but pin is 9.0.0; update the guidance or mark as a floor with "+"
  med  claim-behind-pin     golang/golang-logging [skills/golang/golang-logging/SKILL.md:30]: Claims "go 1.21" but pin is 1.24.0; update the guidance or mark as a floor with "+"
  med  claim-behind-pin     ios/ios-swiftui [skills/ios/ios-swiftui/SKILL.md:27]: Claims "ios 17" but pin is 18; update the guidance or mark as a floor with "+"
  med  claim-behind-pin     nextjs/nextjs-pages-router [skills/nextjs/nextjs-pages-router/SKILL.md:41]: Claims "next 15" but pin is 16.0.0; update the guidance or mark as a floor with "+"
  med  claim-behind-pin     nextjs/nextjs-upgrade [skills/nextjs/nextjs-upgrade/SKILL.md:37]: Claims "next 15" but pin is 16.0.0; update the guidance or mark as a floor with "+"
  med  reviewed-stale       php/-: Pin "php" (8.4.0) last reviewed 2026-05-16, 121 days ago (> 120)
  med  claim-behind-pin     php/php-error-handling [skills/php/php-error-handling/SKILL.md:33]: Claims "php 7" but pin is 8.4.0; update the guidance or mark as a floor with "+"
```
