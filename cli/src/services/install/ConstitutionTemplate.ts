/**
 * Renders the optional project `CONSTITUTION.md` scaffolded by `ags init`.
 * The template is a starting point only: `ags init` never overwrites an
 * existing file, so edits made by the project remain authoritative.
 */
export function renderConstitution(frameworkId: string): string {
  return `# Project Constitution

## Stack

- Primary framework: ${frameworkId}
- Languages and key packages: TODO

## Architecture style

- TODO (for example layered, modular monolith, or event-driven)
- Record deviations in a decision record.

## Conventions

- Follow installed agent-skills-standard skills for this stack.
- Naming, errors, and module boundaries per common-best-practices.

## Test policy

- Verify every behavior change with the narrowest runnable check.
- Add tests for uncertain edges or on request; do not pin wording.

## Non-goals

- TODO: list what this project deliberately excludes.

## Ownership contract

- Own code in files you were assigned or changed; merge duplicates, delete orphans, fix defects.
- Outside those files, report \`path:line\` and do not edit.
- Do not change public APIs, persisted schemas, or dependencies without a recorded decision.
- Growth beyond roughly 2x the planned diff: stop and report.
- Canonical rule: common-best-practices, "Ownership Contract".
`;
}
