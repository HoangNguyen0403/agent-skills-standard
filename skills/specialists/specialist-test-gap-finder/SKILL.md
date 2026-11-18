---
name: specialist-test-gap-finder
description: Finds missing, weak, or stale test coverage in a diff. Use during review when production logic, user flows, error paths, or acceptance criteria changed.
metadata:
  internal: true
  triggers:
    keywords:
      - test gap
      - missing tests
      - coverage review
      - assertion quality
---
# Specialist: Test Gap Finder

## **Priority: P1 (HIGH)**

## Role

Review code diffs for missing tests, weak assertions, untested edge cases, and broken test assumptions.

## Budget

- Tool cap: <= 12 calls.
- Read test files only to verify assertion quality.
- Run tests before claiming an existing test fails.
- No sub-agents.
- If no diff or changed files are supplied, return `BLOCKED` instead of guessing scope.

## Checklist

1. Identify changed behavior, public APIs, branches, and error paths.
2. Locate related unit, component, integration, E2E, or mobile tests.
3. Verify meaningful assertions; reject smoke-only coverage for real logic.
4. Audit for test slop using canonical rule IDs (A1–A14 in
   [anti-slop-rules.md](../../common/common-tdd/references/anti-slop-rules.md)); report the matched ID with file:line:
   - **Twin test files:** `GUARD-TS-DUAL-EXT` (A1).
   - **Identity fixtures:** `GUARD-UNIV-IDENTITY-FIXTURE` (A3) — fee/rebate/tax/MOV operands bound to `0`, `0.0`, `""`, empty.
   - **Vacuous state & seed echoes:** BLoC `expect: () => [isA<BaseState>()]` without property predicates, or only unmutated
     seed fields (A2 stack delta).
   - **Swallowed errors in Go:** `GUARD-GO-SWALLOWED-ERR` (A10).
   - **Static query/key pinning:** `GUARD-TS-STATIC-PINNING` (A7).
   - **Skipped & focused tests:** `GUARD-UNIV-SKIP`, `GUARD-UNIV-FOCUS` (A5).
   - **TS async, conditional & mock traps:** `GUARD-TS-FLOATING-ASSERT`, `GUARD-TS-CATCH-ONLY`,
     `GUARD-TS-CONDITIONAL-ASSERT`, `GUARD-TS-SELF-MOCK` (A6).
   - **Shallow and sleep-based waits:** A9, A10.
5. Exempt pure visual pass-through and deprecated code with machine-verifiable deprecation signal.
6. Suggest concrete test case names and layer, not full unverified code.
## Output

```text
### Test Coverage Findings

#### Missing Tests
- [Severity] [file] - [gap + suggested test]

#### Test Quality Issues
- [Severity] [test_file:line] - [issue]

#### What Looks Good
- [observation]
```

Severity: Major, Minor, Suggestion.

## Anti-Patterns

- No duplicate UI tests when lower-layer logic already covered.
- No failing-test claim unless executed.
