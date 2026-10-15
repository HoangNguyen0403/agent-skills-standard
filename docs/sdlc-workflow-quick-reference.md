# SDLC Workflow Quick Reference

Agent Skills Standard syncs workflows into each agent's native surface. Run `ags sync`, then invoke the synced workflow from Claude, Codex, Cursor, Gemini, Copilot, Kiro, or another configured runtime.

| Requirement Layer      | Core Question                                    | Workflow                   | Use When                                                               | Primary Output                        |
| ---------------------- | ------------------------------------------------ | -------------------------- | ---------------------------------------------------------------------- | ------------------------------------- |
| Route                  | Which workflow now?                              | `sdlc`                     | Unsure what to run next                                                | next workflow                         |
| BRD-lite / Direction   | Why are we doing this, and which way?            | `brainstorm-feature`       | Idea, business case, or technical direction unclear                    | `docs/brd/brd-[slug].md`              |
| PRD                    | What are we building?                            | `plan-feature`             | Feature needs scope, requirements, and AC IDs                          | `docs/prd/prd-[slug].md`              |
| Architecture           | How big and what shape?                          | `system-design-session`    | Scale, topology, or store choice is unsettled                          | `docs/design/system-design-[slug].md` |
| SRS/FRS                | How will it work technically?                    | `design-solution`          | Contracts, behavior, or architecture are unclear                       | `docs/srs/srs-[slug].md`              |
| Readiness              | Are we ready to build?                           | `implementation-readiness` | BRD/PRD/SRS or test plan needs go/no-go                                | readiness verdict                     |
| Build                  | Can we implement safely?                         | `implement-feature`        | Approved feature needs code                                            | `docs/srs/srs-task-list-[slug].md`    |
| Test Loop              | Do we have executable, traced test coverage?     | `test-loop`                | ACs have E2E/mobile lanes without executable coverage                  | test suite + verdicts                 |
| Verify                 | Did we prove it with fresh evidence?             | `verify-work`              | Work is code-complete but unproven                                     | `docs/srs/srs-walkthrough-[slug].md`  |
| UAT Signoff            | Does the business accept it?                     | `uat-signoff`              | `verify-work` PASS needs business acceptance before release            | signoff decision                      |
| Trace                  | Is every requirement covered?                    | `traceability-audit`       | Pre-release or handoff needs evidence mapping                          | traceability report                   |
| Release                | Is deployment safe?                              | `deploy-release`           | Verification passed and deployment is planned                          | deployment report                     |
| Incident               | How do we stop harm right now?                   | `incident-hotfix`          | Production incident or urgent regression needs mitigate-first response | mitigation + handoff                  |
| Maintain               | Is production still inside its control bands?    | `monitor-respond`          | Control band breached or a scheduled scan completed                    | tiered response + routed intake       |
| Publish                | What do users need to know?                      | `publish-notes`            | Need release communication                                             | release notes                         |
| Learn                  | How do we prevent repeat issues?                 | `retro-learn`              | Need standards/process feedback loop                                   | retro report                          |
| Session                | What happened in this delivery?                  | `session-report`           | Need concise run summary and follow-ups                                | session report                        |
| Fix                    | How do we remediate a bug?                       | `dev-fix`                  | Bug ticket needs remediation                                           | fix plan and evidence                 |
| Review                 | What risks are in this change?                   | `review-ticket`            | Ticket or complex change needs specialist fanout                       | review verdict                        |
| Review (Design)        | Is this provided design sound?                   | `review-system-design`     | A diagram, doc, or IaC repo arrives for review                         | scorecard + findings                  |
| Review (PR)            | Is this PR safe to merge?                        | `code-review`              | PR diff needs focused merge-risk review                                | review findings                       |
| Review (Repo)          | What structural risks exist in the codebase?     | `codebase-review`          | Need broader architecture/quality scan                                 | prioritized findings                  |
| Security               | What exploitable risk exists now?                | `security-test`            | Need SAST/SCA/secrets or branch security checks                        | security report                       |
| Security (Adversarial) | Can this be exploited in practice?               | `pentest`                  | Need PTES-aligned exploit validation                                   | pentest report                        |
| Benchmark              | Is this skill behavior improving under pressure? | `skill-benchmark`          | Need scored quality comparison vs legacy constraints                   | benchmark report                      |
| Bug Verify             | Is the fixed bug gone in real flow?              | `verify-bug`               | Post-fix UAT validation against reproduce steps                        | bug verification report               |

## Approved Evidence And Readiness

Use the task-linked approved brief/ticket and its stable slug. An unrelated newest document or working-tree change is not task authority or approval. Equivalent approved evidence can satisfy a requirement without a separate BRD/PRD/SRS filename. Reused approved exact-revision context skips rediscovery; missing document filenames never reset settled work.

A stale or disputed decision blocks only its consuming action; unaffected approved decisions and independent scopes remain reusable without global reset. Production harm or urgent regressions always route to `incident-hotfix` first, even if product learning is stale. Known low-risk routine maintenance routes directly to `dev-fix` or `implement-feature` with proportional evidence, avoiding universal market research.

`plan-feature` owns outcome, scope, acceptance criteria, dependencies and provisional product slices; consequential architecture, API/data contracts, migrations and technical decisions route to `design-solution`.

`implementation-readiness` returns READY only for named slices with owners, required approval and verification lanes. PARTIAL passes only named ready slices; blocked slices retain their owners and missing inputs and cannot be absorbed downstream. BLOCKED does not recommend unconditional implementation. Preserve the existing Outcome Report schema and `recommended_next_workflow`.

### Question-Driven Modeling And Completeness

For substantial scope, multi-actor workflows, interacting rules, or multiple delivery slices, load `product-management/product-requirements/references/requirements-modeling.md` on demand for verb-object capability scope trees, stop rules, canonical shared definitions, question-driven view selection, and change impact.

### Low-Risk Evidence And Sensitive Floors

Sufficiently specified routine fixes or maintenance tickets with approved behavioral AC, accountable owner, scope fence, approval, and verification lane satisfy readiness without mandatory separate document files or full modeling detours. However, changes touching sensitive domains enforce the sensitive-change floor per `requirements-modeling.md` requiring technical design and human approval before coding.

### Scoped Change Impact And Canonical Guidance

When requirements change, trace affected ACs, contracts, approvals, and verification evidence carrying existing IDs without reopening settled decisions. Keep provider, account, profile, model, and workstation specifics in host planning records only, not canonical guidance.

### Canonical Evidence Ledger vs Delivery Requirement Trace

Initiative evidence is maintained at `docs/product/<slug>/evidence.json`. Point readable views to ledger IDs (`SRC-*`, `CLM-*`, `OPP-*`, `HYP-*`, `EXP-*`, `INV-*`, `DEC-*`, `MET-*`, `REV-*`); never duplicate editable records or mint product IDs as requirement IDs (`REQ-*`, `AC-*`, `BRD-OBJ-*`). Requirement trace remains clean, portable, and decoupled.

### Shipping vs Realized Value

Technical delivery (`feature_status: released` or `verified`) proves that implementation satisfies explicit acceptance criteria. It does not prove customer adoption, market success, or causal ROI. Realized value requires observed metrics over an elapsed comparison window; value review can be inconclusive without un-shipping working software.

### Approval Scope and Host Controls

Approval is strictly bounded: approving a brief or validation plan approves that artifact only; it does not grant deployment, spend, or runtime exposure authority. The validator returns `proposal_only` (`AUTHORIZATION_REQUIRED`) when a recorded experiment authorization decision is missing; validation exit 0 indicates `eligible_for_host_check` only, never host authorization consent. Production rollouts require explicit release owner authorization.

### Opt-in product evidence workflows

The `product-management` category defaults to two foundation skills (`product-business-requirements` and `product-requirements`). The three advanced product workflows and their underlying specialist skills (`product-evidence` and the seven discovery/validation methods) are opt-in: configure `product-management` in `.skillsrc` to include them (or omit the `include` filter) and select these workflow names explicitly in `workflows`; they are not enabled by default initialization.

| Need | Workflow | Output |
| --- | --- | --- |
| Customer friction, market evidence, and opportunity framing | `discover-product` | candidate `OPP` and `HYP` records, proposed learning/investment `DEC` |
| Bounded hypothesis validation and precommitted experiments | `validate-product` | bounded `EXP` proposal, primary/guardrail `MET` contracts, validation results |
| Post-release value review against registered measurement contracts | `review-product-value` | observed `MET` vs baseline, attribution/confounders, advisory `REV` |

Prerequisites: `product-evidence`, respective PM packages (`product-market-research`, `product-customer-discovery`, `product-strategy` for discovery; `product-investment`, `product-experimentation`, plus `product-metrics` when designing executable measurement for validation; `product-metrics`, `product-investment` for review), companion scripts, and Node >= 20.

When any package or script is absent or excluded, workflows emit a concrete capability gap in `missing_evidence` (e.g. `Capability gap: product-management/product-investment not installed; opt in at a reviewed ref and sync`) and proceed safely as unvalidated proposals without simulated validation or silent installs. Missing monetary data does not block qualitative investment framing.

## Guidance Release And Activation

For workflow source changes, update `releases.workflows.version` once for the settled shared workflow bundle, then generate native mirrors. If a source change is rolled back, revert canonical sources and regenerate mirrors before consumers sync. A source revision or PR does not prove consumer installation or runtime activation; record source delivery and machine activation separately.

### Opt-in cybersecurity workflows

Add the `cybersecurity` category with a reviewed ref and select these workflow
names explicitly in `.skillsrc`; they are not added by default initialization.

| Need                                                | Workflow                  | Output                                                           |
| --------------------------------------------------- | ------------------------- | ---------------------------------------------------------------- |
| White-team exercise control and adjudication        | `cyber-exercise`          | scoped plan, control log, independently adjudicated evidence     |
| Blue-team incident intake and containment readiness | `cyber-triage`            | evidence-led triage, authorization gates and bounded next action |
| Purple-team defensive validation                    | `cyber-purple-validation` | paired action/observation records and justified control outcome  |

Red-team planning/scoped-validation skills compose into `cyber-exercise`.
Team color never grants permission. Unsupported runtime controls block live
actions while allowing safe offline analysis. Framework mappings are not
compliance certification or evidence of production effectiveness.

### Opt-in design workflows

Select these workflow names explicitly in `.skillsrc`; they need the Google
Stitch MCP server and are not added by default initialization.

| Need                                         | Workflow               | Output                                                                      |
| -------------------------------------------- | ---------------------- | --------------------------------------------------------------------------- |
| Review and improve an existing Stitch design | `review-stitch-design` | six-axis scorecard, findings, variant screen ids, before/after              |
| Create a new Stitch design from a brief      | `create-stitch-design` | linted DESIGN.md, design system, phone and tablet screens, review scorecard |

## Native Runtime Surfaces

| Agent               | Workflow Surface              |
| ------------------- | ----------------------------- |
| Antigravity/Kiro    | `.agents/workflows/*.md`      |
| Claude/Roo/OpenCode | command markdown              |
| Gemini              | TOML command files            |
| Copilot             | prompt files                  |
| Cursor/Trae/Codex   | skill folders with `SKILL.md` |

## Industry Playbook Crosswalk

Published AI-native SDLC guidance names six stages and a chain of committed markdown artifacts. This
standard already covers that chain under requirement-layer names; the mapping below is for readers
arriving with the other vocabulary. Do not rename our artifacts to match it.

| Playbook stage | Playbook artifact     | This standard                                    | Our artifact                                           |
| -------------- | --------------------- | ------------------------------------------------ | ------------------------------------------------------ |
| Plan           | `intent.md`           | `brainstorm-feature`                             | `docs/brd/brd-[slug].md`                               |
| Design         | `spec.md`             | `plan-feature`, `design-solution`                | `docs/prd/prd-[slug].md`, `docs/srs/srs-[slug].md`     |
| Build          | `plan.md`             | `implementation-readiness`, `implement-feature`  | readiness verdict, `docs/srs/srs-task-list-[slug].md`  |
| Test           | test + eval evidence  | `test-loop`, `verify-work`, `evals-run`          | `docs/srs/srs-walkthrough-[slug].md`, eval run results |
| Deploy         | review policy + gates | `code-review`, `review-ticket`, `deploy-release` | `docs/review-policy.md`, deployment report             |
| Maintain       | control bands, scans  | `monitor-respond`, `incident-hotfix`             | `docs/ops/bands.yaml`, `artifacts/security-review.md`  |
| Cross-cutting  | metrics, guardrails   | `common-sdlc-metrics`, `common-agent-guardrails` | `artifacts/sdlc-metrics.md`, guardrail policy          |

## Role And Stage Ownership

Authority concentrates at gates. Automation runs freely between them.

| Role              | Owns the decision at                                             |
| ----------------- | ---------------------------------------------------------------- |
| Originator        | raising the need; authors the BRD-lite input                     |
| Product owner     | accepting the BRD-lite and the PRD                               |
| Technical lead    | higher-risk design and plans; owns `docs/review-policy.md`       |
| Engineer          | approving the implementation plan; addressing review findings    |
| Policy owner      | signing off the standards a spec must satisfy; owns their skills |
| Platform engineer | instruction files, guardrails, specialists, eval suite           |
| Release manager   | authorizing the production release                               |
| Security lead     | scan cadence, finding triage, dismissal reasons                  |

## Adoption Order

Start with any practice that has no prerequisite, then follow the arrows.

- No prerequisite: `common-agent-guardrails`, `brainstorm-feature`, `common-tdd` feedback loop, instruction-file hygiene.
- `plan-feature`, `design-solution` <- task-linked approved intent or product evidence (sufficiently specified low-risk maintenance with approved task tickets may proceed without a separate BRD-lite).
- `implementation-readiness`, `implement-feature` <- behavioral ACs, accountable owner, approved scope fence, and verification lane plus applicable design/test prerequisites (supplied by PRD and SRS or an equivalent approved low-risk record); sensitive changes still require technical design and human/governance approval per [requirements modeling §1](../skills/product-management/product-requirements/references/requirements-modeling.md#1-applicability--sizing-gate), and PARTIAL authorizes ready slices only.
- `code-review`, `review-ticket` <- `docs/review-policy.md` and the framework skills.
- `evals-run` config gate <- eval definitions plus a stable command to run them.
- `deploy-release` tiers <- guardrail approval gates and a rehearsed rollback.
- `monitor-respond` <- `docs/ops/bands.yaml`, deploy tiers, and guardrails.

## Anti-Patterns Worth Naming

- **No line-by-line human review of agent-written diffs**: Move human attention to intent, risk, and the gates.
- **No editing the failing test to close a bug**: Lock test paths for the duration of the fix.
- **No component-specific logic in a shared skill**: Keep it in the project instruction file or the prompt.
- **No agent-config change without an eval**: Gate skill, workflow, and hook edits on the eval suite.
- **No human approval inside the build loop**: Gate at deploy, not at every edit.
- **No stale instruction file**: Keep it to a page and update it the second time a mistake repeats.
- **No two sources of truth without linkage**: Declare one authoritative and link the other.

## Rule

Do not run daily SDLC work through `ags`. Use `ags` to initialize, sync, validate, and update standards; run the synced workflows inside your agent.

## Agentic Runtime Contract

Core SDLC workflows emit `Runtime Contract`, `Handoff Payload`, `Blocking Questions`, and `Next Workflow` sections. Interactive agents use them to ask back; channel agents use them to continue, pause as BLOCKED, or delegate named packets without guessing.

They also emit an adapter-neutral `Outcome Report`:

```yaml
schema_version: 1
run_id: "<compactISO>-<workflow>"
slug: "<slug>"
workflow: "<workflow>"
feature_status: not_started | requirements_ready | design_ready | partially_implemented | implemented | verified | released | blocked
started_at: "<ISO-8601 UTC>"
completed_at: "<ISO-8601 UTC>"
requirement_trace:
  { brd_objectives: [], requirements: [], acceptance_criteria: [], srs: [] }
completed_evidence: []
missing_evidence: []
decision_needed: []
recommended_next_workflow: brainstorm-feature | plan-feature | design-solution | implementation-readiness | implement-feature | verify-work
cost: { source: host | agent-estimate | unavailable }
agent: { identity: "<omp/provider/model>", model: "<model>" }
```

Generic task boards, MCP servers, Jira, GitHub, GitLab, Azure DevOps, Zephyr, and project-specific runtimes may map this payload to their own primitives. Canonical workflows must not require runtime-specific IDs, chat channels, containers, or filesystem mount paths.

Each core SDLC workflow must call `get_session_cost(workflow="...")` before final handoff. The MCP reports observed tool/skill/workflow activity directly; exact token cost, cache discounts, reasoning tokens, and provider extras require host runtime usage data.

Security review workflows should emit `artifacts/security-review.md` when security findings or evidence are in scope.
Capture trust class, review context, runtime contract, findings, evidence gaps, and handoff notes so the same markdown report can drive developer, AppSec, and audit-facing follow-up without rewriting the conclusions.
That report should stay continuous across `design-solution` / `implementation-readiness` -> `code-review` / `review-ticket` -> `pentest` so later stages refine the same trust and evidence record instead of starting over.
When `code-review` or `review-ticket` findings are approved for publication or channel handoff, also emit `artifacts/review-delivery.md` as the sanitized delivery packet for `specialist-pr-commenter-batch` or channel-driven follow-up.
For full-repo health checks, `codebase-review` should also emit `artifacts/codebase-review.md`, using `security-review.md` only for the security slice.

Every terminal-verdict workflow (`implementation-readiness`, `traceability-audit`, `uat-signoff`, `deploy-release`, `publish-notes`, `session-report`, `retro-learn`) also persists this payload as a
run record at `artifacts/runs/<slug>/<compactISO>-<workflow>.json` when file writes are allowed, so the verdict outlives the chat context. `scripts/audit-sdlc.ts` and `scripts/outcome/index.ts`
parse the `Outcome Report` block and validate run records against this schema.

## Task Difficulty Routing (SNC)

`common-task-complexity-routing` scores a task on Spread, Novelty, and Centrality (each 0-2, summed 0-6) into `snc_tier=low|medium|high`. `specialist-codebase-scout` emits the `SNC:` line; `sdlc`, `dev-fix`, `implement-feature`, and `code-review` carry `snc_tier` and `model_tier` in their Handoff Payload. Low runs autonomously with `fast` review; medium adds TDD + self-review + `deep` review; high requires plan-first HARD STOP, independent reviewer specialists, and human merge approval. Tiers only rise once work starts; a ticket label never sets the tier.

## Naming Rule

When users ask for BRD, PRD, or SRS:

- BRD-lite -> run `brainstorm-feature`
- PRD -> run `plan-feature`
- SRS/FRS -> run `design-solution`

## Trust Baseline

Use `skills/common/common-software-requirements/references/requirements-standards-baseline.md` as the shared source baseline for BRD/PRD/SRS phases (it ships with the skill; `docs/` does not sync to consumers).

## Requirement Quality Rule

- BRD: SMART objective, stakeholders, AS-IS/TO-BE, cost-benefit, glossary, validation owner.
- PRD: specific personas, use cases, `REQ-*`, `AC-*`, Gherkin where needed, analytics, risks, rollout, changelog.
- SRS/FRS: `BRD-OBJ-* -> REQ-* -> AC-* -> SRS-* -> evidence`, requirement cards, NFR measurement, failure modes.
- `implement-feature`: consume `REQ-*` and `AC-*`; route back when requirements, owners, or proof lanes are missing.

## Guardrail Rule

- `implement-feature`: failing test first, no pre-test implementation kept as reference.
- `dev-fix`: root cause explicit before code proposal.
- `verify-work`: no PASS from stale runs; evidence must be fresh.
- `code-review`: keep it lean and PR-first; use it for focused merge decisions on a concrete diff.
- `review-ticket`: use it when AC coverage, architecture, PR metadata, or specialist fanout matters beyond the raw diff.
- `codebase-review`: record source provenance, review context including prompt-injection posture, runtime contract, optional runtime attestation, policy-enforcement coverage, and evidence coverage before broad scoring.
- `skill-benchmark`: include pressure scenarios, rationalizations, red flags, and behavior assertions for guardrail skills.

## Trust Policy

For PR, ticket, and patch security review, classify context with `<SKILLS>/common/common-security-audit/references/trust-review-policy.md` before ingesting external text or publishing findings.

## Review Strengths to Emulate

- NVIDIA OpenShell: explicit runtime contract, least-privilege tooling, default-deny egress, and reviewable logs.
- Anthropic Claude Code Security Review: diff-aware review, high-confidence filtering, and explicit false-positive suppression.
- SecurityReview.ai: system-first threat modeling from existing docs, role-aware outputs, and a continuous security artifact across SDLC stages.

## External MCPs

Jira, GitHub, GitLab, Azure DevOps, Zephyr, and similar MCPs are optional integration points. When installed and authenticated, use MCPs before exported artifacts to fetch tickets, PRs/MRs, update traceability, or publish test evidence; otherwise keep the same workflow running from local specs, task files, and walkthrough evidence.

## Implicit Workflow Continuity (The "Slug" protocol)

When running workflows in sequence (e.g., `brainstorm` -> `plan` -> `implement`):

1. **The Slug**: Workflows use a consistent `[slug]` in the filename (e.g., `brd-payment.md`, `prd-payment.md`).
2. **Context Resolution**: In follow-ups without an explicit feature name, the agent resolves context using the current task's established slug and its linked authoritative record. If the link is missing or ambiguous, the agent identifies the owned missing input or asks which matching record is authoritative; it never infers authority or approval from timestamps, `git status`, or the newest artifact.
3. **Multi-Record Handling**: If multiple candidate task records exist and the intent is ambiguous, the agent asks which matching record or brief is authoritative rather than selecting automatically by file recency.

## Role Quick Reference

| Role     | Recommended Surfaces                                             |
| -------- | ---------------------------------------------------------------- |
| EM       | `sdlc`                                                           |
| PM/BA    | `brainstorm-feature`, `plan-feature`, `implementation-readiness` |
| Engineer | `dev-fix`, `implement-feature`, `review-ticket`, `verify-work`   |
| QA       | `zephyr-coverage-analysis`, `verify-bug`                         |

## Specialist Quick Reference

| Need                                | Specialist                              |
| ----------------------------------- | --------------------------------------- |
| Jira Ticket summary and ACs         | `specialist-jira-analyst`               |
| Code structure and blast radius     | `specialist-codebase-scout`             |
| Architecture boundaries             | `specialist-architecture-guard`         |
| Security review                     | `specialist-security-reviewer`          |
| Test gaps                           | `specialist-test-gap-finder`            |
| AC coverage                         | `specialist-ac-verifier`                |
| GitHub/GitLab/ADO PR or MR metadata | `specialist-pr-reviewer`                |
| Zephyr TC discovery                 | `specialist-zephyr-scanner`             |
| Confluence context                  | `specialist-confluence-searcher`        |
| Approved PR comment posting         | `specialist-pr-commenter-batch`         |
| Integration test generation         | `specialist-integration-test-generator` |
| Selector gap closure (test ids)     | `specialist-testid-inserter`            |
| Failing E2E classification and heal | `specialist-test-healer`                |
| TC creation                         | `specialist-tc-creator`                 |
