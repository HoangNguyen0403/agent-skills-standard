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
4. Audit for test slop patterns:
   - **Twin test files (`GUARD-TS-DUAL-EXT`):** Coexisting `<stem>.test.js` and `<stem>.test.ts` in the same directory.
   - **Identity fixtures (`GUARD-UNIV-IDENTITY-FIXTURE`):** Calculation tests with $0, `0.0`, `""`, or empty operands on active fee/rebate/tax/MOV inputs.
   - **Vacuous state & seed echoes:** BLoC `expect: () => [isA<BaseState>()]` without property predicates, or asserting only unmutated seed fields.
   - **Swallowed errors in Go (`GUARD-GO-SWALLOWED-ERR`):** Bare `if err != nil { return }` in tests instead of `t.Fatalf` or `require.NoError`.
   - **Static query/key pinning (`GUARD-TS-STATIC-PINNING`):** Tests asserting static `print(GQL)` query text regexes or iterating locale JSON keys instead of runtime behavior.
   - **Skipped & focused tests (`GUARD-UNIV-SKIP`, `GUARD-UNIV-FOCUS`):** Flag committed `it.skip`, `it.only`, `fit`, `fdescribe`, `@Ignore`, or unconditional `t.Skip`.
   - **TS async, conditional & mock traps:** Unawaited floating promises (`GUARD-TS-FLOATING-ASSERT`), catch-only assertions (`GUARD-TS-CATCH-ONLY`), unverified conditional assertions (`GUARD-TS-CONDITIONAL-ASSERT`), and test double self-mocking (`GUARD-TS-SELF-MOCK`).
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
