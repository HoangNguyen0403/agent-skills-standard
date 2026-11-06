# Feature Plan: Testing Reference Improvements

Status: technically verified; owner: repository maintainer; delivery_mode: standard
slug: testing-reference-improvements
operator_profile: technical; lane: direction; snc_tier: medium; model_tier: standard
source_approval: approved(requesting operator, 2026-11-05)
plan_approval: approved(requesting operator, 2026-11-05)
execution_approach: subagent-driven
repository_status: source_verified_unpublished; activation_status: not_required

## Decision Brief

- **Changes since approved brief:** Operational decomposition and verification detail only; no additional capabilities. Preserve BRD-OBJ-001, REQ-001–004 and AC-001–005 (normalized from two-digit IDs for schema compliance; semantics and scope unchanged). This PRD is the delivery-level definition; the approved BRD remains the historical scope authority.
- **Recommendation:** Extend existing canonical QE owners with compact collection and fixture guidance plus demand-loaded examples. Preserve the single POM fixture and seed ownership model. Do not create a new generic testing skill or rewrite workflows.
- **Impact if wrong:** Extra context or incompatible fixture advice could increase flakiness instead of reducing it. Bound changes to the reviewed owners and require observable browser proof before publication.
- **Evidence:** Reuse the approved [brief and evidence ledger](../brd/brd-testing-reference-improvements.md). Primary Playwright documents establish API semantics; inspected QE sources establish existing ownership. Candidate teaching gaps remain qualified inferences; live model efficacy and CI gains remain unknown.
- **Unresolved product decisions:** No additional product input needed. QE implementation owner selects and records the local Playwright/browser version before validating examples; this is a verification prerequisite, not permission to change a consumer project.
- **Approval recorded:** Requesting operator approved the delivery plan and subagent-driven execution on 2026-11-05. Canonical guidance and scoped technical verification are complete; human acceptance, publication and release are separate and unassessed.
- **Delivery result:** Collection and fixture owners completed disjoint source slices; integrated browser/backend evidence and independent source/evidence review are linked in the walkthrough.

## Outcome And Guardrails

**Objective:** BRD-OBJ-001, as approved in the brief. Agents should receive actionable guidance against false-green collection checks and backend-data interference without duplicating existing testing methodology.

**Metric:** Carry the approved target: within 14 days of implementation approval, maintainer-reviewed local examples prove collection completeness and isolated mutations with at least two workers including replacement/reset behavior; AC-001–005 have evidence. Baseline behavior must be recorded before edits. This target is a delivery demonstration, not proof of live model improvement.

**Guardrails:** Existing seed/POM conventions; scenario-owned mutable data; auth-state secrecy; real login/session evidence; existing lower-layer and critical-journey coverage; token economy; no hard sleeps or assertion weakening to manufacture green; no invented performance or financial claims. No product auth or infrastructure changes are in scope.

## Scope And Non-Goals

### In Scope

Improve Playwright reliability:
- Explain collection readiness — in_scope, REQ-002.
- Explain worker/account and per-test data lifecycle — in_scope, REQ-003.
- Qualify setup/auth reuse — in_scope, REQ-003.
- Classify evidence without duplicate standards — in_scope, REQ-001.
- Demonstrate examples and validate changed registry artifacts — in_scope, REQ-004.

### Out Of Scope

New browser framework, test-pyramid ratios, migrating client suites, replacing all UI tests with API tests, auth/CI/backend modifications, automatic release waivers, live model evaluations and runtime deployment. Existing common-tdd, automation-health, shift-left and browser-governance rules remain authoritative.

### Deferred

Severity-versus-priority worked examples and empirical process/skill improvement experiments remain separate candidates, as recorded in the approved BRD capability inventory. No delivery or Jira commitment is created by this plan.

## Requirements And Acceptance Criteria

Priorities below are proposed defaults under the approved first-slice scope. All requirements link to BRD-OBJ-001; none is implemented by this planning artifact.

*ID normalization note:* Trace identifiers normalized from two-digit suffixes (01..05) to three-digit format (001..005) for BRD objective, requirements, and acceptance criteria for schema compliance; semantics and scope are unchanged.

| Req ID | Requirement | Owner | Priority | Status | BRD objective |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Preserve evidence provenance and classify external advice against existing canonical rules without elevating anecdotes to measurements. | Repository maintainer | P1 | Technically verified | BRD-OBJ-001 |
| REQ-002 | Explain contract-based readiness and live-locator semantics for safe collection assertions/enumeration. | QE collection-guidance owner | P1 | Technically verified | BRD-OBJ-001 |
| REQ-003 | Explain compatible parallel account/setup allocation with scenario-owned mutable data, cleanup, secret handling and honest auth proof. | QE fixture-guidance owner | P1 | Technically verified | BRD-OBJ-001 |
| REQ-004 | Supply reproducible behavioral evidence and structural validation for changed canonical guidance without claiming unmeasured model efficacy. | Independent QA verifier | P1 | Technically verified | BRD-OBJ-001 |

| AC ID | Req ID | Given | When | Then | Owner | Verification lane |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | Supplied screenshot themes and the approved evidence ledger | Maintainer reviews proposed guidance | Each theme retains an adopt/qualify/already-covered/unsupported disposition and canonical owner; anecdotal figures are not presented as measured results. | Repository maintainer | Manual evidence review |
| AC-002 | REQ-002 | A finite list is initially empty and loads incrementally under a declared completion contract | The example checks the list or enumerates it | It proves the complete expected identities/content instead of passing an empty loop; guidance distinguishes immediate all() enumeration from retrying list assertions, and rejects count alone as a stability guarantee for continuously changing lists. | QE collection-guidance owner | Local browser scenario |
| AC-003 | REQ-003 | At least two workers mutate backend data, with sequential cases, concurrent run namespaces and a failed attempt followed by worker replacement | Cases execute using documented ownership and reset rules | Each case observes only its intended state; replacement cannot inherit failed-attempt contamination or collide with another namespace; cleanup releases only owned data after evidence capture. | Independent QA verifier | Local browser/backend scenario |
| AC-004 | REQ-003 | Post-login tests reuse setup while dedicated login/session verification remains required | Maintainer inspects the fixture recipe and corresponding scenario evidence | Reuse is represented only as post-login setup, not login proof; auth artifacts remain excluded from tracked/shared outputs, API prerequisites do not replace the behavior being verified, and all examples use the established seed/POM fixture convention. | QE fixture-guidance owner | Manual boundary/evidence review |
| AC-005 | REQ-004 | Changed canonical artifacts and the executed examples for AC-002/003 | Independent verifier prepares the handoff | Evidence identifies versions, commands, expected failure/baseline and observed results; registry validation succeeds; any host export additionally has parity/consumer evidence, while unexecuted/live-model checks remain explicitly unproven. | Independent QA verifier | Integrated repository acceptance |

## Fixture And Collection Decision Rules

These constrain examples rather than adding a runtime framework:

| Condition | Required guidance |
| --- | --- |
| Only list contents/count need verification | Prefer the appropriate retrying locator assertion; do not materialize just to assert. |
| Iteration is necessary and list is finite | Establish application completion and required identities/content before enumeration; maintain stable membership/order for the operations. |
| List keeps changing or is virtualized/paginated | Use the application contract for stable identities/completion/page traversal; do not invent a universal count or delay. |
| Tests can share an account without changing each other's observable state | Shared authenticated setup is eligible; each browser context remains isolated. |
| Tests mutate server-side state | Worker-specific accounts may optimize allocation; per-test data/reset still prevents sequential contamination. |
| Worker is replaced after a failure | parallelIndex identifies the slot, not globally unique data; combine an invocation/project/shard namespace with slot/test/attempt identity as needed. |
| Login/session issuance is the contract under test | Exercise real browser login/session behavior; saved auth is not that evidence. |

The seed remains the prerequisite/navigation contract. One existing fixtures entrypoint exposes pages; worker resource allocation supports that contract rather than creating an alternate fixture import or silently treating a seed run as per-worker setup. Setup/reset APIs must operate only on isolated synthetic resources. Capture diagnostic artifacts before destructive reset; prevent credentials from entering retained artifacts. Any change to product authentication, security middleware or infrastructure is outside scope and requires re-scoring/design approval.

## Implementation Plan And Task Slices

The following records the approved execution assignments. Completed results and criterion-level proof are in the walkthrough; file paths identify existing owners, not a mandate to edit every file.

| Slice | Owner and component boundary | References | Expected artifact | Dependencies | Estimate / confidence | Slice routing |
| --- | --- | --- | --- | --- | --- | --- |
| A: Explain collection readiness | One worker owns quality-engineering-selector-stability and its references; may link POM locator guidance through integration owner only | REQ-001/002; AC-001/002 | Compact collection rule and demand-loaded example with primary sources | Execution approval | S / high | S=1 N=1 C=0, low, fast-capability eligible configuration |
| B: Explain parallel fixture lifecycle | One worker owns quality-engineering-playwright-pom-generation references/fixture-wiring.md and necessary skill links, plus quality-engineering-test-plan-authoring Data & Reset references | REQ-001/003; AC-001/003/004 | Compatible worker/test ownership recipe, reset/cleanup and auth proof boundaries | Execution approval; independent of A | M / medium | S=1 N=1 C=1, medium, standard capability |
| C: Integrate and verify | Integration owner owns cross-links and the existing project changelog/documentation convention; independent QA owns review/evidence, not A/B implementation | REQ-004; AC-005, reviewing A/B evidence by ID | Coherent registry guidance and versioned local scenario receipts | A and B | M / medium | S=1 N=1 C=1, medium, independent standard review |

A/B must not concurrently edit the same SKILL.md. Any cross-owner link is queued for the integration owner. Workers load their applicable skills, reuse the approved evidence, and cannot introduce a second test/fixture convention. Select actual eligible host profiles at dispatch; capability hints are not permission to substitute providers or use premium models.

### Verification Execution Shape

For AC-002, use a disposable local browser page with asynchronously populated, known list identities and an explicit completion signal. Record immediate enumeration's incomplete/empty result as the baseline, then execute the corrected contract. Include a same-count membership-change case to distinguish count from identity stability. Do not use source-string tests.

For AC-003, use an isolated local stateful test service, not a real client environment. Run at least two workers against synthetic namespaced records. Exercise both sequential tests within one worker and separate concurrent invocation namespaces. Force one bounded, intentional failed attempt to observe replacement and reset; distinguish that expected diagnostic failure from final unexpected failures. Assert returned/visible owned record contents, not allocation-call echoes. Avoid flaky timing by controlling service transitions.

Record Playwright/browser/Node versions and exact focused single-run commands in scenario receipts. No repository browser dependency has been confirmed by this plan. Readiness must locate an existing authorized runner or provision an authorized disposable pinned environment; missing browser/tooling is infrastructure failure, not behavioral RED. Do not change dependencies or download tools on the strength of this planning document alone.

Existing candidate command `rtk pnpm validate` checks registry structure after edits. Offline eval machinery tests are relevant only if that machinery changes; do not run broad suites or paid model evals as a substitute for the browser scenarios. If canonical artifacts are exported, verify canonical/host resource parity and actual consumer discovery using existing mechanisms. Do not manually edit generated hosts as a second source.

Scenarios may be throwaway where they validate guidance rather than shipped code; retain reproducible commands, versions and useful evidence, remove disposable scaffolds. Permanent tests require a distinct consumer-visible regression risk, not merely matching documentation wording.

## Ownership, Risks And Release Boundaries

| Role | Accountability |
| --- | --- |
| Requesting operator | Accountable for scope/plan approval and separate execution choice |
| Repository maintainer as PM/BA | Maintains canonical requirements, approved metric and scope fence |
| Assigned A/B engineers | Responsible for their bounded guidance and runnable examples |
| Independent QA maintainer | Accountable for validation, evidence boundaries and independent review |
| Registry maintainer | Accountable for any separately authorized publication/consumer checks |

Primary risks and mitigations carry forward from the BRD: false stability from counts (A owner), cross-test/run contamination (B owner), authentication proof inflation (B owner plus QA), duplicate instructions/token growth (integration owner), and unmeasured efficacy claims (PM/QA). No API, schema, production authentication or deployment change is planned.

## Open Consequential Decisions

Plan and subagent-driven execution were explicitly approved on 2026-11-05. Source implementation, local behavioral verification and independent review are complete. No consequential implementation decision remains; publication, rollout and human acceptance were not authorized or assessed.

Tool availability/version and precise example placement are implementation-readiness checks owned by the QE maintainer, not reasons to restart approved discovery. If satisfying them would require product auth/infra changes or unapproved spend, pause only the affected slice and obtain matching authority.

## Status And Receipt

feature_status: verified; plan_approval: approved(requesting operator, 2026-11-05); execution_approach: subagent-driven; implementation_started: true; implementation_completed: true; verification_status: passed_scoped_technical

Technical verification applies to canonical guidance and retained synthetic local examples only. It does not establish live-model efficacy, production authentication/security, business acceptance or release readiness.

Historical planning receipt: [plan-2026-11-05.json](../../artifacts/runs/testing-reference-improvements/plan-2026-11-05.json). Final evidence: [walkthrough](../srs/srs-walkthrough-testing-reference-improvements.md) and [verification receipt](../../artifacts/runs/testing-reference-improvements/verify-2026-11-05.json). Schema validity alone establishes neither approval nor behavioral success.

## References

- [Approved BRD](../brd/brd-testing-reference-improvements.md), approval recorded 2026-11-05; source snapshot 47C6 used for planning.
- [Fixture ownership](../../skills/quality-engineering/quality-engineering-playwright-pom-generation/references/fixture-wiring.md).
- [Existing browser proof boundaries](../../skills/common/common-web-visual-testing/SKILL.md).
- [Quality-first TDD](../../skills/common/common-tdd/SKILL.md).
- [Registry architecture](../../ARCHITECTURE.md).
- Primary source links and screenshot dispositions remain in the BRD evidence ledger; no duplicate editable product ledger is created.

Planning artifact checks passed: JSON handoff fields, timestamp ordering, four unique requirement rows, five unique AC rows, and local document links. Historical record: during initial planning, `pnpm exec tsx` reported `Command "tsx" not found` (exit 254). Following `pnpm install --frozen-lockfile`, canonical validation was executed and returned schema format errors exclusively for two-digit trace IDs. Normalized to three-digit format (001..005) for BRD objective, requirements, and acceptance criteria to satisfy canonical schema.

## Next Workflow

No further implementation workflow is required for this scoped delivery. Human acceptance or publication may be requested separately; follow-on severity/priority teaching and live efficacy experiments remain outside the approved slice.

## Cost Report

Host token usage and total cost are unavailable. Request workflow telemetry at handoff; do not infer monetary savings, model efficacy or total actor cost from MCP consultation counts.
