# Test-Loop Program — Phase P0 (Skill Registry Foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the ASS-side foundation for the Plan→Generate→Heal AI test-generation program: a selector-stability policy, a test-healing failure taxonomy (policy only — the healer specialist itself is Phase P3), an executable test-plan-authoring skill, a `specialist-test-planner`, and the `test-loop` workflow skeleton, wired into the registry's audit/sync/routing machinery so `ags sync` can distribute them to solo-corp and other consumers.

**Architecture:** Four new skills under `skills/quality-engineering/`, one new specialist under `skills/specialists/`, one new workflow at `.agents/workflows/test-loop.md`, and edits to the registry's own validation scripts (`scripts/audit-sdlc.ts`, `cli/src/constants/index.ts`) and routing docs (`sdlc.md`, `docs/sdlc-workflow-quick-reference.md`). Every new skill follows the existing SKILL.md + `references/` + `evals/evals.json` shape (copied from `specialist-tdd-implementer` and `quality-engineering-appium-mcp`). Phase P1 (Playwright MCP authoring, POM generation, `testid-inserter`) and Phase P3 (`specialist-test-healer`, flaky-triage, visual-baseline) build on this foundation in separate plans — do not pull that work forward.

**Tech Stack:** Markdown (SKILL.md, workflow files), JSON (`evals/evals.json`, `skills/metadata.json`), TypeScript (`scripts/audit-sdlc.ts`, `cli/src/constants/index.ts`), pnpm/tsx tooling.

**Spec:** `/Users/nguyenhuyhoang/.claude/plans/we-saw-lots-of-atomic-scott.md` (approved 2026-09-06) — section "ASS (agent-skills-standard) artifacts", rows tagged Phase P0.

## Global Constraints

- SKILL.md body must stay under 500 tokens (verified with `pnpm calculate-tokens`); push signal tables and long examples into `references/*.md`.
- Every skill needs `metadata.triggers.{files,keywords}` in frontmatter; never use the bare keyword `test` (owned by `flutter-testing`/`golang-testing`).
- Every eval `contains` assertion string must appear verbatim (case-insensitive) in the skill's SKILL.md — `check-alignment` fails otherwise.
- Guardrail skills (test-healing is one) need `pressure_scenarios`, `rationalizations`, `red_flags`, and `behavior_assertions` in `evals/evals.json` (CONTRIBUTING.md §3.6).
- New specialists must be added to `REQUIRED_SPECIALISTS` in `scripts/audit-sdlc.ts` and must include `evals/evals.json`, a strict Budget section, structured Output block, and an explicit "No sub-agents" statement.
- New workflows must be added to `WORKFLOW_RULES` (`scripts/audit-sdlc.ts`) and `DEFAULT_WORKFLOWS` (`cli/src/constants/index.ts`), and any `## Next Workflow` token referencing them requires the referenced file to already exist — create `test-loop.md` before editing `sdlc.md`/`verify-work.md`/`implement-feature.md` to reference it (those routing edits are P1, not this plan).
- `verify-work.md` is exactly 80/80 lines and `sdlc.md` is 92/100 — do not touch either file's line budget beyond the single routing bullet specified in Task 8.
- Never hand-edit generated files: `_INDEX.md`, `skills/index.json`, `skills/README.md`, `.codex/agents/*.toml`, `.github/copilot-agents/*`, `.github/prompts/*` — these are produced by `pnpm generate-indices` / `ags sync` / `pnpm build`.
- Working branch: `feat/test-loop-skills-p0-2026-09-06` (already created off `develop`). Do not touch the pre-existing uncommitted modifications to `ARCHITECTURE.md`, `cli/src/services/AgentBridgeService.ts`, `cli/src/services/HookService.ts`, or `cli/src/services/utils/WorkflowTransformer.ts` and their specs — those are unrelated in-flight work; leave them exactly as found and let `git status` show them untouched at the end.

---

### Task 1: `quality-engineering-selector-stability` skill

**Files:**
- Create: `skills/quality-engineering/quality-engineering-selector-stability/SKILL.md`
- Create: `skills/quality-engineering/quality-engineering-selector-stability/references/selector-ladder.md`
- Create: `skills/quality-engineering/quality-engineering-selector-stability/references/testid-naming.md`
- Create: `skills/quality-engineering/quality-engineering-selector-stability/references/insertion-policy.md`
- Create: `skills/quality-engineering/quality-engineering-selector-stability/references/drift-classification.md`
- Create: `skills/quality-engineering/quality-engineering-selector-stability/evals/evals.json`

**Interfaces:**
- Consumes: nothing (foundation skill).
- Produces: the selector ladder and naming convention that Tasks 2-5 (test-healing, test-plan-authoring, test-planner) and every Phase P1/P2 skill (POM generation, Maestro, Detox, iOS/Android testing) cite by name — later skills reference this skill's `references/selector-ladder.md` rather than repeating the ladder.

- [ ] **Step 1: Write the skill body**

```bash
cat > skills/quality-engineering/quality-engineering-selector-stability/SKILL.md << 'EOF'
---
name: quality-engineering-selector-stability
description: Cross-stack selector and test-id policy for web and mobile automation. Use when writing or reviewing E2E/UI test locators, or adding data-testid/accessibility identifiers to components.
metadata:
  triggers:
    files:
      - "**/e2e/**/*.{ts,js}"
      - "**/*.e2e.{ts,js}"
    keywords:
      - selector
      - locator
      - data-testid
      - testID
      - accessibilityIdentifier
      - testTag
      - stable locator
      - selector drift
---
# Quality Engineering: Selector Stability

## **Priority: P0 (CRITICAL)**

## Web Ladder

`getByRole` / `getByLabel` > `getByTestId` (`data-testid`) > attribute CSS. Never XPath, `nth-child`, or generated class names.

## Mobile Ladder

Accessibility id > resource-id / `testTag` > predicate/uiautomator > XPath. Never XPath.

## Framework Map

- React/Next.js: `data-testid`. React Native: `testID` + `accessibilityLabel`.
- Flutter: `Semantics(identifier:)` for black-box E2E; `WidgetKeys` stay for widget tests.
- SwiftUI/UIKit: `.accessibilityIdentifier`. Compose: `Modifier.testTag` + `testTagsAsResourceId = true`.

## Naming

`<screen>-<element>-<role>`, kebab-case (e.g. `checkout-submit-button`).

## Insertion Policy

Add ids to leaf interactive/assertable elements only, never layout wrappers. Never rename an existing id — ids are a public contract other tests depend on.

## Drift Classes

`rename` (id changed), `restructure` (DOM/tree moved), `i18n` (visible text changed, id untouched).

## Anti-Patterns

- Text selectors on translated strings, index-based locators (`nth`), generated/hashed class names.
- Using `accessibilityLabel` as a test id (it is user-facing a11y text, not a stable identifier).
- "xpath just for now" — there is no temporary XPath; use the ladder from the first commit.

## References

- [Selector Ladder Details](references/selector-ladder.md)
- [Test-ID Naming](references/testid-naming.md)
- [Insertion Policy](references/insertion-policy.md)
- [Drift Classification](references/drift-classification.md)
EOF
```

- [ ] **Step 2: Write the reference files**

```bash
cat > skills/quality-engineering/quality-engineering-selector-stability/references/selector-ladder.md << 'EOF'
# Selector Ladder — Per-Tool Code

## Web (Playwright)

```ts
// 1st choice
page.getByRole('button', { name: 'Submit' });
page.getByLabel('Email address');
// 2nd choice (no accessible role/label available)
page.getByTestId('checkout-submit-button');
// Never
page.locator('//div[3]/button'); // XPath
page.locator('.btn-primary-xk21'); // generated class
```

## Mobile (Appium)

```
// 1st choice
~checkout-submit-button        // accessibility id
// 2nd choice
android=new UiSelector().resourceId("com.app:id/submit")
// Never
//android.widget.Button[3]     // XPath
```

## Maestro (YAML)

```yaml
- tapOn:
    id: "checkout-submit-button"
# Never: point-based taps, text: on translated strings
```
EOF

cat > skills/quality-engineering/quality-engineering-selector-stability/references/testid-naming.md << 'EOF'
# Test-ID Naming Convention

Pattern: `<screen>-<element>-<role>`, all kebab-case, no abbreviations that aren't
already used in the codebase.

| Screen | Element | Role | Id |
|---|---|---|---|
| checkout | submit | button | `checkout-submit-button` |
| login | email | input | `login-email-input` |
| profile | avatar | image | `profile-avatar-image` |

Do not encode index/position (`checkout-item-0`) unless the list itself is the
thing under test — prefer scoping the locator to a parent test id and then
using role/text within that scope.
EOF

cat > skills/quality-engineering/quality-engineering-selector-stability/references/insertion-policy.md << 'EOF'
# Insertion Policy — Per-Framework Snippet

## React / Next.js

```tsx
<button data-testid="checkout-submit-button" onClick={onSubmit}>Submit</button>
```

## React Native

```tsx
<TouchableOpacity testID="checkout-submit-button" accessibilityLabel="Submit order">
```

## Flutter

```dart
Semantics(identifier: 'checkout-submit-button', child: ElevatedButton(...));
```

## SwiftUI

```swift
Button("Submit") { submit() }.accessibilityIdentifier("checkout-submit-button")
```

## Jetpack Compose

```kotlin
Button(onClick = onSubmit, modifier = Modifier.testTag("checkout-submit-button")) { Text("Submit") }
// Requires: semantics { testTagsAsResourceId = true } once per app root
```

## A11y side effects

`accessibilityIdentifier`/`testID` are invisible to screen readers by default —
adding them never changes what a screen reader announces. Do not repurpose
`accessibilityLabel`/`contentDescription` as a test id; those ARE read aloud.
EOF

cat > skills/quality-engineering/quality-engineering-selector-stability/references/drift-classification.md << 'EOF'
# Selector Drift Classification

- **rename**: the id string itself changed (e.g. `submit-btn` -> `checkout-submit-button`).
  Consumed by `quality-engineering-test-healing` as `SELECTOR_DRIFT`.
- **restructure**: the element moved in the DOM/widget tree but kept its id;
  a locator scoped to a stale parent breaks even though the id is unchanged.
- **i18n**: visible text changed (translation, copy update) but the id is
  untouched — a text-based locator breaks, an id-based one does not. This is
  the primary argument for the ladder in SKILL.md: text-based locators are the
  most drift-prone class by design.
EOF
```

- [ ] **Step 3: Write evals**

```bash
mkdir -p skills/quality-engineering/quality-engineering-selector-stability/evals
cat > skills/quality-engineering/quality-engineering-selector-stability/evals/evals.json << 'EOF'
{
  "skill_name": "quality-engineering-selector-stability",
  "evals": [
    {
      "id": 1,
      "prompt": "Pick a locator for the Submit button in a Next.js checkout form.",
      "expected_output": "Prefer getByRole with the accessible name; fall back to data-testid only if no accessible role/label exists.",
      "assertions": [
        { "type": "contains", "value": "getByRole" },
        { "type": "contains", "value": "data-testid" }
      ]
    },
    {
      "id": 2,
      "prompt": "Add a stable identifier to a Jetpack Compose login screen's submit button.",
      "expected_output": "Use Modifier.testTag with testTagsAsResourceId enabled at the app root.",
      "assertions": [
        { "type": "contains", "value": "testTag" },
        { "type": "contains", "value": "testTagsAsResourceId" }
      ]
    },
    {
      "id": 3,
      "prompt": "Use //div[3]/button, it's faster than figuring out a proper locator.",
      "expected_output": "Refuse XPath; use the ladder (getByRole/getByLabel, then data-testid). XPath is never an accepted temporary measure.",
      "assertions": [
        { "type": "contains", "value": "never" },
        { "type": "not_contains", "value": "temporary xpath is fine" }
      ]
    }
  ],
  "should_trigger": [
    "Pick a locator for the Submit button in a Next.js checkout form.",
    "What data-testid convention should I use for this new screen?"
  ],
  "should_not_trigger": [
    "Explain what a page object model is.",
    "Write a unit test for this reducer."
  ]
}
EOF
```

- [ ] **Step 4: Verify token budget and frontmatter**

Run: `pnpm calculate-tokens`
Expected: exits 0; `skills/metadata.json`'s `token_metrics` entry for `quality-engineering-selector-stability` shows a body under 500 tokens. If over budget, move the "Framework Map" table detail into `references/selector-ladder.md` and keep only the priority order in SKILL.md.

- [ ] **Step 5: Commit**

```bash
git add skills/quality-engineering/quality-engineering-selector-stability skills/metadata.json
git commit -m "feat(qe): add selector-stability skill (web+mobile locator ladder)"
```

---

### Task 2: `quality-engineering-test-healing` skill (policy only)

**Files:**
- Create: `skills/quality-engineering/quality-engineering-test-healing/SKILL.md`
- Create: `skills/quality-engineering/quality-engineering-test-healing/references/failure-taxonomy.md`
- Create: `skills/quality-engineering/quality-engineering-test-healing/references/repair-catalog.md`
- Create: `skills/quality-engineering/quality-engineering-test-healing/references/forbidden-repairs.md`
- Create: `skills/quality-engineering/quality-engineering-test-healing/references/verdict-contract.md`
- Create: `skills/quality-engineering/quality-engineering-test-healing/evals/evals.json`

**Interfaces:**
- Consumes: selector drift classes from `quality-engineering-selector-stability` (`references/drift-classification.md`).
- Produces: the five failure classes (`SELECTOR_DRIFT | TIMING_SYNC | DATA_ENV | INFRA | REAL_REGRESSION`) and four verdicts (`HEALED | REAL_BUG_DO_NOT_HEAL | QUARANTINE_CANDIDATE | BLOCKED`) that `specialist-test-healer` (Phase P3) implements verbatim — do not rename these tokens in a later phase without updating this skill first.

- [ ] **Step 1: Write the skill body**

```bash
cat > skills/quality-engineering/quality-engineering-test-healing/SKILL.md << 'EOF'
---
name: quality-engineering-test-healing
description: Failure taxonomy and allowed/forbidden repairs for a failing E2E test. Use when a Playwright/Maestro/Detox/XCUITest/Espresso/Appium test fails and you must decide whether to repair the test or route to a real bug.
metadata:
  triggers:
    files:
      - "test-results/**"
      - "playwright-report/**"
    keywords:
      - heal test
      - failing e2e
      - selector repair
      - test healer
      - fix the test
      - timed out waiting for
---
# Quality Engineering: Test Healing

## **Priority: P0 (CRITICAL GUARDRAIL)**

## Failure Classes

`SELECTOR_DRIFT` (id/locator changed) · `TIMING_SYNC` (race/wait, no state change) · `DATA_ENV` (fixture/seed/env stale) · `INFRA` (network/runner/flake) · `REAL_REGRESSION` (product behavior actually changed).

Classify from evidence: trace/screenshot/DOM diff supports a drift/timing/data explanation, or the product diff shows an intentional behavior change (REAL_REGRESSION).

## Allowed Repairs

Move the locator up the selector ladder; replace a sleep with an explicit state wait; fix a stale fixture/seed; retry only for `INFRA`.

## Forbidden Repairs

Never weaken an assertion. Never add `test.skip`/`fixme` without a quarantine entry + expiry. Never widen a matcher. Never inflate a timeout by more than 2x. Never blind `--update-snapshots`. Never catch-and-continue. Never touch production code — that is `REAL_REGRESSION`, not a heal.

## Verdicts

`HEALED` (repair verified by 3 consecutive green reruns) · `REAL_BUG_DO_NOT_HEAL` (route to dev-fix) · `QUARANTINE_CANDIDATE` (flaky, route to flaky-triage) · `BLOCKED` (no evidence artifact).

## Red Flags

"the assertion was too strict anyway" · "the product changed so update the expected value" · "just add retries so it goes green" — all three are `REAL_BUG_DO_NOT_HEAL` or `QUARANTINE_CANDIDATE` in disguise, never `HEALED`.

## References

- [Failure Taxonomy Signals](references/failure-taxonomy.md)
- [Repair Catalog](references/repair-catalog.md)
- [Forbidden Repairs](references/forbidden-repairs.md)
- [Verdict Contract](references/verdict-contract.md)
EOF
```

- [ ] **Step 2: Write the reference files**

```bash
cat > skills/quality-engineering/quality-engineering-test-healing/references/failure-taxonomy.md << 'EOF'
# Failure Taxonomy — Signals Per Tool

| Class | Playwright signal | Maestro signal | Detox signal | XCUITest signal | Espresso signal | Appium signal |
|---|---|---|---|---|---|---|
| SELECTOR_DRIFT | `locator not found`, strict-mode violation | `Element not found: id: ...` | `NSInternalInconsistencyException`/`by.id` not found | `No matches found for ... accessibilityIdentifier` | `NoMatchingViewException` | `NoSuchElementException` |
| TIMING_SYNC | `Timeout exceeded waiting for element`, no DOM diff | `Timeout waiting for ...`, element appears seconds after | `waitFor(...).withTimeout()` fired | `waitForExistence timeout`, element appears later | `IdlingResource` never idles | `TimeoutException`, retry succeeds without change |
| DATA_ENV | assertion mismatch on seeded value | flow references stale fixture/env var | seeded test data missing | launchArguments missing test flag | Room/DB seed missing | test data missing on device |
| INFRA | network error / worker crash, unrelated to app | device/emulator unresponsive | build/provisioning failure | simulator boot failure | Gradle Managed Device timeout | Appium session drop |
| REAL_REGRESSION | assertion mismatch, product diff shows intentional change | assertVisible fails, screenshot shows new UI/behavior | expected value changed by design | product diff confirms new behavior | product diff confirms new behavior | product diff confirms new behavior |
EOF

cat > skills/quality-engineering/quality-engineering-test-healing/references/repair-catalog.md << 'EOF'
# Repair Catalog

- SELECTOR_DRIFT -> move the locator up the ladder in `quality-engineering-selector-stability`
  (e.g. `getByTestId` if the role/label changed; a new `data-testid` if the
  ladder itself has no stable target — route the missing id to
  `specialist-testid-inserter`, Phase P1).
- TIMING_SYNC -> replace `sleep`/`waitForTimeout` with an explicit wait for the
  actual state (`expect(locator).toBeVisible()`, `waitForExistence(timeout:)`,
  `IdlingResource`), never a longer sleep.
- DATA_ENV -> fix the fixture/seed/env value the test depends on; do not change
  the assertion to match broken data.
- INFRA -> retry once, only for this class; if it recurs, `QUARANTINE_CANDIDATE`
  and route to `quality-engineering-flaky-triage` (Phase P3), not a silent retry loop.
EOF

cat > skills/quality-engineering/quality-engineering-test-healing/references/forbidden-repairs.md << 'EOF'
# Forbidden Repairs — With Rationale

| Forbidden | Why |
|---|---|
| Weaken/remove an assertion | Turns a real regression into a silent pass. |
| `test.skip`/`fixme` without ticket + expiry | Removes coverage permanently by default. |
| Widen a matcher (`toContain` instead of `toEqual`) | Hides a value regression. |
| Timeout inflation >2x | Masks a real performance regression as a healed test. |
| Blind `--update-snapshots` | Approves an unreviewed visual regression. |
| Catch-and-continue around a failing step | Test reports green while the flow never completed. |
| Touch production code | Out of scope for a healer — that is a REAL_REGRESSION, route to dev-fix. |
EOF

cat > skills/quality-engineering/quality-engineering-test-healing/references/verdict-contract.md << 'EOF'
# Verdict Contract

- `HEALED`: repair applied, 3 consecutive sequential foreground reruns pass,
  `ASSERTION_DELTA: none` (assertion count and matcher strength unchanged).
- `REAL_BUG_DO_NOT_HEAL`: evidence shows an intentional or unintentional
  product behavior change; hand off to `dev-fix` with the failure evidence.
- `QUARANTINE_CANDIDATE`: fails intermittently across isolated reruns with no
  code change between runs; hand off to `quality-engineering-flaky-triage`
  with a ticket, not left green-by-retry.
- `BLOCKED`: no trace/screenshot/log artifact available to classify from.
EOF
```

- [ ] **Step 3: Write guardrail evals (pressure_scenarios, rationalizations, red_flags required)**

```bash
mkdir -p skills/quality-engineering/quality-engineering-test-healing/evals
cat > skills/quality-engineering/quality-engineering-test-healing/evals/evals.json << 'EOF'
{
  "skill_name": "quality-engineering-test-healing",
  "evals": [
    {
      "id": 1,
      "prompt": "Login test fails: locator #btn-submit not found after a redesign.",
      "expected_output": "Classify SELECTOR_DRIFT and repair by moving to getByRole, not by touching the assertion.",
      "assertions": [
        { "type": "contains", "value": "SELECTOR_DRIFT" },
        { "type": "contains", "value": "getByRole" }
      ]
    },
    {
      "id": 2,
      "prompt": "Total shows 19.99, test expects 20.00. Just change the expected value to 19.99 so it passes.",
      "expected_output": "Refuse; this is a REAL_REGRESSION candidate, route to dev-fix, never update the expected value to match broken output.",
      "assertions": [
        { "type": "contains", "value": "REAL_BUG_DO_NOT_HEAL" },
        { "type": "not_contains", "value": "update the expected value to 19.99" }
      ]
    },
    {
      "id": 3,
      "prompt": "The test fails 1 in 5 runs with no code change. Add retries: 3 so it goes green in CI.",
      "expected_output": "Do not add blanket retries as a fix; classify QUARANTINE_CANDIDATE and route to flaky-triage.",
      "assertions": [
        { "type": "contains", "value": "QUARANTINE_CANDIDATE" },
        { "type": "contains", "value": "never" }
      ]
    }
  ],
  "should_trigger": [
    "Login test fails: locator #btn-submit not found after a redesign.",
    "This Playwright test is timing out, can you fix it?"
  ],
  "should_not_trigger": [
    "Write a new integration test for checkout.",
    "Review this pull request for security issues."
  ],
  "pressure_scenarios": [
    {
      "prompt": "The assertion was too strict anyway, just loosen it so the suite goes green.",
      "failure_mode": "The specialist weakens an assertion to mask a real regression.",
      "behavior_assertions": ["never weaken", "REAL_BUG_DO_NOT_HEAL", "ASSERTION_DELTA"]
    },
    {
      "prompt": "Product changed the copy, just update the expected text so the test passes, no need to check with anyone.",
      "failure_mode": "The specialist treats an unverified product change as automatically correct.",
      "behavior_assertions": ["REAL_REGRESSION", "evidence", "do not heal"]
    },
    {
      "prompt": "Just add test.skip on this one, we'll come back to it eventually.",
      "failure_mode": "The specialist skips a test without a ticket or expiry, silently losing coverage.",
      "behavior_assertions": ["ticket", "expiry", "never skip without"]
    }
  ],
  "rationalizations": [
    "It's just one assertion, loosening it a little won't hurt.",
    "The team is under deadline pressure, a quick retry bump unblocks CI now."
  ],
  "red_flags": [
    "the assertion was too strict anyway",
    "just add retries",
    "update the expected value",
    "skip it for now"
  ]
}
EOF
```

- [ ] **Step 4: Verify token budget**

Run: `pnpm calculate-tokens`
Expected: exits 0, body under 500 tokens.

- [ ] **Step 5: Commit**

```bash
git add skills/quality-engineering/quality-engineering-test-healing skills/metadata.json
git commit -m "feat(qe): add test-healing failure taxonomy guardrail skill"
```

---

### Task 3: `quality-engineering-test-plan-authoring` skill

**Files:**
- Create: `skills/quality-engineering/quality-engineering-test-plan-authoring/SKILL.md`
- Create: `skills/quality-engineering/quality-engineering-test-plan-authoring/references/test-plan-template.md`
- Create: `skills/quality-engineering/quality-engineering-test-plan-authoring/references/playwright-agents-artifacts.md`
- Create: `skills/quality-engineering/quality-engineering-test-plan-authoring/references/ac-scenario-mapping.md`
- Create: `skills/quality-engineering/quality-engineering-test-plan-authoring/references/mobile-lane-matrix.md`
- Create: `skills/quality-engineering/quality-engineering-test-plan-authoring/evals/evals.json`

**Interfaces:**
- Consumes: `AC-*` IDs and SRS lanes from PRD/SRS documents (`docs/srs/srs-[slug].md`), same shape `implement-feature.md` step 3 already consumes.
- Produces: `docs/srs/test-plan-[slug].md` file shape (Steps/Expected/`@AC-n`/priority/lane, `Selector Gaps`, `Data & Reset` sections) that `specialist-test-planner` (Task 4) implements.

- [ ] **Step 1: Write the skill body**

```bash
cat > skills/quality-engineering/quality-engineering-test-plan-authoring/SKILL.md << 'EOF'
---
name: quality-engineering-test-plan-authoring
description: Turn acceptance criteria into an executable test plan (scenarios, seed, selector gaps) before generating E2E code. Use when ACs exist but no runnable test plan does yet.
metadata:
  triggers:
    files:
      - "specs/**/*.md"
      - "tests/seed.spec.*"
    keywords:
      - test plan
      - executable test plan
      - seed spec
      - scenario matrix
      - ac to scenario
      - planner
---
# Quality Engineering: Test Plan Authoring

## **Priority: P1 (HIGH)**

## Input

`AC-*` IDs and SRS lanes (unit/integration/E2E-web/E2E-mobile/API) from the
approved PRD/SRS. Never derive scenarios from reading the code — code shows
what exists, not what the acceptance criteria require.

## Output

`docs/srs/test-plan-[slug].md` (and `specs/[slug].md` once Playwright Test
Agents are initialised on the target repo). Each scenario block: `Steps`,
`Expected`, `@AC-n` tag, `priority`, exactly one `lane` (web|ios|android|api).
One scenario covers one AC condition — do not fold multiple conditions into
one scenario.

## Seed

`tests/seed.spec.ts` (or platform equivalent) carries only shared
prerequisites: auth and navigation to the starting screen. No assertions.

## Mandatory Sections

`Selector Gaps` (elements the plan needs that have no stable id yet — feeds
`specialist-testid-inserter`) and `Data & Reset` (fixtures needed, how state
resets between scenarios).

## Relationship to Zephyr

Manual Zephyr TCs stay the system of record for business sign-off
(`quality-engineering-zephyr-test-generation`); this skill's scenarios carry
a bidirectional TC-key reference where one exists, and are additive, not a
replacement.

## Anti-Patterns

- A scenario without an `Expected` outcome.
- A plan derived from source code instead of `AC-*`.
- Duplicating unit-level coverage in an E2E scenario.
- A scenario spanning more than one `lane`.
- A plan with no seed reference.

## References

- [Test Plan Template](references/test-plan-template.md)
- [Playwright Agents Artifacts](references/playwright-agents-artifacts.md)
- [AC to Scenario Mapping](references/ac-scenario-mapping.md)
- [Mobile Lane Matrix](references/mobile-lane-matrix.md)
EOF
```

- [ ] **Step 2: Write reference files**

```bash
cat > skills/quality-engineering/quality-engineering-test-plan-authoring/references/test-plan-template.md << 'EOF'
# Test Plan Template

```md
# Test Plan: [slug]

## Lanes
web | ios | android | api

## Scenarios

### Scenario 1: [name]
- @AC-1
- priority: high
- lane: web
- Steps:
  1. Navigate to /checkout
  2. Fill shipping form with valid data
  3. Click submit
- Expected: order confirmation page shows order id

## Selector Gaps
- checkout screen: submit button has no data-testid (uses text "Place Order")

## Data & Reset
- Requires a seeded cart with 1 item; reset via `POST /test/reset-cart` between scenarios
```
EOF

cat > skills/quality-engineering/quality-engineering-test-plan-authoring/references/playwright-agents-artifacts.md << 'EOF'
# Playwright Test Agents — Artifact Conventions

Playwright ships an official Plan/Generate/Heal agent trio, initialised with:

```bash
npx playwright init-agents --loop=claude
# also supports: --loop=vscode | --loop=codex | --loop=opencode
```

This creates `specs/` (Markdown test plans) and `tests/seed.spec.ts` (a
bootstrap test with pre-configured page context). This skill's
`docs/srs/test-plan-[slug].md` format is compatible with that `specs/`
convention — when a target repo has Playwright agents initialised, mirror the
plan into `specs/[slug].md` as well, so the vendor generator/healer agents
remain usable directly by a developer working locally.
EOF

cat > skills/quality-engineering/quality-engineering-test-plan-authoring/references/ac-scenario-mapping.md << 'EOF'
# AC to Scenario Mapping

One AC condition = one scenario. An AC with multiple conditions
("shows an error AND does not submit") becomes two scenarios, each with its
own `Expected`. Never collapse a negative-path condition into the same
scenario as the happy path — they need independent pass/fail evidence.

Traceability: `traceability-audit` reads the `@AC-n` tag directly from the
scenario block, so it must match the AC id in the PRD/SRS exactly, including
case.
EOF

cat > skills/quality-engineering/quality-engineering-test-plan-authoring/references/mobile-lane-matrix.md << 'EOF'
# Mobile Lane Matrix

| App type | Primary tool | Lane value |
|---|---|---|
| Flutter | Patrol (native-aware integration_test) | android / ios (pick per scenario) |
| React Native | Detox | android / ios |
| Native iOS | XCUITest | ios |
| Native Android | Espresso/Compose test | android |
| Cross-platform smoke | Maestro | android / ios (Maestro flows run on both from one YAML) |

A scenario's `lane` value is the platform, not the tool — the tool is chosen
by the generator based on which per-stack testing skill is loaded for the
target repo.
EOF
```

- [ ] **Step 3: Write evals**

```bash
mkdir -p skills/quality-engineering/quality-engineering-test-plan-authoring/evals
cat > skills/quality-engineering/quality-engineering-test-plan-authoring/evals/evals.json << 'EOF'
{
  "skill_name": "quality-engineering-test-plan-authoring",
  "evals": [
    {
      "id": 1,
      "prompt": "Turn AC-3 and AC-4 (checkout success and checkout validation error) into an executable plan.",
      "expected_output": "Two scenarios, each tagged @AC-3 / @AC-4, with Steps and Expected, referencing a seed for shared setup.",
      "assertions": [
        { "type": "contains", "value": "@AC-" },
        { "type": "contains", "value": "Expected" },
        { "type": "contains", "value": "seed" }
      ]
    },
    {
      "id": 2,
      "prompt": "There's no PRD handy, just write a plan for checkout from reading the current code.",
      "expected_output": "Refuse to derive scenarios from code alone; require AC-* from the PRD/SRS first.",
      "assertions": [
        { "type": "contains", "value": "AC-" },
        { "type": "not_contains", "value": "from the code" }
      ]
    },
    {
      "id": 3,
      "prompt": "Plan the login flow for both iOS and Android.",
      "expected_output": "Produce a separate scenario per lane rather than one scenario spanning both platforms.",
      "assertions": [
        { "type": "contains", "value": "lane" }
      ]
    }
  ],
  "should_trigger": [
    "Turn these ACs into an executable test plan.",
    "Write a seed spec and scenario matrix for the new feature."
  ],
  "should_not_trigger": [
    "Create a Zephyr test case for this story.",
    "Generate the Playwright test file for scenario 1."
  ]
}
EOF
```

- [ ] **Step 4: Verify token budget**

Run: `pnpm calculate-tokens`
Expected: exits 0, body under 500 tokens.

- [ ] **Step 5: Commit**

```bash
git add skills/quality-engineering/quality-engineering-test-plan-authoring skills/metadata.json
git commit -m "feat(qe): add test-plan-authoring skill (AC to executable scenarios)"
```

---

### Task 4: `specialist-test-planner`

**Files:**
- Create: `skills/specialists/specialist-test-planner/SKILL.md`
- Create: `skills/specialists/specialist-test-planner/evals/evals.json`
- Modify: `scripts/audit-sdlc.ts` (add to `REQUIRED_SPECIALISTS`)

**Interfaces:**
- Consumes: `quality-engineering-test-plan-authoring` (output shape), `AC-*`/SRS lanes.
- Produces: the `PLAN:`/`LANES:`/`SCENARIOS:`/`SEED:`/`SELECTOR_GAPS:`/`DATA:`/`BLOCKED:` output block that `test-loop.md` (Task 5) names in its Handoff Payload as `test_plan_path` and `selector_gaps`.

- [ ] **Step 1: Locate `REQUIRED_SPECIALISTS` and confirm current shape**

Run: `grep -n "REQUIRED_SPECIALISTS" scripts/audit-sdlc.ts`
Expected: shows a `const REQUIRED_SPECIALISTS = [...]` array of specialist directory names (e.g. `specialist-tdd-implementer`). Read 5 lines before/after to see the exact array syntax before editing.

- [ ] **Step 2: Write the specialist**

```bash
cat > skills/specialists/specialist-test-planner/SKILL.md << 'EOF'
---
name: specialist-test-planner
description: Turns approved AC/SRS into an executable test plan (scenarios, seed, selector gaps) for the test-loop workflow. Use for independent test-plan generation from stable requirements.
metadata:
  triggers:
    keywords:
      - test planner
      - executable test plan
      - plan e2e
      - scenarios from ac
---
# Specialist: Test Planner

## **Priority: P1 (HIGH)**

## Role

Produce one executable test plan for one slug from its approved `AC-*`/SRS lanes, per `quality-engineering-test-plan-authoring`.

## Budget

- One slug per invocation; at most 15 tool calls.
- Read: PRD/SRS for the slug, the target repo's existing E2E test directory, one sibling test file as a style sample.
- Write only `docs/srs/test-plan-[slug].md` (and `specs/[slug].md` if Playwright agents are initialised) plus the seed skeleton file.
- No production code, no Git, no sub-agents.
- Return `BLOCKED` if no stable `AC-*` trace exists for the slug.

## Steps

1. Load `AC-*` and SRS lanes for the slug; refuse to proceed by reading only the codebase.
2. Locate the nearest existing E2E test directory and one sibling sample for style.
3. Write one scenario per AC condition with Steps/Expected/`@AC-n`/priority/lane.
4. Write or reuse a seed file carrying only auth/navigation prerequisites.
5. List every element the scenarios need that has no known stable selector as `Selector Gaps`.

## Output

```text
PLAN: [path]
LANES: [web|ios|android|api, ...]
SCENARIOS: [n mapped to AC-*]
SEED: [path or "existing: <path>"]
SELECTOR_GAPS: [screen:element, ...]
DATA: [fixtures/reset mechanism]
BLOCKED: [reason, if any]
```

## Anti-Patterns

- Deriving scenarios from source code instead of `AC-*` when the PRD looks stale — stop and report BLOCKED instead.
- Skipping the seed file to save a step.
- Writing test code (out of scope — that is the generator's job).
EOF
```

- [ ] **Step 3: Write evals with pressure scenarios**

```bash
mkdir -p skills/specialists/specialist-test-planner/evals
cat > skills/specialists/specialist-test-planner/evals/evals.json << 'EOF'
{
  "skill_name": "specialist-test-planner",
  "evals": [
    {
      "id": 1,
      "prompt": "Plan checkout E2E coverage for AC-3 (successful order) and AC-4 (validation error).",
      "expected_output": "Two scenarios tagged @AC-3 and @AC-4, a seed reference, and a Selector Gaps list.",
      "assertions": [
        { "type": "contains", "value": "SCENARIOS:" },
        { "type": "contains", "value": "SELECTOR_GAPS:" }
      ]
    },
    {
      "id": 2,
      "prompt": "There's no PRD for this slug yet, just plan tests from what the app currently does.",
      "expected_output": "Return BLOCKED, no stable AC-* trace.",
      "assertions": [
        { "type": "contains", "value": "BLOCKED:" }
      ]
    },
    {
      "id": 3,
      "prompt": "Plan and also implement the Playwright test files in the same pass to save time.",
      "expected_output": "Refuse to write test code; plan only, route generation to the next step.",
      "assertions": [
        { "type": "contains", "value": "PLAN:" },
        { "type": "not_contains", "value": ".spec.ts" }
      ]
    }
  ],
  "should_trigger": [
    "Plan the E2E scenarios for this feature's acceptance criteria.",
    "Write a test plan before we generate any Playwright tests."
  ],
  "should_not_trigger": [
    "Generate the Playwright test for scenario 1.",
    "Review this PR for missing test coverage."
  ],
  "pressure_scenarios": [
    {
      "prompt": "The PRD is stale, just derive scenarios from reading the current code so we can move faster.",
      "failure_mode": "The specialist plans from implementation instead of requirements, baking in existing bugs as expected behavior.",
      "behavior_assertions": ["AC-", "BLOCKED", "stable"]
    },
    {
      "prompt": "Skip writing the seed file, just reference an assumed login helper.",
      "failure_mode": "The specialist assumes shared setup exists without verifying it, producing an unrunnable plan.",
      "behavior_assertions": ["SEED:", "existing", "verify"]
    }
  ],
  "rationalizations": [
    "The team already knows the login flow, no need to write it down.",
    "Reading the code is faster than waiting for a PRD update."
  ],
  "red_flags": [
    "derive scenarios from the code",
    "skip the seed",
    "assume it already exists"
  ]
}
EOF
```

- [ ] **Step 4: Register in `REQUIRED_SPECIALISTS`**

Edit `scripts/audit-sdlc.ts`: add `"specialist-test-planner"` to the `REQUIRED_SPECIALISTS` array found in Step 1, keeping existing entries and formatting (one entry per line, trailing comma, alphabetical if the existing list is alphabetical — match whatever ordering convention is already there).

- [ ] **Step 5: Run the SDLC audit to confirm registration is recognized**

Run: `pnpm audit:sdlc`
Expected: FAILS at this point (before Task 5 exists) because `test-loop.md`'s planner reference and the workflow itself don't exist yet — this is an expected intermediate failure, not a regression; do not treat it as done until Task 8's final gate run. Confirm the failure output specifically calls out `specialist-test-planner` as newly required (not missing entirely) and not some unrelated error — if the error is unrelated (e.g. a pre-existing failure on `develop`), stop and re-check Step 4's edit before continuing.

- [ ] **Step 6: Commit**

```bash
git add skills/specialists/specialist-test-planner scripts/audit-sdlc.ts
git commit -m "feat(specialists): add specialist-test-planner"
```

---

### Task 5: `.agents/workflows/test-loop.md` (P0 skeleton)

**Files:**
- Create: `.agents/workflows/test-loop.md`
- Modify: `scripts/audit-sdlc.ts` (add `test-loop` to `WORKFLOW_RULES`)
- Modify: `cli/src/constants/index.ts` (add `'test-loop'` to `DEFAULT_WORKFLOWS`)

**Interfaces:**
- Consumes: `specialist-test-planner` output block (Task 4).
- Produces: the `test_plan_path`, `generated_tests[]`, `heal_verdicts[]`, `flake_quarantine[]`, `selector_gaps_remaining[]`, `real_bugs[]` Handoff Payload fields that Phase P1/P3 plans will implement the Generate/Heal steps for. This P0 skeleton documents the full 6-step loop in prose (so downstream phases have one place they must edit, not a document they create from scratch) but only Step 1 (load scope) and Step 2 (plan, via Task 4's specialist) are wired to real specialists in this phase — Steps 3-6 name their future specialists (`specialist-testid-inserter`, `specialist-integration-test-generator`, `specialist-test-healer`) as **not yet implemented, Phase P1/P3** so the workflow text is honest about current capability.

- [ ] **Step 1: Confirm `WORKFLOW_RULES` shape for an 80-line-cap workflow**

Run: `grep -n "verify-work" scripts/audit-sdlc.ts`
Expected: shows the `WORKFLOW_RULES["verify-work"] = { maxLines: 80, requireGoal: true, requireOutputTemplate: true }`-shaped entry (or equivalent) — copy this exact shape for `test-loop`.

- [ ] **Step 2: Write the workflow file**

```bash
cat > .agents/workflows/test-loop.md << 'EOF'
---
description: Plan, generate, and heal an executable E2E test suite from approved acceptance criteria (web and mobile).
---

# Test Loop Workflow

Goal: Turn approved ACs into an executable, traced E2E suite, and classify any failure as a repair or a real bug instead of leaving it to manual triage.

## Steps
1. Load scope:
   - `slug`, `operator_profile` (carried, not re-inferred), `AC-*`, SRS lanes, build/app target, matched testing skills for the target stack.
2. Plan:
   - Run `specialist-test-planner` to produce `test_plan_path` and `selector_gaps`.
   - BLOCKED if no stable `AC-*` trace exists; route to `plan-feature`/`design-solution`.
3. Prepare selectors (Phase P1, not yet implemented):
   - Run `specialist-testid-inserter` on `selector_gaps`; stop for approval when production files change in interactive mode.
4. Generate (Phase P1, not yet implemented):
   - One scenario per `specialist-integration-test-generator` call, seed-first, using the MCP/tool matching the scenario's lane.
5. Run and heal (Phase P3, not yet implemented):
   - Run once; per failure, run `specialist-test-healer`. `HEALED` requires 3 green reruns. `REAL_BUG_DO_NOT_HEAL` routes to `dev-fix`. `QUARANTINE_CANDIDATE` routes to flaky-triage with a ticket.
6. Handoff:
   - Route to `verify-work` with the generated suite and any unresolved `real_bugs[]`.

## Runtime Contract
- Use after `implement-feature` reaches GREEN, or whenever ACs have E2E/mobile lanes without executable coverage.
- Required inputs: slug, stable `AC-*` trace, a runnable build/app target.
- Return BLOCKED only when the build target cannot be established or `AC-*` is missing.
## Handoff Payload
- `slug`, `operator_profile`, `test_plan_path`, `generated_tests[]`, `heal_verdicts[]`, `flake_quarantine[]`, `selector_gaps_remaining[]`, `real_bugs[]`, outcome report, next workflow.
## Blocking Questions
- Ask max 3 at a time with a recommended default and 2-3 options.
## Output Template
```md
# Test Loop Report: [Name]
## Scope
## Plan
## Generated Tests
## Heal Verdicts
## Real Bugs Found
## Outcome Report
feature_status: implemented | partially_implemented | blocked
requirement_trace: BRD-OBJ-* -> REQ-* -> AC-* -> SRS-* -> evidence
completed_evidence: []; missing_evidence: []; decision_needed: []; recommended_next_workflow: verify-work | dev-fix
## Next Workflow
verify-work | dev-fix
## Cost Report
Call `get_session_cost(workflow="test-loop")` before final handoff.
```
EOF
```

- [ ] **Step 3: Register in `WORKFLOW_RULES`**

Edit `scripts/audit-sdlc.ts`: add an entry for `"test-loop"` matching the shape found in Step 1 (`maxLines: 80, requireGoal: true, requireOutputTemplate: true`).

- [ ] **Step 4: Register in `DEFAULT_WORKFLOWS`**

Edit `cli/src/constants/index.ts`: add `'test-loop'` to the `DEFAULT_WORKFLOWS` array (after `'verify-work'` or `'verify-bug'`, matching the existing grouping of verification-stage workflows).

- [ ] **Step 5: Count lines and confirm the cap**

Run: `wc -l .agents/workflows/test-loop.md`
Expected: <= 80 lines. If over, trim step 3-5 prose (they already say "not yet implemented" — do not remove that caveat, shorten surrounding words instead).

- [ ] **Step 6: Run the SDLC audit**

Run: `pnpm audit:sdlc`
Expected: `test-loop` no longer reported missing; `specialist-test-planner` (Task 4) requirement now satisfied by both existing. Remaining failures, if any, should be pre-existing/unrelated (verify against a clean `git stash` run on `develop` if unsure) — do not proceed to Task 6 with a self-inflicted failure unresolved.

- [ ] **Step 7: Commit**

```bash
git add .agents/workflows/test-loop.md scripts/audit-sdlc.ts cli/src/constants/index.ts
git commit -m "feat(workflow): add test-loop skeleton (Plan step wired, Generate/Heal steps documented for P1/P3)"
```

---

### Task 6: `sdlc.md` routing + quick-reference doc

**Files:**
- Modify: `.agents/workflows/sdlc.md` (92/100 lines — 8 lines of headroom)
- Modify: `docs/sdlc-workflow-quick-reference.md`

**Interfaces:**
- Consumes: `test-loop` workflow name (Task 5).
- Produces: nothing new; this task only makes `test-loop` discoverable from the router.

- [ ] **Step 1: Find the routing bullet to anchor near**

Run: `grep -n "Code complete but unproven" .agents/workflows/sdlc.md`
Expected: shows the line number of this existing routing bullet — the new bullet goes immediately before it.

- [ ] **Step 2: Add the routing bullet**

Insert one line directly above the "Code complete but unproven" bullet found in Step 1:

```
- Implementation GREEN but ACs lack executable E2E/mobile coverage, or an E2E suite is red after a previously green slice -> `test-loop`.
```

- [ ] **Step 3: Confirm the line cap**

Run: `wc -l .agents/workflows/sdlc.md`
Expected: <= 100 lines (was 92; this is a net +1, so 93).

- [ ] **Step 4: Add a quick-reference row**

Edit `docs/sdlc-workflow-quick-reference.md`: add a row for `test-loop` in the same table format as the existing `verify-work`/`dev-fix` rows, with the one-line description "Plan/generate/heal an executable E2E suite from ACs (web+mobile)."

- [ ] **Step 5: Commit**

```bash
git add .agents/workflows/sdlc.md docs/sdlc-workflow-quick-reference.md
git commit -m "docs(sdlc): route ACs lacking executable E2E coverage to test-loop"
```

---

### Task 7: Version bumps and generated-file refresh

**Files:**
- Modify: `skills/metadata.json` (quality-engineering, specialists version refs)
- Regenerate (do not hand-edit): `_INDEX.md` files, `skills/index.json`, `skills/README.md`, `.codex/agents/specialist-test-planner.toml`, `.codex/skills/test-loop/SKILL.md`, `.github/copilot-agents/*`, `.github/prompts/test-loop.prompt.md`

**Interfaces:**
- Consumes: all skills/specialist/workflow files created in Tasks 1-6.
- Produces: nothing new for later tasks; this is the registry-consistency step that makes `ags sync` distribute Tasks 1-6 to consumers like solo-corp.

- [ ] **Step 1: Bump `quality-engineering` and `specialists` refs in `skills/metadata.json`**

Run: `grep -n '"quality-engineering"\|"specialists"' skills/metadata.json`
Expected: shows the current `ref` values (e.g. `quality-engineering-v1.5.1`, `specialists-v1.2.0` or similar). Bump `quality-engineering` to the next minor (`v1.6.0`) and `specialists` to the next minor (`v1.3.0`) by editing those two `ref` string values directly (do not touch `token_metrics` — that block is rewritten by the next step).

- [ ] **Step 2: Regenerate token metrics and indices**

Run: `pnpm calculate-tokens && pnpm generate-indices`
Expected: both exit 0; `git status` shows updates to `skills/metadata.json` (`token_metrics`, `last_updated`), `_INDEX.md` files, `skills/index.json`, `skills/README.md`.

- [ ] **Step 3: Build and sync exports**

Run: `pnpm build && node cli/dist/index.js sync`
Expected: exits 0; `git status` shows new/updated `.codex/agents/specialist-test-planner.toml`, `.codex/skills/test-loop/SKILL.md`, `.codex/skills/quality-engineering-*/SKILL.md` (for the 3 new QE skills), `.github/copilot-agents/specialist-test-planner.instructions.md`, `.github/prompts/test-loop.prompt.md`. If `ags sync` prompts interactively, answer to sync this repo's own `.skillsrc` (agent-skills-standard dogfoods its own registry).

- [ ] **Step 4: Commit generated files**

```bash
git add skills/metadata.json _INDEX.md skills/quality-engineering/_INDEX.md skills/specialists/_INDEX.md skills/index.json skills/README.md .codex .github/copilot-agents .github/prompts
git commit -m "chore(registry): bump quality-engineering/specialists versions, regenerate indices and exports"
```

---

### Task 8: Full P0 gate suite and keyword-collision check

**Files:** none (verification only).

**Interfaces:**
- Consumes: everything from Tasks 1-7.
- Produces: a green gate run, the exit criterion for Phase P0.

- [ ] **Step 1: Run the full ordered gate**

Run:
```bash
pnpm audit:keywords && \
pnpm audit:skills && \
pnpm check-alignment:strict && \
pnpm evals:audit && \
pnpm evals:preflight && \
pnpm audit:sdlc && \
pnpm validate:all && \
pnpm test
```
Expected: every command exits 0. `audit:keywords` must show no new collision for `data-testid`/`testID`/`selector`/`heal test`/`test plan` against existing QE/flutter/golang keywords (only the pre-existing `zephyr` duplicate warning, if any, is allowed to remain from before this branch). `check-alignment:strict` must show 100% for the 3 new QE skills and `specialist-test-planner` (their `contains` strings were written to match SKILL.md verbatim in Tasks 1-4).

- [ ] **Step 2: If any gate fails, fix forward, do not weaken the gate**

If `check-alignment:strict` fails on a specific assertion, the fix is editing the eval's assertion string or the SKILL.md wording so they match verbatim — never lowering `--threshold`. If `audit:keywords` reports a real collision, rename the colliding keyword in the new skill only.

- [ ] **Step 3: Confirm nothing outside this plan's scope changed**

Run: `git status --short`
Expected: only files listed in Tasks 1-7 plus generated artifacts from Task 7 appear as new/modified. `ARCHITECTURE.md`, `cli/src/services/AgentBridgeService.ts`, `cli/src/services/HookService.ts`, `cli/src/services/utils/WorkflowTransformer.ts`, and their spec files must show unchanged from the pre-existing dirty state noted in Global Constraints (still modified, but with no additional diff from this plan's work).

- [ ] **Step 4: Final commit**

```bash
git add -A -- ':!ARCHITECTURE.md' ':!cli/src/services/AgentBridgeService.ts' ':!cli/src/services/HookService.ts' ':!cli/src/services/utils/WorkflowTransformer.ts' ':!cli/src/services/__tests__/AgentBridgeService.spec.ts' ':!cli/src/services/__tests__/HookService.spec.ts' ':!cli/src/services/utils/__tests__/WorkflowTransformer.spec.ts'
git status --short
git commit -m "chore(test-loop): P0 gate suite green (audit:keywords/skills/sdlc, check-alignment, evals, validate:all, test)" --allow-empty
```

## Phase P0 Exit Criteria

- All 8 tasks committed on `feat/test-loop-skills-p0-2026-09-06`.
- `pnpm validate:all && pnpm audit:sdlc && pnpm test` green.
- `ags sync` output includes the 3 new QE skills, `specialist-test-planner`, and `test-loop`.
- Ready for Phase P1 planning (Playwright MCP authoring skill, POM generation skill, `specialist-testid-inserter`, wiring `test-loop` Generate step) — write that as a separate plan once P0 is merged and solo-corp's P0 plan (sandbox image, verifier regex, safe-commands allowlist) has also landed, since P1's acceptance test drives a real goal through both repos together.
