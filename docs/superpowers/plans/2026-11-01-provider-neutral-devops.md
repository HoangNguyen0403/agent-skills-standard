# Provider-neutral DevOps Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Execution mode requires separate user approval; this document does not authorize implementation.

**Goal:** Extend the existing `deploy-release` workflow into one capability-aware, MCP-required DevOps entrypoint without duplicating or weakening existing release, incident, monitoring, or verification contracts.

**Architecture:** Preserve `deploy-release` as a mode dispatcher, not a shared authority lane; default `operation=deploy` only when omitted. Actual action effects determine release gates regardless of label. A keyword-only `common-devops-operations` skill owns shared procedures and provider references. Existing incident and statistical-monitoring workflows retain policy ownership without competing execution procedures.

**Tech Stack:** Canonical Markdown skills/workflows, existing JSON behavioral eval format and scorer, TypeScript/Node existing integration tests, pnpm 10.0.0, existing isolated generator and MCP discovery.

**Spec:** `docs/superpowers/specs/2026-11-01-provider-neutral-devops-design.md`.

## Global Constraints

- Planning branch/worktree is separate from website PR #280; do not modify `website/**` or that PR branch.
- No new `devops-operate` workflow, alias, provider-specific workflows, category, MCP server, scheduler, cloud service, or permission engine.
- Preserve existing workflow IDs and callers; no canonical workflow deletion is justified by the audit.
- All six operations: `setup|deploy|verify|monitor|diagnose|recover`; omitted operation defaults to `deploy`; unknown/conflicting modes are rejected. Release-bearing effects always enter full deploy gates.
- Correct installed MCP is required for live provider operations; no automatic install, silent CLI fallback, or ambient credential discovery.
- Organization/account/project/environment identity, provider permission, human approval, and host enforcement are distinct gates.
- No agent self-approval, privilege expansion, security-policy weakening, inferred deployment permission from merge, or alert-driven unapproved rollback.
- Canonical workflow line budget stays at 80; core skill stays below 100 lines and 8 KB. Put depth in references.
- Do not hand-edit generated indices, mirrors, or `.skills-lock.json`. Read `sdd-evidence-preservation` and generator safety skills before generation.
- Preserve mobile release Contract C6, measurement gates where applicable, UAT/release-authority separation, and mitigation-first incident behavior.
- Shared Outcome Report schema remains unchanged. Separate operation disposition from feature lifecycle; preserve prior evidenced lifecycle on non-deploy work and emit operations-only evidence when lifecycle is unknown. Never invent or advance a state to satisfy the schema.
- No claims of installed hooks, enforced RBAC, continuous monitoring, real provider coverage, or live qualification without actual evidence.
- Worker owns only assigned paths and does not recursively delegate or commit. Orchestrator owns final integration checks and commits.

## Audit baseline and cleanup scope

All 38 canonical workflow descriptions were inspected; operations-adjacent bodies and callers were compared. There is no equivalent general DevOps workflow. The following are related but not duplicates:

| Source | Retained responsibility | Cleanup / migration |
| --- | --- | --- |
| `.agents/workflows/deploy-release.md` | Release authority and promotion | Extend in place; shared cloud preflight/procedures live in the core skill |
| `.agents/workflows/monitor-respond.md` | Statistical classification and security-scan deltas | Reference shared investigation procedures; preserve bands/tier contract |
| `.agents/workflows/incident-hotfix.md` | Active-harm mitigation and stable-to-dev-fix handoff | Reference shared approved recovery procedure; eliminate any competing permission assumptions |
| `.agents/workflows/verify-work.md` | Independent technical AC verification | Reuse; do not create a second universal verification workflow |
| `.agents/workflows/cyber-triage.md` | Security forensics and authorized containment | Keep unchanged unless a precise broken link is demonstrated |
| `.agents/workflows/uat-signoff.md`, `publish-notes.md` | Business authority and communications | Keep unchanged; existing release callers remain valid |
| Generated host workflow exports | Native distribution | Regenerate selected outputs; remove only demonstrably orphaned generator-owned outputs using supported ownership-safe generation |

No delete-for-count targets. Do not conflate optional unselected workflows with missing/duplicate mirrors. No blanket prune, manual lock surgery, new forwarding aliases, or unrelated workflow cleanup.

Known inbound callers of `deploy-release`: `.agents/workflows/uat-signoff.md:26,31,63,66`, `traceability-audit.md:60`, `verify-bug.md:92,95`, `incident-hotfix.md:13`, `publish-notes.md:30`, `sdlc.md:39,49`; `scripts/workflow-chain.ts:24`; `scripts/audit-sdlc.ts:269,319`. Preserve them through the default-deploy contract. Re-read line ranges at execution revision; do not trust stale line numbers.

## Task 1: Core operations contract and shared references

**Owner / scope:** One bounded implementation worker. No workflow, provider-reference, metadata, generated-output, or test-runner edits.

**Files (new):**
- `skills/common/common-devops-operations/SKILL.md`
- `skills/common/common-devops-operations/references/authorization.md`
- `skills/common/common-devops-operations/references/mcp-preflight.md`
- `skills/common/common-devops-operations/references/orchestration.md`
- `skills/common/common-devops-operations/references/operations.md`
- `skills/common/common-devops-operations/references/evidence.md`

**Inputs:** Spec safety clauses, six operations, existing `common-agent-guardrails`, existing Outcome Report schema, lifecycle role guidance. Read applicable skills with MCP before editing.

**Outputs / interfaces:**
- Canonical skill ID `common-devops-operations`; keyword-only triggers `devops operations`, `cloud deployment`, `hosting verification`, `deployment diagnosis`, `cloud monitoring`, `deployment recovery`; no broad file triggers or generic `MCP` keyword.
- Authorization reference owns identity/permission/approval/enforcement distinctions and denial handling.
- MCP preflight owns missing/disconnected/authentication/capability outcomes; provider references supply exact integration details.
- Orchestration owns bounded read delegation, one mutation owner, independent verification, no recursion, and caller-return semantics.
- Evidence reference owns one report shape: `run_id`, `operation`, `target`, `principal_ref`, `capabilities`, `authority_refs`, `actions`, `deployment_or_resource_ref`, `checks`, `gaps`, `outcome`, `feature_lifecycle`, `next_action`. Secret values are forbidden. These are instruction-level fields, not an executable authorization DTO. Apply the spec's reporting matrix: non-deploy preserves evidenced lifecycle; unknown lifecycle emits operations report only; no handoff uses `recommended_next_workflow: null` on any applicable feature record.

**Steps:**
- [ ] Read the spec, existing guardrails and release/incident contracts; produce a requirement-to-section checklist in the task receipt.
- [ ] Write compact frontmatter and a shared sequence: discover MCP -> verify identity/scope -> identify organizational policy and capabilities -> propose/authorize -> execute bounded operation -> independently verify -> reconcile/report.
- [ ] Write effect-based eligibility: release/promotion or traffic switch introducing a new release enters full deploy gates even under `setup`/`recover`; reject mode typos/conflicts and read-only modes attempting writes. Recovery is fixed incident/runbook mitigation against an identified artifact/configuration/resource state, not a fresh unverified build.
- [ ] Write fresh pre-dispatch checks; bind approval to principal, target, action set, artifact/configuration identity and expiry. Mode/action/artifact changes invalidate affected grants. Initial identity queries need bounded read authority. Include a concrete host enforcement evidence checklist: effective scope, named approver/expiry, principal continuity, enforced scope boundary, applicable revocation/cancellation handling, and audit destination.
- [ ] Implement the spec's reporting matrix in guidance: no lifecycle advance/downgrade from monitoring/diagnosis; preserve previously evidenced `released`; imported service with unknown lifecycle gets operations report only. If a mandatory consumer cannot accept that, block the record-producing lane and request separate schema-change approval. Include diagnostic side effects, log injection/data handling, uncertain-write reconciliation, first-deploy recovery, and missing-MCP guidance.
- [ ] Write specialist briefs as references, not exported agent configurations. A host lacking independent verification cannot claim that gate passed; return the exact gap. Do not fabricate credential isolation from persona names.
- [ ] Freeze these paths and hand their exact bytes/section anchors to Tasks 2-4. Include changed files, mapped ACs, unresolved conflicts, and claimed/unclaimed runtime properties. No mid-flight full suite, generator, formatter, or cloud invocation.

**Positive invariants:** Scoped authorized operations may proceed; unavailable irrelevant providers do not block independent analysis. **Negative invariants:** No implicit credentials/installation/approval, no self-approval, no secret-bearing receipts, no timeout-as-failure retry.

**Real ingress / verification owner:** Parent loads skill via actual AGS keyword/file discovery in Task 5; independent reviewer checks authority logic and Task 4 evaluates decisions. **Correction route:** One concrete AC correction to owner, then eligible escalation per active routing policy. No handoff while ownership is ambiguous.

## Task 2: Provider capability and setup references

**Owner / scope:** One worker, independent of Task 1 after the report vocabulary/interface is fixed above. Own only the four provider files and provider extension file.

**Files (new):**
- `skills/common/common-devops-operations/references/providers/aws.md`
- `skills/common/common-devops-operations/references/providers/gcp.md`
- `skills/common/common-devops-operations/references/providers/cloudflare.md`
- `skills/common/common-devops-operations/references/providers/vercel.md`
- `skills/common/common-devops-operations/references/providers/extension-contract.md`

**Inputs:** Spec, Task 1 report vocabulary, official vendor MCP documentation. AWS/community research links in the spec are references, not approved binaries or access grants.

**Outputs / interfaces:** Each file defines official integration identity/source, supported service scope, host-specific setup links, authentication, account/project identity checks, discovered tool-to-operation mapping, least-privilege permission requirements, known gaps, verification/recovery limitations, and evidence status. Extension contract requires the same fields for a new provider without a workflow change.

**Steps:**
- [ ] Read current official provider documentation, record source URL/access date and exact version/revision when available; distinguish remote MCP from local process launch.
- [ ] Describe discovery against the actual connection schema. Do not hardcode advertised catalog coverage as installed tools or prescribe undocumented role names.
- [ ] Document remote authorization and supported local consumer-owned pins/provenance separately. Local execution needs existing isolated launcher guidance; remote MCP does not use a fictional local executable pin.
- [ ] Specify actionable missing-tool/MCP responses and least-privilege requests; never prescribe broad Owner/Admin roles solely because a quickstart does.
- [ ] Document provider-specific outward checks, deployment identity and rollback constraints. Static Cloudflare assets have different telemetry from container workloads; do not promise universal runtime logs.
- [ ] Hand off frozen files with a source/capability matrix. Mark `documentation reviewed` separately from `connected`, `authorized`, and `live verified`; no cloud credentials or installation needed for this documentation task.

**Positive invariants:** New providers fit the same contract; tools actually discovered govern execution. **Negative invariants:** No generic GCP-connected-means-all-services claim, no CLI fallback or credential switching, no copying insecure upstream commands.

**Real ingress / verification owner:** Parent reviews reference resolution through the actual skill package and Task 4 checks provider scenarios. **Correction route:** Return unsupported mappings to owner; no silently reduced provider scope.

## Task 3: Extend existing workflow and deduplicate procedure ownership

**Owner / scope:** One worker after Task 1 contract freeze. Own only affected canonical workflows and operations routing documentation; no provider files, metadata, generators or Outcome Report schema changes.

**Files (modify):**
- `.agents/workflows/deploy-release.md`
- `.agents/workflows/monitor-respond.md`
- `.agents/workflows/incident-hotfix.md`
- `.agents/workflows/sdlc.md`
- `docs/sdlc-workflow-quick-reference.md`

**Interfaces:** Consume core skill ID and references. Preserve workflow IDs, default `operation=deploy`, existing `CORE_SDLC_CHAIN`, and outcome schema. All cloud mutations use the core preflight/authorization procedure. No new workflow/default-list constant required.

**Steps:**
- [ ] Record old release obligations in a before/after checklist: technical and acceptance refs, named production authorizer, mobile C6, measurement exceptions, staging, rehearsal, promotion, rollback, and release reporting.
- [ ] Add strict operation parsing/default guidance and load the shared skill for cloud operations. Gate by actual effect, never solely `operation=deploy`. A setup DNS switch introducing a new build enters deploy readiness; recover cannot introduce an unverified build. Preserve mobile Contract C6 and classify mixed mobile/backend action sets individually.
- [ ] Apply the frozen spec reporting matrix and existing `scripts/outcome/schema.ts` legal lifecycle values: preserve prior evidenced state on non-deploy work, never advance/downgrade it from operation results; unknown lifecycle emits only operations evidence. No publication handoff without release evidence; null handoff when appropriate. A monitor receipt cannot become a rollback/deployment record.
- [ ] Update `sdlc.md` tie-break explicitly: fresh task-linked active harm takes incident policy ownership before ordinary mode execution, including an explicit diagnose/recover request. Security-forensic and containment work retains existing cyber authority/custody. Statistical bands and scan diffs retain `monitor-respond`. Existing incident-owned execution grants are procedure calls returning once, not fresh intake.
- [ ] Replace `incident-hotfix.md` Runtime Contract's “Return BLOCKED only when no mitigation path exists” with explicit mutation blocks for missing identity, authority, required MCP, expiry/revocation, and unenforceable scope. Continue safe scoped analysis/escalation; do not invent emergency exceptions.
- [ ] Replace `deploy-release.md`'s unconditional “dev deploys freely” for cloud operations with the scoped authorization contract, and its unconditional released/publication output with effect/reporting-aware behavior. This is removal of contradictory operative rules, not adding links above unchanged bypass language.
- [ ] Consolidate shared preflight/recovery procedure ownership; incident owns mitigation choice/authority, the shared procedure executes the fixed grant and returns once. Ordinary release discovering active harm hands off and stops promotion. No baseline requirement for a discrete failed build; statistical workflow keeps its own baseline contract.
- [ ] Update quick reference and produce the final keep/merge/delete/caller matrix: zero workflow IDs removed; procedure changes linked to new owner; no aliases or manual mirror removal.
- [ ] Freeze paths and provide evidence that every before/after release obligation and caller remains covered. No generator or full suite mid-flight.

**Positive invariants:** Omitted-mode callers retain full release gates; authorized monitoring preserves known lifecycle without manufacturing release readiness. **Negative invariants:** No setup/recover release bypass, unknown-mode fallback, read-only mutation, incident authority bypass/recursion, invented lifecycle state, or competing workflow.

**Real ingress / verification owner:** Parent runs actual workflow MCP lookup, SDLC audit and covering tests in Task 5. Independent reviewer verifies semantic preservation, not only file counts. **Correction route:** Failed preservation or authority AC returns to this owner before integration.

## Task 4: Behavioral evaluations and discriminators

**Owner / scope:** Independent evaluation author; begins against frozen contracts from Tasks 1-3. Own only new eval file. No production guidance changes to make weak assertions pass.

**File (new):** `skills/common/common-devops-operations/evals/evals.json`.

**Read:** `skills/common/common-skill-creator/references/testing.md`, `docs/EVALS.md`, `scripts/evals/types.ts`, `scripts/evals/scorer.ts`, `skills/system-design/system-design-resilience-ops/evals/evals.json`.

**Steps:**
- [ ] Use actual schema fields `skill_name`, `evals`, `should_trigger`, `should_not_trigger`, `pressure_scenarios`. Only supported assertion types: `contains`, `contains_any`, `not_contains`, `regex`, `file_reference`.
- [ ] Author controlled decision/action output rows so each case asserts both disposition and concrete permitted/forbidden action; two independent grounded assertions minimum, not keyword mentions accepted as correct behavior.
- [ ] Cover: correct authorized deploy; missing/disconnected/unauthenticated MCP; wrong organization/project; advertised but absent tool; permission denial; admin credential without approval; expired/revoked grant; changed target/action/artifact; malicious log instruction; side-effecting diagnostic; uncertain write; first-deploy recovery; authorized recovery; wrong origin/revision; monitor preserving a previously released lifecycle; unknown lifecycle operations-only record; blocked diagnosis preserving lifecycle; statistical vs discrete signal; mobile/mixed-release preservation; unsupported provider; no substitute identity.
- [ ] Add explicit bypass discriminators: setup DNS traffic switch to a new build must enter deploy readiness; recover with fresh unverified build must not use mitigation authorization; typo/conflicting mode must not default; read-only mode must not write; rollback target with expired approval blocks; active harm plus explicit diagnosis takes incident ownership; fixed incident recovery returns once; compromised-service containment retains cyber custody/approval.
- [ ] Add pressure cases for urgency, 'MCP already installed means permission', 'use my shell credentials', 'just make it public', 'approve your own recovery', and 'report healthy without metrics'. Include positive triggers for all four providers and negative triggers for architecture-only review, language refactor, mobile distribution with no cloud operation, and statistical-band-only triage.
- [ ] Supply adversarial candidate answers: mention all safety words but execute wrong-account write, label a missing-MCP action successful, and safe-sounding blanket denial of an authorized operation. Require the real scorer to reject unsafe candidates and reject overblocking where the expected action is allowed.
- [ ] Handoff frozen evals and fixture candidate transcripts, with expected scorer outcomes and no claim of live model evaluation. Parent runs scorer/preflight once integrated. Live paid evaluation requires separate authorized provider/usage scope.

**Real ingress / verification owner:** Existing real scorer and quality preflight, not a new source-text test. **Positive invariant:** Approved operation recognized, not blanket refusal. **Negative invariant:** Merely saying 'least privilege' cannot pass a wrong-action row. **Correction route:** Oracle ambiguity returns to orchestrator; never weaken expected behavior to match an implementer.

## Task 5: Registry, generated distribution, integration smoke and review

**Owner / scope:** Integration owner after all frozen deliverables. Own metadata/docs and generator-owned outputs only. Independently review semantics before publication.

**Files (modify):** `skills/metadata.json`, `docs/mcp-integration-guide.md`, `CHANGELOG.md`, `ARCHITECTURE.md`, `CONTRIBUTING.md` where new workflow usage/ownership requires accurate updates; generated outputs only through normal pipeline.

**Existing regression targets (run, not automatically edit):**
- `scripts/audit-sdlc.product-evidence.test.ts`
- `scripts/outcome/schema.test.ts`, `scripts/outcome/template.test.ts`
- `scripts/generation/isolated-stage.test.ts`
- `cli/src/services/__tests__/WorkflowSyncService.spec.ts`
- `cli/src/services/utils/__tests__/SpecialistTransformer.spec.ts`
- `mcp/test/WorkflowIndex.spec.ts`

No native specialist is added in this plan, so specialist-transformer production changes are not expected. Existing platform exporters must remain unchanged unless a demonstrated consumer-visible bug blocks this contract; return scope change for approval instead of building a second convention.

**Steps:**
- [ ] Load generator/evidence preservation skills. Record source revision, owned output manifest, SDD evidence locations and preexisting unrelated changes. Do not adopt/reseed ownership merely to suppress a refusal.
- [ ] Bump affected common category and workflow metadata versions under current repository versioning policy; update dates and concise Unreleased notes. Do not guess future release versions. Add optional integration row and setup-location references; state no credential/driver installation or runtime enforcement is shipped.
- [ ] Review token/line limits and routing collisions. Use the canonical router match smoke through real MCP discovery, not permanent source-text assertions.
- [ ] Install only at the verification worktree's root using configured pnpm 10.0.0 and locked dependencies when prerequisites permit. No installation or tests are needed for the preceding planning-only task.
- [ ] Run generation once after all canonical edits using `rtk pnpm generate-indices`; run `rtk pnpm calculate-tokens`; preserve evidence and allowlisted outputs. A provenance refusal is a blocker to diagnose, not permission to overwrite user's mirrors.
- [ ] Run covering checks once after integration, recording command, exit status, relevant output, exact source revision, and residual failures:

```sh
rtk pnpm audit:sdlc
rtk pnpm test:sdlc
rtk pnpm test:outcome
rtk pnpm test:evals
rtk pnpm --filter ./cli validate:all
rtk pnpm audit:skills
rtk pnpm audit:keywords
rtk pnpm check-alignment
rtk pnpm freshness:audit
rtk pnpm audit:injection
rtk pnpm docs:capabilities:check
rtk pnpm evals:audit
rtk pnpm generate-indices --check
rtk pnpm --filter ./mcp test
```

- [ ] Create a task-owned temporary selection file containing exactly `common/common-devops-operations`; run `rtk pnpm evals:preflight --skills-file` with that actual absolute path. Calibrate controlled candidates through exported `checkAssertion(assertion, transcript, semanticsVersion)` from `scripts/evals/scorer.ts`, using the applicable semantics and every case's assertions. Retain expected and actual candidate verdicts, including unsafe keyword-saturated answers and safe authorized actions. This is scorer discrimination, not live model evidence.
- [ ] Package lane: in a throwaway installed consumer, request `list_workflows`, `get_workflow(name="deploy-release")`, route the DevOps keyword, and resolve shared/provider references through real loading. Record delivery and resolution only: AGS MCP returns Markdown and cannot execute a mode.
- [ ] Behavioral lane: obtain separate authorization for a bounded actual-agent exercise. Supply the changed workflow, core skill, and required references; use an isolated host, no production credentials, and a tool-call recorder exposing explicit synthetic read/write boundaries. Observe permitted/refused calls and handoffs for omitted-mode deploy, explicit monitor, missing MCP, wrong target, revoked grant, and incident-owned recovery; include setup/recover label bypass attempts. Retain input/context identities, tool trace, outputs, and coverage limits. Without authorization or a recorder, mark this lane NOT RUN and do not declare behavioral qualification.
- [ ] Provider lane: request separate sandbox/account approval for each claimed provider operation. Prove principal/scope binding and outward results with scoped credentials; synthetic tool traces do not qualify live IAM/deployment. Without approval, mark provider qualification NOT RUN and claim only the independently completed package/scorer lanes. Full operational qualification is not complete while required behavioral/live evidence is absent.
- [ ] Obtain independent semantic/security review on the complete changed set, check all acceptance criteria, then commit integration. Commit only this improvement, never #280 changes. No deployment or PR merge is authorized by this plan.

**Acceptance:** No competing workflow; effect-based gates and default release compatibility; strict mode handling; correct missing-MCP response; authorization and incident/security boundaries explicit; truthful lifecycle/reporting matrix; one procedure owner; real scorer rejects unsafe controlled candidates; package/reference smoke passes. Report behavioral and provider qualification independently as PASS/FAIL/NOT RUN with evidence; package/scorer success alone is not behavioral or operational completion.

## Scheduling and shared contracts

Tasks 1 and 2 can run concurrently using the interfaces in this plan. Task 3 depends on Task 1's frozen contract. Task 4 begins once the relevant contracts are frozen; it is not owned by the guidance implementer. Task 5 follows all deliverables. Parallel workers must not run generators or shared full suites. The orchestrator integrates and owns final covering verification.

## Approved premium review and correction disposition

The user approved one consultation with `Personal · Premium Advisor`, `openai-codex/gpt-6-astra`, medium, analysis-only, limited to this design/plan and directly relevant source contracts, up to 15 minutes, no follow-up calls or mutations. Advisor ID: `1428b892-94c6-425a-846b-72501e27c4a9`.

Reviewed initial SHA-256: spec `b3d6780905f910f1867b30f0e39adc5a9d2e3ab55ca97645b8e061d0c9469b22`; plan `e54de8f858fb1310ecf82339bfd294bfa52abf5f747f59a49df1a33f48fad91f`.

Verdict: NEEDS REVISION; retain the existing workflow ID but make it an effect-based dispatcher. No second premium consultation has occurred or is authorized.

| Finding | Correction in this revision |
| --- | --- |
| Release gates bypassed through setup/recover labels | Spec safety/operation effects; Task 1 effect classification; Task 3 strict dispatch; Task 4 bypass cases |
| Emergency authority and routing contradictions | Explicit incident BLOCKED-rule replacement, fresh active-harm precedence, security custody, fixed-grant return; Task 3 |
| Non-release lifecycle semantics undecided | Spec reporting matrix; Tasks 1/3/4 preserve evidenced state or operations-only unknown state; no schema expansion |
| Discovery smoke incorrectly treated as agent behavior | Spec qualification lanes; Task 5 separates package, scorer, actual-agent recorder, and live-provider evidence |

Additional parent verification corrected existing test paths to their real `__tests__` locations and identified `mcp/test/WorkflowIndex.spec.ts`. A baseline `rtk pnpm audit:sdlc` passed in the original checkout; this is not a behavioral result or proof of the future implementation. The corrected documents have not been re-reviewed by premium. Independent non-premium correction verification may check closure without invoking premium again.

The consequential question reviewed was whether extending the release entrypoint preserves authority/incident/lifecycle boundaries. The advisor recommended in-place effect-based dispatch rather than a rename or second workflow. Implementation still requires user approval and an explicit execution-mode choice.

## Plan validation and limits

Plan self-review checks: each spec requirement has a task; all changed source paths are named as existing or new; no canonical workflow removal or generated-copy deletion assumed; no code runtime or schema introduced accidentally; no unapproved live-provider qualification claimed. Verification commands are future execution instructions, not receipts. Plan artifacts must receive a separate read-only review; implementation starts only after the review disposition and user approval of execution mode.
