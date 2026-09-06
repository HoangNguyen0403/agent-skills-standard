# SDLC Workflow Quick Reference

Agent Skills Standard syncs workflows into each agent's native surface. Run `ags sync`, then invoke the synced workflow from Claude, Codex, Cursor, Gemini, Copilot, Kiro, or another configured runtime.

| Requirement Layer      | Core Question                                   | Workflow                   | Use When                                             | Primary Output           |
| ---------------------- | ----------------------------------------------- | -------------------------- | ---------------------------------------------------- | ------------------------ |
| Route                  | Which workflow now?                             | `sdlc`                     | Unsure what to run next                              | next workflow            |
| BRD-lite               | Why are we doing this?                          | `brainstorm-feature`       | Idea is vague or business case unclear               | `docs/brd/brd-[slug].md` |
| PRD                    | What are we building?                           | `plan-feature`             | Feature needs scope, requirements, and AC IDs        | `docs/prd/prd-[slug].md` |
| Architecture           | How big and what shape?                         | `system-design-session`            | Scale, topology, or store choice is unsettled        | `docs/design/system-design-[slug].md` |
| SRS/FRS                | How will it work technically?                   | `design-solution`          | Contracts, behavior, or architecture are unclear     | `docs/srs/srs-[slug].md` |
| Readiness              | Are we ready to build?                          | `implementation-readiness` | BRD/PRD/SRS or test plan needs go/no-go              | readiness verdict        |
| Build                  | Can we implement safely?                        | `implement-feature`        | Approved feature needs code                          | `task.md` and handoff    |
| Test Loop              | Do we have executable, traced test coverage?    | `test-loop`                | ACs have E2E/mobile lanes without executable coverage | test suite + verdicts   |
| Verify                 | Did we prove it with fresh evidence?            | `verify-work`              | Work is code-complete but unproven                   | `walkthrough.md`         |
| UAT Signoff            | Does the business accept it?                    | `uat-signoff`               | `verify-work` PASS needs business acceptance before release | signoff decision  |
| Trace                  | Is every requirement covered?                   | `traceability-audit`       | Pre-release or handoff needs evidence mapping        | traceability report      |
| Release                | Is deployment safe?                             | `deploy-release`           | Verification passed and deployment is planned        | deployment report        |
| Incident               | How do we stop harm right now?                  | `incident-hotfix`          | Production incident or urgent regression needs mitigate-first response | mitigation + handoff |
| Publish                | What do users need to know?                     | `publish-notes`            | Need release communication                           | release notes            |
| Learn                  | How do we prevent repeat issues?                | `retro-learn`              | Need standards/process feedback loop                 | retro report             |
| Session                | What happened in this delivery?                 | `session-report`           | Need concise run summary and follow-ups              | session report           |
| Fix                    | How do we remediate a bug?                      | `dev-fix`                  | Bug ticket needs remediation                         | fix plan and evidence    |
| Review                 | What risks are in this change?                  | `review-ticket`            | Ticket or complex change needs specialist fanout     | review verdict           |
| Review (Design)        | Is this provided design sound?                  | `review-system-design`     | A diagram, doc, or IaC repo arrives for review       | scorecard + findings     |
| Review (PR)            | Is this PR safe to merge?                       | `code-review`              | PR diff needs focused merge-risk review              | review findings          |
| Review (Repo)          | What structural risks exist in the codebase?    | `codebase-review`          | Need broader architecture/quality scan               | prioritized findings     |
| Security               | What exploitable risk exists now?               | `security-test`            | Need SAST/SCA/secrets or branch security checks      | security report          |
| Security (Adversarial) | Can this be exploited in practice?              | `pentest`                  | Need PTES-aligned exploit validation                 | pentest report           |
| Benchmark              | Is this skill behavior improving under pressure? | `skill-benchmark`         | Need scored quality comparison vs legacy constraints | benchmark report         |
| Bug Verify             | Is the fixed bug gone in real flow?             | `verify-bug`               | Post-fix UAT validation against reproduce steps      | bug verification report  |

## Native Runtime Surfaces

| Agent               | Workflow Surface              |
| ------------------- | ----------------------------- |
| Antigravity/Kiro    | `.agents/workflows/*.md`      |
| Claude/Roo/OpenCode | command markdown              |
| Gemini              | TOML command files            |
| Copilot             | prompt files                  |
| Cursor/Trae/Codex   | skill folders with `SKILL.md` |

## Rule

Do not run daily SDLC work through `ags`. Use `ags` to initialize, sync, validate, and update standards; run the synced workflows inside your agent.

## Agentic Runtime Contract

Core SDLC workflows emit `Runtime Contract`, `Handoff Payload`, `Blocking Questions`, and `Next Workflow` sections. Interactive agents use them to ask back; channel agents use them to continue, pause as BLOCKED, or delegate named packets without guessing.

They also emit an adapter-neutral `Outcome Report`:

```yaml
feature_status: not_started | requirements_ready | design_ready | partially_implemented | implemented | blocked
requirement_trace: BRD-OBJ-* -> REQ-* -> AC-* -> SRS-* -> evidence
completed_evidence: []
missing_evidence: []
decision_needed: []
recommended_next_workflow: brainstorm-feature | plan-feature | design-solution | implementation-readiness | implement-feature | verify-work
```

Generic task boards, MCP servers, Jira, GitHub, GitLab, Azure DevOps, Zephyr, and project-specific runtimes may map this payload to their own primitives. Canonical workflows must not require runtime-specific IDs, chat channels, containers, or filesystem mount paths.

Each core SDLC workflow must call `get_session_cost(workflow="...")` before final handoff. The MCP reports observed tool/skill/workflow activity directly; exact token cost, cache discounts, reasoning tokens, and provider extras require host runtime usage data.

Security review workflows should emit `artifacts/security-review.md` when security findings or evidence are in scope.
Capture trust class, review context, runtime contract, findings, evidence gaps, and handoff notes so the same markdown report can drive developer, AppSec, and audit-facing follow-up without rewriting the conclusions.
That report should stay continuous across `design-solution` / `implementation-readiness` -> `code-review` / `review-ticket` -> `pentest` so later stages refine the same trust and evidence record instead of starting over.
When `code-review` or `review-ticket` findings are approved for publication or channel handoff, also emit `artifacts/review-delivery.md` as the sanitized delivery packet for `specialist-pr-commenter-batch` or channel-driven follow-up.
For full-repo health checks, `codebase-review` should also emit `artifacts/codebase-review.md`, using `security-review.md` only for the security slice.

## Naming Rule

When users ask for BRD, PRD, or SRS:

- BRD-lite -> run `brainstorm-feature`
- PRD -> run `plan-feature`
- SRS/FRS -> run `design-solution`

## Trust Baseline

Use `docs/requirements-standards-baseline.md` as the shared source baseline for BRD/PRD/SRS phases.

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
2. **Context Resolution**: If you don't specify the feature in your follow-up, the agent uses **Recency Bias**—it checks the most recently modified files in `docs/brd/`, `docs/prd/`, etc., or newly created files in `git status` to automatically re-anchor to your current task.
3. **Multi-Doc Handling**: If multiple candidate slugs exist and the intent is ambiguous, the agent will ask: "I see `checkout` and `payment` files were recently modified. Which one are we planning?"

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
| TC creation                         | `specialist-tc-creator`                 |
