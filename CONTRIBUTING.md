# Contributing to Agent Skills Standard

Thank you for your interest in contributing! This document provides guidelines for setting up your environment and following our standards.

## 1. Development Setup

### Prequisites

- Node.js v18+
- pnpm (v9+)

### Installation

```bash
# Install dependencies
pnpm install

# Build the project
pnpm build
```

## 2. Testing Standards

We maintain high test coverage (>90%). All PRs must include tests.

```bash
# Run all tests
npx vitest run

# Run with coverage report
npx vitest run --coverage
```

### Test Structure

- Unit tests live alongside source files in `__tests__` directories.
- Integration tests verify the CLI commands end-to-end.
- Snapshot testing is encouraged for critical outputs like `AGENTS.md`.

## 3. Creating Skills

Skills are the core value of this project.

1. **Draft**: Use `pnpm list-skills` or check `skills/metadata.json` to see existing categories.
2. **Create**: Add your category folder in `skills/`.
3. **Validate**: Ensure `SKILL.md` is under 500 tokens (check with `pnpm calculate-tokens`).
4. **Reference**: Heavy content goes to `references/`.
5. **Guardrail skills**: For TDD, debugging, review, verification, protocol, or workflow skills, add `pressure_scenarios`, `rationalizations`, `red_flags`, and behavior assertions to `evals/evals.json`.
6. **Evidence first**: Do not tighten a guardrail skill without baseline or regression evidence for the behavior you are trying to change.

## 4. Creating Workflows

Workflows are portable SDLC procedures, not CLI commands. Keep canonical files in `.agents/workflows/*.md`; the sync pipeline exports them into each agent's native surface.

Rules:

1. Keep workflow files under 80 lines.
2. Use the order: goal, steps, output template.
3. Do not pre-fill example data.
4. Put heavy examples or checklists in `references/`.
5. Keep requirement naming explicit for users: BRD-lite (`brainstorm-feature`), PRD (`plan-feature`), SRS/FRS (`design-solution`).
6. Add the workflow to `DEFAULT_WORKFLOWS` only when it belongs in the standard SDLC spine, and add canonical source at `.agents/workflows/<name>.md`.
7. Core SDLC workflows must expose `Runtime Contract`, `Handoff Payload`, `Blocking Questions`, and `Next Workflow` for interactive and channel-agent runtimes.
8. Run `pnpm audit:sdlc` after changes.

## 5. Default Init Standards

`ags init` should create a useful SDLC standards layer without requiring profile files.

Rules:

1. Include `quality-engineering` as a skill category by default when registry metadata provides it.
2. Sync `specialists` directly as native sub-agents, not as `skills.specialists`.
3. Keep `custom_overrides` visible so teams know how to protect local standards.
4. Use pinned category refs from `skills/metadata.json`.
5. Treat Jira, ADO, Zephyr, and similar MCPs as optional workflow integrations, not required core dependencies.
6. Workflows may call available tasking/test MCPs, but must still work from local artifacts.
7. Channel agents must continue only when required artifacts/owners are known; otherwise return BLOCKED with max 3 blocking questions.
8. New specialists must include `evals/evals.json`, strict budgets, structured output, and `No sub-agents`.

## 6. Quality Gates

Run these before PR:

```bash
pnpm --filter ./cli validate:all
pnpm audit:skills
pnpm audit:sdlc
pnpm check-alignment
pnpm test
pnpm build
```

For release candidates, also run:

```bash
pnpm check-alignment --threshold 90
pnpm benchmark:report
```

Guardrail-oriented skill changes should also verify that the benchmark report shows behavior coverage for the edited skills.

## 7. Release Process

We use specialized scripts for releasing components independently:

- `pnpm release-cli`: Bumps `cli/package.json` and updates `CHANGELOG.md`.
- `pnpm release-all-skills`: Syncs and pushes git tags for newly bumped versions in `skills/metadata.json`.
- `pnpm release-server`: Releases the backend component.

Ensure you update `CHANGELOG.md` manually before running release scripts if significant features were added.
