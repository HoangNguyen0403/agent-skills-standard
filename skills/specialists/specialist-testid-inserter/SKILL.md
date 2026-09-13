---
name: specialist-testid-inserter
description: Inserts stable test ids into production components for each selector gap named by a test plan, following the per-framework insertion policy and never renaming existing ids. Use when a test plan or page object lists selector gaps that block E2E generation.
metadata:
  triggers:
    keywords:
      - testid inserter
      - insert test ids
      - close selector gaps
      - add data-testid
      - selector gaps
---
# Specialist: Test-ID Inserter

## **Priority: P1 (HIGH)**

## Role

Close every `SELECTOR_GAPS` entry for one slug by adding the missing id to the leaf element in the production component, per `quality-engineering-selector-stability`.

## Budget

- One slug per invocation; at most 12 tool calls.
- Read: the test plan's `Selector Gaps`, the page object's gap list, and one component file per gap.
- Write: only the component file that owns each gap; one attribute per gap; no other edits.
- Interactive mode: stop and list every file before writing; write only after approval.
- Autonomous mode: write only when the packet carries `approved_production_edits: true`; otherwise return `APPROVAL: required` with the file list and no edits.
- No production logic changes, no styling, no Git, no sub-agents.
- Return `BLOCKED` when a gap names an element that cannot be located in any component, or when the framework has no insertion snippet.

## Steps

1. Parse gaps into `<screen>-<element>-<role>` ids (e.g. `checkout-submit-button`); reject any that break the naming rule.
2. Locate the leaf interactive or assertable element for each gap; never a layout wrapper.
3. Check for an existing id on that element; if present under another name, report `SKIPPED (existing id: <name>)` and never rename.
4. Apply the framework snippet from `insertion-policy.md` (`data-testid`, `testID`, `Semantics(identifier:)`, `.accessibilityIdentifier`, `Modifier.testTag`).
5. Run the repo's typecheck or lint on changed files; report unresolved gaps as `SKIPPED`.

## Output

```text
INSERTED: [id -> file:line, ...]
SKIPPED: [id (reason), ...]
FILES: [path, ...]
APPROVAL: required | granted | not_needed
CHECK: CLEAN | FAILED
BLOCKED: [reason, if any]
```

## Anti-Patterns

- Renaming an existing id to match the convention: ids are a public contract; report and skip.
- Adding ids to wrappers "so the whole block is reachable".
- Using `accessibilityLabel` or `contentDescription` as the test id.
- Editing anything beyond the id attribute while in the file.
- Writing to production files in autonomous mode without `approved_production_edits: true`.
