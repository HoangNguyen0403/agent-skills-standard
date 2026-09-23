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
5. **Framework packs**: Large framework categories may add category-level `references/framework-map.md` for bundle-level guidance; keep `SKILL.md` files focused on decisions and verification.
6. **Guardrail skills**: For TDD, debugging, review, verification, protocol, or workflow skills, add `pressure_scenarios`, `rationalizations`, `red_flags`, and behavior assertions to `evals/evals.json`.
7. **Evidence first**: Do not tighten a guardrail skill without baseline or regression evidence for the behavior you are trying to change.

### Cybersecurity packages and governed evolution

- `cybersecurity` is opt-in, not part of default initialization. Select it in
  `.skillsrc` under `skills` with a reviewed immutable `ref`; before the first
  category release, use a reviewed commit SHA, not the unpublished
  `cybersecurity-v1.0.0` tag. Add `cyber-exercise`, `cyber-triage` and/or
  `cyber-purple-validation` explicitly to `workflows`.
- White team means exercise control and independent adjudication, not a synonym
  for compliance or white-hat testing. Use shared authorization/evidence skills
  across every team. Blue containment can be disruptive too.
- Keep examples synthetic or offline. Record scope, source/version, time,
  evidence, limitations, owner and finding status (`confirmed`, `suspected`,
  `blocked`, `not-tested`, `false-positive`). Missing telemetry is not success.
- Framework edges require framework/version/ID, relation, rationale, primary
  source and review status. An edge is not certification or measured efficacy.
- Keep root `LICENSE`/`NOTICE` attribution and package resources reviewable.
  Review scripts before execution; sync preserves bytes but does not approve
  code or enforce its runtime permissions.
- A retrospective creates a redacted proposal by default. Edit canonical source
  only with authorization; compare candidate/current/no-skill behavior with
  held-out cases; require independent review, staged rollout and rollback.
  Never treat a learning-log entry or a reviewer-name string as authorization.
- New release evidence must bind the complete package and immutable eval inputs.
  Resource changes invalidate skill-loaded evidence. Historical evidence remains
  readable but is not upgraded retroactively into whole-package proof.

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
pnpm freshness:audit
pnpm test
pnpm build
```

`pnpm freshness:check` is the weekly upstream drift job (`.github/workflows/skill-freshness.yml`), not a PR gate: it needs a `GITHUB_TOKEN` (up to ~110 GitHub requests) and exits 1 whenever any upstream has shipped a new major, regardless of your change. Run it locally only when reviewing pins; see `docs/FRESHNESS.md`.

For changes to the architecture-diagram pipeline, also run its stdlib Python suite and a real render:

```bash
python3 -m unittest discover -s skills/common/common-architecture-diagramming/scripts -p 'test_*.py'
python3 skills/common/common-architecture-diagramming/scripts/validate_manifest.py skills/common/common-architecture-diagramming/assets/fixtures/view-manifest.json
python3 skills/common/common-architecture-diagramming/scripts/render_drawio.py skills/common/common-architecture-diagramming/assets/fixtures/component.spec.json -o /tmp/component.drawio --strict
```

Inspect the rendered image in draw.io, not only XML or geometry checks. Refresh golden files only after an intentional renderer change (`UPDATE_GOLDEN=1 python3 -m unittest test_fixtures` from the scripts directory), then verify without the update flag. Never acknowledge overwriting a manually edited diagram without first reconciling its semantic changes into the spec. For system-design guidance, pair lexical checks with the independent rubric; targeted comparisons are not aggregate quality scores.

For live-eval or eval-definition changes, also run:

```bash
pnpm evals:audit
pnpm evals:baseline -- --plan
pnpm evals:verify -- --all
pnpm evals:report
pnpm evals:queue -- --run <runId>
```

For routine maintenance, `pnpm evals:baseline` is the single starting command.
It selects the latest complete immutable reference and creates a selective run
only for changed skills; it reuses only source-compatible transcripts. Do not
replace it with a full `--all` run unless the protocol, model, or generation
environment changed.

When evaluating release trustworthiness after broad remediation, use a fresh
aggregate manifest and execute it with one pinned model/reasoning configuration.
The release gate is per skill: with-skill case pass must be strictly above 85%,
assertion pass must be at least 85%, delta must be non-negative, and trigger
recall/specificity must each be at least 90%. A composite or reused run may be
kept as historical evidence but cannot be promoted as release proof.

Never hand-edit `results.json` or historical transcripts. New runs must be complete, must contain immutable `inputs.json`, and must use the canonical `.agents/workflows/evals-run.md` workflow; regenerate exported workflow copies from the canonical source.

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
