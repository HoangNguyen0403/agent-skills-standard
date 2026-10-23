# Task 6 report — precise worker standard selection (STAGE: GREEN applied)

- Task/owner: Task 6 / worker-bootstrap/routing owner.
- Workspace: /Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/flawless-mule (branch `flawless-mule`, no commits).
- Status: GREEN source/metadata edits applied after orchestrator-observed RED (5 failures: operator profile, combined bootstrap, code review, bare subagent, Pages Router; 68 controls passed). No checks/tests/build/lint/formatters run by this worker.
- Changed files: `mcp/test/SkillIndex.spec.ts`, `skills/common/common-performance-engineering/SKILL.md`, `skills/common/common-subagent-driven-development/SKILL.md`, `skills/metadata.json`, `.agent/sdd/provider-neutral-delegation/task-6-report.md`.

## Applied GREEN edits (settled source/metadata)

| File | Edit | Purpose |
| --- | --- | --- |
| `skills/common/common-performance-engineering/SKILL.md:18` | keyword `profile` → `profiling` | Removes operator-profile collision; performance matching retained. |
| `skills/common/common-subagent-driven-development/SKILL.md:13` | added keyword `subagent` | Bare worker concept now resolves to the required policy (Task 1 file; see cumulative-review note). |
| `skills/metadata.json:257-258` | `common/accessibility` patterns `view`→`-view`, `form`→`-form` | Delimiter-qualified: still matches `android-xml-views` / `angular-forms` and singular `*-view` / `*-form` ids; stops matching `review`, `interview`, `per-form-ance`. |
| `skills/metadata.json:284` | `common/mobile-ux-core` `view`→`-view` | Same delimiter qualification; `android-xml-views` still triggers. |
| `skills/metadata.json` mobile block | removed `page` pattern | Stops `nextjs-pages-router` selecting mobile UX; real mobile positives (`mobile touch targets` keyword, `-view` composite) retained and tested. |

Not touched: `SkillIndex.ts` matcher semantics, Skill bodies, other composite rules/guards, generated mirrors (`skills/index.json`, `_INDEX.md`; integration owner regenerates).

## Cumulative Task 1 review scope

The `subagent` trigger is inside Task 1-owned `common-subagent-driven-development/SKILL.md`. Per settled-Task-1 authorization it was applied only now, with no concurrent policy-body edits. Include this trigger line in cumulative Task 1 review; revert/replace if Task 1's final review chooses a different trigger wording.

## Inspection findings (static, from actual source and registry metadata)

Selection path: `SkillIndex.matchKeywords()` matches a declared trigger only when the trigger occurs in each input string at word boundaries (`matchKeyword`/`hasBoundaryMatch`), then appends `expandComposites()`, which uses raw `String.includes(pattern)` over matched skill **ids** against `foundational_composite_rules` in `skills/metadata.json`.

Confirmed collision mechanisms:

1. `skills/common/common-performance-engineering/SKILL.md` declares keyword `profile`. Input `operator profile` contains `profile` at word boundaries, so the performance standard is selected for an operator-profile query (tier 3).
2. Composite rule `common/accessibility` includes pattern `form`. `common-performance-engineering` contains the substring `form` (`per-form-ance`), so accessibility is appended to every performance match.
3. Composite rules `common/accessibility` and `common/mobile-ux-core` include pattern `view`. Skill ids containing `view` as an unintended substring: `common-code-review`, `common-review-policy`, `specialist-pr-reviewer`, `specialist-security-reviewer`, `system-design-review`, `system-design-interview-coaching`. Any code-review match therefore pulls accessibility and mobile UX.
4. Composite rule `common/mobile-ux-core` includes pattern `page`, which matches `nextjs-pages-router` (web routing, not mobile UX).
5. `common-subagent-driven-development` declares no trigger that matches the bare concept word `subagent` (`subagent driven`, `subagent-driven-development`, ...). A `subagent` query currently returns no standard at all, so the required worker-delegation policy is not delivered.

Not reproducible / specific remaining cause for Stitch, Appium, Playwright:

- These skills have no substring-composite path into worker-routing seeds. Reads of `common-stitch-design` (`stitch`, `stitch mcp`, `design.md`, ...), `quality-engineering-appium-mcp` (`appium`, `appium-mcp`, ...), and `quality-engineering-playwright-cli` (`playwright-cli`, `playwright mcp`, ...) require those literal words in the input. Queries containing only `code review`, `subagent`, `provider`, `mcp` cannot select them under current boundary semantics.
- Remaining cause: caller prose that literally names those tools (for example a pasted issue description) is matched as topic input. Correct remedy is exact-ID/file routing when the worker scope is known (AC-10.a / Task 1 bootstrap), not suppressing literal trigger words or narrowing unrelated catalogs. No test demands that suppression.

## Added held-out cases and expected state

Permanent cases were added in two places: real-registry assertions inside
`SkillIndex — repository trigger routing`, and a dedicated
`SkillIndex — delimiter-qualified composite patterns` fixture
(`mcp/test/SkillIndex.spec.ts:722-811`) that installs the intended
`-form`/`-view` rules and proves singular plus plural skill ids still trigger
the foundations while `performance`/`review` embeds do not.

| Test | Query | Expected | Pre-fix RED evidence / post-fix expectation |
| --- | --- | --- | --- |
| operator profile | `["operator profile"]` | contains `common-operator-profile`; not performance/accessibility | RED: performance (keyword `profile`) + accessibility (composite `form`); now no collision |
| combined bootstrap | `["operator profile", "task complexity"]` | contains operator-profile + task-complexity-routing; not performance/accessibility | RED: same path; now no collision |
| code review | `["code review"]` | contains code-review + architecture-audit; not accessibility, mobile-ux, stitch, appium-mcp, playwright-cli | RED: accessibility + mobile-ux via composite `view` from `common-code-review`; now no collision |
| subagent | `["subagent"]` | contains `common-subagent-driven-development`; no tool skills | RED: required standard missing; now matched by new trigger |
| bounded worker routing | `["subagent driven worker dispatch"]` | contains subagent policy; no stitch/appium/playwright/mobile-ux | GREEN control |
| Pages Router | `["Pages Router"]` | contains `nextjs-pages-router`; not mobile-ux | RED: composite `page`; now no collision |
| literal tools/UI positives | stitch mcp, playwright mcp, appium doctor, mobile touch targets, accessibility audit, performance bottleneck, component props | each contains its own skill | GREEN anti-over-narrowing controls; `mobile touch targets` is the real mobile-positive coverage for removing `page` |
| intended composites | reactive forms; ViewBinding | angular-forms/android-xml-views still plus accessibility; ViewBinding also mobile-ux | GREEN guard for composite tightening |
| delimiter fixture | web form; detail view; profile; code review | `-form`/`-view` fire on `web-form`/`detail-view`, not on performance or review ids | GREEN: proves new pattern form has no safety loss |

No assertions on source text, wording, or fixture-internal wiring. Assertions are consumer-visible `matchKeywords` selection results against the real repository registry and real `metadata.json`, plus the intended metadata semantics in a throwaway fixture.

## Patch scope (applied)

1. `skills/common/common-performance-engineering/SKILL.md`: keyword `profile` replaced by `profiling`.
2. `skills/metadata.json`: `common/accessibility` patterns `form`→`-form`, `view`→`-view`; `common/mobile-ux-core` `view`→`-view` and removed `page`.
   Rationale: `String.includes("-form")` matches both `-form` and `-forms` ids while requiring a delimiter, so embedded `form` in `per-form-ance` and embedded `view` in `re-view` no longer collide.
3. `skills/common/common-subagent-driven-development/SKILL.md`: added bare `subagent` keyword (Task 1-owned file, applied after Task 1 settlement; flagged for cumulative review).
4. No `SkillIndex.ts` or other matcher change; other composites and guards untouched.

## Verification (not run by this worker)

- Focused command reserved for the orchestrator: `rtk pnpm --filter ./mcp test test/SkillIndex.spec.ts`.
- Expected: the 4 observed RED routing cases now pass; all 68 controls plus 2 delimiter-fixture cases remain green.
- No claim of catalog-wide false-positive reduction from these few cases.

## Remaining risks / observations

- `common/best-practices` pattern `rout` also matches workflow `...-routing` ids (`common-task-complexity-routing`) and `page`/router ids. Not changed: not part of the identified irrelevant loads and its widening/ID-specific repair needs separate impact review.
- `common/best-practices` pattern `di` matches `audit` ids; currently masked by intended `architecture` matches. Not changed for the same reason.
- Literal tool-name prose in a query still selects those tool skills by design; AC-10.a exact-ID/file routing is the supported mitigation.
- Task 1 source is settled; the only Task 1-owned change made here is the `subagent` trigger, reported above for cumulative review. No policy body text changed.

## Files

- Added tests: `mcp/test/SkillIndex.spec.ts:451-558` (real registry) and `:722-811` (delimiter fixture).
- This report.
