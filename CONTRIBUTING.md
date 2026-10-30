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
- Prefer consumer-visible behavior over pinned implementation detail. Do not snapshot the per-agent capability table merely to detect drift: capability and generated-export drift belongs to `pnpm docs:capabilities:check` and real transformer/ownership checks. When a test pins incidental wiring, source wording or a capability descriptor that is changing by design, remove it rather than repinning the old value.

### Session retrospective testing (local, synthetic only)

The retrospective core lives in `mcp/src/retrospective*` and ships the `ags-retrospective` binary plus the `agent-skills-standard-mcp/retrospective` subpath. Test it with the checked-in synthetic journal (`mcp/test/fixtures/retrospective/native-events.jsonl`), a hand-written synthetic manifest pointing at it, and a throwaway root — never a real journal, real manifest or `~/ags/diagnostics`.

```bash
# build (emits the CLI, the subpath chunk and declarations)
rtk pnpm --filter agent-skills-standard-mcp build

# retrospective suites: evidence, store, checkpoint, analysis, publication, CLI
rtk pnpm --filter agent-skills-standard-mcp exec vitest run \
  test/retrospective-evidence.spec.ts test/retrospective-store.spec.ts \
  test/retrospective-checkpoint.spec.ts test/retrospective-analysis.spec.ts \
  test/retrospective-publication.spec.ts test/retrospective-cli.spec.ts

# typecheck the retrospective graph separately (the build's declaration step emits .d.ts via
# `tsc -p tsconfig.retrospective-types.json`, which also resolves these types)
rtk pnpm --filter agent-skills-standard-mcp exec tsc --noEmit

# package entry and CLI smoke against a temporary root (human terminal only)
# subpath self-reference only resolves inside the package, so run it from mcp/
( cd mcp && node -e "const r=require('agent-skills-standard-mcp/retrospective'); console.log(typeof r.prepareLocal, typeof r.resolveArtifact)" )
# <synthetic-manifest.json> = the two-node example in docs/session-retrospective.md, whose
# absolutePath points at mcp/test/fixtures/retrospective/native-events.jsonl
node mcp/dist/retrospective-cli.js prepare --manifest <synthetic-manifest.json> \
  --consent local-only --root <tmp-dir> --ack-storage-risk

# tarball membership, then delete the tgz
( cd mcp && rtk proxy npm pack --dry-run )
```

- `--ack-storage-risk` is required on every `prepare`; it records an unknown sync/backup risk and never overrides owner-only permissions. An existing `0755` root is refused with `ROOT_PERMISSIVE` — create a new root with `mkdir -m 700` or `chmod 700` a dedicated directory.
- Assert exit codes and the single JSON stdout line / code-only JSON stderr — never report text, paths or transcripts. `paths` is human-facing and must not be invoked from a hosted tool result.
- Host adapter packages live under `integrations/session-retrospective/` (`paseo`, `omp`) and are verified in CI by `scripts/verify-retrospective-adapters.mjs` (job `retrospective-adapters`) against exact pinned SDK tarballs; `retrospective-windows` runs the retrospective suites on Windows on push. Locally you can still build and test them in their own package context:

  ```bash
  # per adapter package (paths as shipped); CI proves SDK compatibility, host smoke does not
  ( cd integrations/session-retrospective/omp  && pnpm typecheck && pnpm test )
  ( cd integrations/session-retrospective/paseo && pnpm typecheck && pnpm test )
  node scripts/verify-retrospective-adapters.mjs
  ```

  OMP is manual-only on 18.13.1 (`/retrospective manifest <absolute-path>`) and requires a per-run storage-risk confirmation; its automatic invitation path is unsupported by design, so do not add a `session_stop`/`setStatus` expectation there. Its store root must come from an explicit absolute environment override — never project-local `<cwd>/.omp/...` config — and a root inside the current folder **or anywhere in the same Git repository** (resolved through symlinks) is refused, as is an unresolvable root (`STORE_ROOT_UNRESOLVED`). The Paseo panel's session-data-collecting and report-reading RPCs are **disabled** pending verified host human admission, so do not add tests that assert panel prepare/read behaviour, and do not document an enabling environment variable or setting. The former `paseo-hooks` invitation package was **deleted** by user decision: the released Paseo SDK cannot enumerate child sessions, so its checkpoint tool could never succeed, and automatic invitations are unsupported on every host. Adapter host smoke and cross-platform path/ACL behaviour remain **pending verified** — do not report them as passing because CI typecheck and unit suites are green.
- The public `agent-skills-standard-mcp/retrospective` subpath is deliberately bounded. `collectEvidence`, `claimRun`, `cancelRun`, `publishRun`, `prepareStore`, `withSessionLock`, `sessionToken` and `storeLayout` (and their types) are **not exported**; tests import the modules directly. Drive the CLI or the documented adapter calls instead of reaching for internal mutators.

## 3. Creating Skills

Skills are the core value of this project.

1. **Draft**: Use `pnpm list-skills` or check `skills/metadata.json` to see existing categories.
2. **Create**: Add your category folder in `skills/`.
3. **Validate**: Keep each canonical `SKILL.md` at or below 100 lines; verify token budget with `pnpm calculate-tokens`.
4. **Reference**: Move detailed content to `references/`.
5. **Framework packs**: Large framework categories may add category-level `references/framework-map.md`; keep skill files focused on decisions and verification.
6. **Guardrail skills**: Add `pressure_scenarios`, `rationalizations`, `red_flags`, and behavior assertions to `evals/evals.json`.
7. **Evidence first**: Retain applicable earlier cases, remove obsolete expectations, and add preventing cases for corrected behavior. Candidate fixtures are not live efficacy evidence.
8. **Public package boundary**: Do not ship project-specific environment, VPN, account-selection, or credential-handling recipes in reusable skills or references.
9. **Trigger precision**: Qualify collision-prone framework topics; retain unrelated workflow negatives and intended qualified positives. Test consumer routing, not metadata copies.
10. **Requirements modeling & scope trees**: For complex feature discovery, load `references/requirements-modeling.md` on demand for verb-object scope trees, stop rules, and canonical shared definitions.
11. **Question-driven representations & diagram reuse**: Select views by question per `references/requirements-modeling.md`. Diagrams remain optional when markdown tables or prose answer precisely; reuse existing diagram capabilities.
12. **Low-risk equivalence & sensitive floors**: Low-risk maintenance tickets with approved behavioral AC, owner, scope fence, approval, and verification lane satisfy readiness without document creation. Enforce sensitive floors per `references/requirements-modeling.md`.
13. **Scoped change impact**: When requirements change, trace affected ACs, contracts, approvals, and evidence carrying existing IDs without reopening settled decisions.
14. **Host-neutral guidance**: Keep provider, account, profile, model, and machine specifics in host planning records only, not canonical guidance.
15. **System-design package**: Keep design-process ownership in `system-design-methodology` and critical-flow semantics in `system-design-data-architecture`; link to the canonical flow contract instead of copying it. Route mobile/client or SDK guidance only when those surface constraints affect correctness. Select views from decisions; do not impose infrastructure or diagram quotas.
16. **Delivery evidence**: Skill bodies are delivered per request in full. Never propose suppressing required content as a token optimization, and never claim savings from omitted bodies. Selection, returned-body and body-digest counts are different measurements.
17. **Routing metadata**: Keyword and composite patterns are consumer routing contracts. Qualify collision-prone substrings (for example delimiter-qualified `-view` / `-form`) and keep a positive control proving the intended match still fires.
18. **Diagnostic-prevention & trust boundaries**: Strictly scope operation-private capability minting to privileged mint, seal, restore, or high-risk mutation capabilities (ordinary user sessions follow their legitimate intended lifetime); require revalidation against authoritative sources (rejecting stale shared ledgers), and authentic caller provenance in persisted evidence without universal cryptographic signature mandates. Do not claim synthetic auth bypass (such as renderer-only fixtures, manual header injection, or standalone fetch) as proof of backend governance or CSRF enforcement.
19. **Truthful telemetry & resource accounting**: Follow the Missing ≠ Zero principle. In telemetry guidance and reporting, never coerce missing token counts or pricing rates to 0 or $0.00; distinguish catalog discovery from body fetch, context delivery, and active tool usage.
20. **Learning logs & no auto-promotion**: Document repeated mistakes and retrospective findings as proposed candidate lessons requiring human review. Do not auto-promote agent learnings directly into repository rules, instructions, or policy.

## 4. Creating Workflows

Workflows are portable SDLC procedures, not CLI commands. Keep canonical files in `.agents/workflows/*.md`; sync exports to each agent's native surface.

Rules:

1. Keep workflow files under 80 lines.
2. Use the order: goal, steps, output template.
3. Do not pre-fill example data.
4. Put heavy examples or checklists in `references/`.
5. Keep requirement naming explicit: BRD-lite (`brainstorm-feature`), PRD (`plan-feature`), SRS/FRS (`design-solution`).
6. Add to `DEFAULT_WORKFLOWS` only for the standard SDLC spine; add canonical source at `.agents/workflows/<name>.md`.
7. Core SDLC workflows expose `Runtime Contract`, `Handoff Payload`, `Blocking Questions`, and `Next Workflow`.
8. Run `pnpm audit:sdlc` after changes.
9. Never hand-edit a generated native workflow export. Sync installs the canonical body once for every configured provider and derives native output from it; regenerate through `pnpm generate-indices` and the normal sync tooling. In this repository, committed mirrors have no per-file lock ownership, so the generator forces only the deterministic export paths for the selected canonical workflows and backs up the replaced bytes first. It refuses to run from any working directory whose realpath differs from the authoring repository root, and it never forces `.agents/workflows/**` — the canonical catalog (including the Antigravity/Kiro native destination) is authored source, not a mirror.
10. Ownership is per canonical body: a workflow still bound by a configured agent or carrying a recorded native conflict survives partial uninstall; an edited, unowned or overridden canonical body is preserved and reported instead of being certified as managed.
11. MCP workflow lookup reads the installed catalog from `.skills-lock.json`; if a lock exists but the catalog metadata is missing, lookup reports `unverified` and asks for a sync instead of falling back to local or native copies.

## 5. Cybersecurity packages and governed evolution

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
- `cyber-lab-validation` is a strictly separate, opt-in candidate contract package within `cybersecurity`. It describes eligibility criteria for predeclared minimum-proof actions against pinned disposable synthetic local fixtures only. It requires explicit action- and version-specific approval, independently demonstrated host isolation and cancellation controls, finite limits, paired evidence, and bounded teardown. It is not an attack platform or general executor.
- `cyber-scoped-validation` remains the canonical offline and supplied-evidence validation lane. Canonical workflows (`cyber-exercise`, `cyber-purple-validation`, `cyber-triage`, `pentest`) route between safe offline analysis/replay and optional isolated lab validation through explicit preflights; if an active step is blocked or refused, dependent downstream steps are marked `dependency-blocked` (`evidence-missing`) while independent remediation, analysis, and rule drafting continue safely.
- Candidate contracts in `cyber-lab-validation` remain dormant in the repository without tool autoactivation. Multi-gate progression governs any future activation: G3 requires per-run host containment/cancellation proof; G4 requires evaluated model acceptance and independent review; G5 requires explicit publication approval.

## 6. Product management packages and evidence lifecycle

- `product-management` defaults to two foundation skills (`product-business-requirements` and `product-requirements`) via category include allowlist during `ags init`. The eight advanced skills (`product-evidence` and the seven discovery/validation methods) are opt-in. Select them in `.skillsrc` under `skills` with a reviewed immutable `ref` (omit `include` or list desired skills explicitly); before the first category release, use a reviewed commit SHA. Add `discover-product`, `validate-product` and/or `review-product-value` explicitly to `workflows` (or set `workflows: true`).
- All product decisions ground in `docs/product/<slug>/evidence.json` via `product-management/product-evidence`. Never fabricate customer observations, interview quotes, or causal ROI.
- Keep seven advanced PM skills keyword-only (`triggers.files: []`); keep `product-evidence` scoped to `docs/product/*/evidence.json`; keep foundation BRD/PRD skills scoped to their respective spec files. Never add broad markdown globs or universal file triggers that activate PM skills unexpectedly.
- Standalone validator (`validate-product-evidence.mjs`) and investment calculator
  (`evaluate-investment.mjs`) require Node >=20. In contrast, CLI sync and the T09
  integration harness require Node 22+ (using `Promise.withResolvers`).
- Invocation of standalone resources returns structural findings and host-check
  eligibility, never autonomous action consent. Review scripts before execution;
  sync preserves bytes and ownership but does not grant autonomous spend,
  experiment exposure, or rollout authority.
- MCP workflow discovery (`list_workflows`, `get_workflow`) scans only canonical
  `<root>/.agents/workflows` (Antigravity/Kiro). Other agents export workflows to
  their native surfaces; no runtime scanner expansion is performed.
- JSON routing maps `*.json` to `common` and `product-management`. `product-evidence` matches exclusively `docs/product/*/evidence.json`, while advanced PM skills are strictly keyword-only and never match `package.json` or unrelated JSON files.

## 7. Default Init Standards

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
9. Specialists and generated workflow skills set `metadata.internal: true` so skill installers (`npx skills`) don't offer them as installable skills.

## 8. Quality Gates

Run these before PR:

```bash
pnpm --filter ./cli validate:all
pnpm audit:skills
pnpm audit:sdlc
pnpm check-alignment
pnpm docs:capabilities:check
pnpm freshness:audit
pnpm test
pnpm build
```

`pnpm check-alignment` checks lexical eval alignment (that eval `contains` anchors exist in the skill body); it is not export parity, native capability or runtime-success proof. Capability-table drift is checked separately by `pnpm docs:capabilities:check`, and generated mirrors must come from `pnpm generate-indices` rather than manual edits.


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

For system-design evaluations, lexical assertions check presence or routing only; they do not judge mechanism correctness or prove runtime behavior. A body-only comparison is not whole-package evidence: references, workflow guidance, package resources, and generated exports may change behavior. Report source scope and evidence kind separately, and require fresh applicable package-bound evidence before claiming release efficacy. Model execution remains subject to its separately authorized route and approval gate.


For release candidates, also run:

```bash
pnpm check-alignment --threshold 90
pnpm benchmark:report
```

Guardrail-oriented skill changes should also verify that the benchmark report shows behavior coverage for the edited skills.

### Isolated Stage Generation & Check-Only Pre-Commit

> [!NOTE]
> **Candidate Tooling (Verified This Candidate / Revision):** Isolated stage generation and pre-commit check tooling are verified for this candidate revision (95 outputs applied + verified check PASS; SDD evidence intact). Scoped adoption remains strictly bounded and requires explicit authority with matching tracked base and prior producer output. The candidate remains unreleased; example commands and plan approval do not themselves authorize future execution, publication, or release. No host enforcement, Node 20 runtime, model efficacy, or benchmark uplift is claimed.

To prevent clobbering active worktree evidence (such as `.agent/sdd`) or drifting destination files during generation, index and capability generation is executed in an isolated stage:

```bash
# Verify prepared generation outputs (check-only pre-commit hook)
node --import tsx scripts/generation/index.ts --check

# Run generation in an isolated stage and copy back verified changes
node --import tsx scripts/generation/index.ts
```

Pre-commit hooks are strictly check-only; they must never actively generate files or run git staging. The isolated stage records pre-generation digests and halts if concurrent edits or foreign paths are detected.

The public `pnpm generate-indices` command uses the candidate coordinator. Run
`pnpm generate-indices --check` to verify prepared outputs and
`pnpm generate-indices` to apply them. The coordinator invokes the internal
`scripts/generate-indices.ts` child directly in its isolated stage to avoid
recursion.
By default, unchanged existing outputs may be checked without creating an
ownership manifest; differing outputs without trusted ownership are refused.
Do not use adoption as a routine override. An authorized bounded adoption uses
`pnpm generate-indices --adopt-base <full-commit-sha>` and requires the current
files to match both that tracked base and the prior producer's output. Adoption
evidence is archived under the run receipt before publication.
`--check` never adopts or changes ownership.

The ownership manifest keeps CLI-managed entries separate from the
repository-generation ledger. Publication updates only changed, verified
outputs; unchanged unowned files are not claimed. The `skills/metadata.json`
generation entry records both its full-byte digest and a scoped digest over
each category's `token_metrics` value (including whether that field is absent).
The token producer may change that scope only; authored fields outside
`token_metrics` remain active. A metric-changing refresh requires the active
metadata file to use two-space JSON serialization with a final newline, then
updates only `token_metrics` while preserving the other fields. Unsupported
serialization or nonmetric producer changes fail closed rather than
reformatting authored data.

Before publication, the coordinator validates configured category/index
coverage, host mirrors and transformed outputs, workflow and specialist
surfaces, and the capabilities document against its producer's exact render.
It snapshots source, destination, manifest, and Git invocation state; archives
before-bytes outside those inputs; revalidates before each publish effect; and
publishes the ownership ledger last. Keep the Task 1 review gate above: this
contract does not authorize root generation or release by itself.

### Truthful Layered Verification & Host Boundaries

Verification tracks layered acceptance states independently based on approved task and release scope applicability (not requiring universal human sign-off on every unit iteration):
1. **Source-ready**: complete source delivery at recorded Git SHA + dirty identity, with build, lint, and typecheck recorded independently (`PASS`, `FAIL`, `NOT RUN`, or `NOT APPLICABLE`).
2. **Focused checks**: unit and boundary contract suites; test count and membership derived directly from raw output, rejecting zero-exit or no-listener runs.
3. **Consumer-smoke**: real producer→consumer integration proof scoped to actual changed entrypoints and outward side effects, not universal regression coverage.
4. **Independent review**: unbiased inspection by separate reviewers per approved scope.
5. **Human acceptance**: explicit authorized sign-off when mandated by release scope.

Pre-implementation RED must be recorded as `NOT RUN` if not actually observed prior to code edits; never fabricate historical RED by modifying guards or asserting simulated failures. Finite eval oracles verify bounded assertion contracts; they do not prove whole-answer semantic safety, model uplift, or production efficacy.

Host-level actor-scoped tool authorization, task/turn ownership, process management, and telemetry collectors (H01–H05) are external host responsibilities (e.g., OMP/Paseo). In this checkout, host-only slices remain explicitly blocked by user decision; repository rules must never be misrepresented as live host enforcement, auto-approval, or denial bypass. Do not claim model efficacy, benchmark uplift, or deployed host security enforcement without qualified evidence from an authorized live environment.

## 9. Release Process

We use specialized scripts for releasing components independently:

- `pnpm release-cli`: Bumps `cli/package.json` and updates `CHANGELOG.md`.
- `pnpm release-all-skills`: Syncs and pushes git tags for newly bumped versions in `skills/metadata.json` (`categories` and `releases`).
- `pnpm release-server`: Releases the backend component.
- `pnpm release:manifest --tag <tag> [--out <file>]`: Rebuilds the deterministic `MANIFEST.json` locally for any release tag.

When `.agents/workflows/**` changes, bump `releases.workflows.version` in `skills/metadata.json`. Every registry release publishes a `MANIFEST.json` containing sha256 checksums of all released files along with a GitHub build-provenance attestation.

Ensure you update `CHANGELOG.md` manually before running release scripts if significant features were added.

## 10. Delegation, capability and evaluation evidence

These rules bind contributors changing delegation or model-capability guidance. They describe repository contracts; they do not activate a host default, enforce permissions or establish savings.

1. **One placement contract.** `skills/common/common-subagent-driven-development/SKILL.md` §1 owns the context-benefit placement decision. Link it from workflows and references; never add a second decision table. Placement is a preparation decision on the existing dispatch receipt, not an eighth lifecycle operation, host API or schema field. A specialist label, workflow stage, file count or plan length is not a delegation benefit, host requirements win, and an independent reviewer is required regardless of placement.
2. **One capability contract.** `skills/common/common-task-complexity-routing/references/routing-table.md#capability-and-effort-resolution` owns capability versus effort guidance, host-owned resolution, dispatch-receipt fields, recovery routes and cost vocabulary. Link the heading instead of restating fields. Do not add a model-resolver service, pricing API, telemetry store or mandatory assignment-schema field.
3. **Hints are not authority.** `fast|standard|strong` and low/medium/high effort are advisory. Eligibility, approved profiles, supported effort and fallback come from host/project configuration; explicit configured settings are never silently replaced. Offline/synthetic fixtures never promote a native support claim.
4. **Honest accounting.** Count the accepted task including parent, workers, independent reviews, repairs and failed or cancelled attempts. Keep tokens, billed money, subscription/quota consumption and elapsed time distinct. Unknown price or quota stays `unknown`; claim no monetary saving without complete comparable actor coverage.
5. **Offline versus live.** Scorer, lexical and fixture runs are routing/assertion evidence only. Do not describe them as live model efficacy, measured savings, host activation or sandbox enforcement. Preserve earlier failures as dated history rather than rewriting them into passes.
6. **No unauthorized spend.** Live comparative runs require separately recorded provider/account eligibility, exact model and effort, run cap, spend or usage ceiling, expiry and human approval. Without it, finish the protocol and offline checks, record live runs as `not_run`, and activate nothing.
7. **Protocol.** Follow `docs/validation/context-aware-delegation-protocol.md` for any proposed delegation or capability comparison: all ten scenarios, three matched repetitions per scenario per arm, unchanged-variable controls, per-case regressions, synthetic fixtures for dangerous or provider-failure cases, and reuse of existing eval infrastructure rather than a new benchmarking platform.
8. **Generated surfaces and evidence.** Never hand-edit generated mirrors or native exports; regenerate through the documented generator flow and preserve `.agent/sdd` evidence, immutably archived under `artifacts/<slug>/evidence/` with a manifest. A green generator run is not export parity.
