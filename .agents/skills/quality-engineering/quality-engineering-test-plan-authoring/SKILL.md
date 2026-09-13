---
name: quality-engineering-test-plan-authoring
description: Turn acceptance criteria into an executable test plan (scenarios, seed, selector gaps) before generating E2E code. Use when ACs exist but no runnable test plan does yet.
guardrail: true
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
`specialist-testid-inserter`, Phase P1, not yet implemented) and `Data & Reset`
(fixtures needed, how state resets between scenarios). Gaps must follow the
`<screen>-<element>-<role>` naming convention defined in
`quality-engineering-selector-stability`.

## Scenario Classes

Each AC condition expands to `P` (positive), `N` (negative: a stated condition violated), and `E` (edge: boundary of a stated condition). Classes must differ by precondition or input, never by phrasing. Every `Expected` cites its AC or business rule, or is tagged `ASSUMED` and surfaced under an `Assumed Results` header. On a HALT trigger (ultra-short AC, no expected behavior, bundled ACs, contradiction, undefined state) stop and ask; return `HALT: <trigger>` in autonomous mode.

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
- A negative scenario that only rephrases the positive.
- An expected outcome not traceable to an AC and not tagged `ASSUMED`.

## References

- [Test Plan Template](references/test-plan-template.md)
- [Playwright Agents Artifacts](references/playwright-agents-artifacts.md)
- [AC to Scenario Mapping](references/ac-scenario-mapping.md)
- [Mobile Lane Matrix](references/mobile-lane-matrix.md)
- [Scenario Expansion: P/N/E, ASSUMED, HALT](references/scenario-expansion.md)
- [Golden Requirements Fixtures](references/golden-requirements.md)
