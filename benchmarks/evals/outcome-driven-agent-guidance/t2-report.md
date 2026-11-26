# T2 — Skill-selection collision correction report

Slice: T2 (REQ-04). Requirements: AC-09, AC-10. Date: 2026-11-26.
Owner: routing implementer. Workspace: shared worktree
`/Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/illegal-platypus`.

## Changed files

| File | Change |
| --- | --- |
| `skills/flutter/flutter-cicd/SKILL.md` | Replaced generic keyword triggers (`ci`, `cd`, `pipeline`, `build`, `deploy`, `release`, `action`, `workflow`) with Flutter-qualified phrases. File triggers unchanged. |
| `mcp/test/SkillIndex.spec.ts` | Added seven real-registry `SkillIndex` cases in `SkillIndex — repository trigger routing`. |
| `benchmarks/evals/outcome-driven-agent-guidance/t2-report.md` | This report. |

No matcher source, generated mirror, lockfile, evaluator, or other skill was edited.
Baseline snapshot under `baseline/` is untouched.

## Collision cause

Observed query `['prompt engineering','agent autonomy','workflow','skill authoring']`
matched `flutter-cicd` through the generic `workflow` trigger (exact tier-2 keyword
match). `common/tdd` then appeared as a composite because its pattern list contains
the substring `cicd`, which matches the skill id `flutter-cicd`
(`skills/metadata.json` → `foundational_composite_rules`).

After narrowing, no trigger is a substring of those four inputs, so neither
`flutter-cicd` nor the `common-tdd` composite appears.

## New triggers

Flutter-first: `flutter ci`, `flutter cd`, `flutter cicd`, `flutter pipeline`,
`flutter github actions`, `flutter fastlane`, `flutter build`, `flutter deploy`,
`flutter release`, `flutter workflow`.

Reordered/domain-qualified: `ci for a flutter app`, `cd for a flutter app`,
`pipeline for a flutter app`, `workflow for a flutter app`,
`github actions for a flutter app`.

The reordered set corrects the reviewed AC-10 gap: previous adjacent-only triggers
missed "Set up a CI pipeline for a Flutter app" and "Configure GitHub Actions
workflow for a Flutter app".

The `description` already names Flutter CI/CD intent and was left unchanged.
`triggers.files` (`.github/workflows/**.yml`, `fastlane/**`,
`android/fastlane/**`, `ios/fastlane/**`) was left unchanged.

## Test coverage added (real registry, no mocks)

1. Exact observed query → no `flutter-cicd`, no `common-tdd`.
2. Authoring/pipeline paraphrases (including a bare `workflow` token) → no `flutter-cicd`.
3. Eight genuine Flutter CI/CD queries → `flutter-cicd` selected.
4. Five reordered Flutter requests, including both reviewer-supplied strings
   ("Set up a CI pipeline for a Flutter app", "Configure GitHub Actions workflow
   for a Flutter app") → `flutter-cicd` selected.
5. Genuine Flutter CI/CD query → `common-tdd` composite retained.
6. `.github/workflows/flutter-release.yml` route → `flutter-cicd` still discoverable
   through the index's documented derived-routing path (metadata file absent).

The file-route case deliberately uses derived routing: the checked-in
`skills/metadata.json` has no `yml` entry, so the production metadata path cannot
route that extension regardless of this change. Editing `metadata.json` was out of
scope. The test proves the skill's file trigger remains capable of matching.

## Commands actually run

```
cd mcp && ./node_modules/.bin/vitest run test/SkillIndex.spec.ts
```

Result after corrective trigger additions: `Test Files 1 passed (1)`,
`Tests 93 passed (93)`, 518 ms. (First run before correction: 92 passed, 657 ms.)
Vitest reported only a pre-existing Vite config-loader warning.

## RED status

`NOT RUN` for a pre-change RED execution. The observed collision was supplied by the
operator as the repro, and the brief restricted execution to one focused final
command after source settlement. No RED log is claimed; the negative behavior of the
pre-narrowing metadata is `[INFERENCE]` from the old trigger list plus the composite
rule inspected in `skills/metadata.json`.

## Limits and residual risk

- Keyword matching is literal phrase matching with word boundaries. Reordered
  coverage is a bounded phrase set, not general word-order parsing: forms outside
  the declared phrases (e.g. "pipeline setup for Flutter applications", "ship a
  Flutter app through CI") still will not match. Covering arbitrary word order
  would need matcher-level token/semantic matching, which this slice is not
  authorized to change. AC-10 is claimed only for the curated positive set.
- The new `workflow for a flutter app` phrase can co-match non-CI Flutter requests
  that use the word "workflow" (e.g. "navigation workflow for a Flutter app").
  Accepted as a bounded trade-off; no cross-domain (non-Flutter) false positive was
  observed in the curated negatives.
- Coverage is curated, not exhaustive; the broader trigger recall/specificity of
  the registry was not measured.
- `pnpm audit:keywords`, prettier, generation/parity, and any paid evaluation were
  not run (out of scope for T2).
- Generated mirrors and `_INDEX.md` will carry the old keywords until the approved
  T5 generation step; no activation claim is made here.
- No commit was created; changes remain in the shared worktree.
