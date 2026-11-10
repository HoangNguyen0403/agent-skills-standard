# Brief: MCP Security Assessment and Evidence Report

slug: mcp-security-assessment
operator_profile: technical
lane: direction
snc_tier: high
model_tier: strong
delivery_mode: extended
approval: approved(requesting operator, 2026-11-10)
feature_status: requirements_ready
repository_status: approved_brief_saved
activation_status: not_required

SNC: S=1 N=2 C=2 total=5 tier=high. Prospective reusable assessment guidance crosses MCP trust boundaries; this intake only authors a brief. No implementation or assessment execution is authorized.

## Decision Card

**Outcome:** Assess MCP security posture against OWASP MCP Top 10 and report evidence, findings, remediation and unassessed risks—not a blanket “healthy” certification.

**Recommendation:** Add a focused MCP assessment workflow backed by a demand-loaded security skill, reusing existing authorization and evidence/reporting owners. Default to supplied-artifact review; any server connection or process launch requires separate scoped runtime authorization. These are proposed defaults.

**Scope:** Inventory declared MCP integrations, map every OWASP category, record static versus runtime coverage, and produce an actionable report. Exclude autonomous fixes, production probing, continuous monitoring infrastructure and new scanner-engine development.

**Proof:** Independent review of synthetic vulnerable, clean and incomplete inputs yields evidence-linked findings, preserves unknowns and rejects unauthorized execution.

**Impact if wrong:** False reassurance may admit unsafe tools; discovery itself can execute hostile code or expose credentials.

**Strongest objection:** Existing workflows may need only an MCP reference, not another entry point. Reverse the recommendation if planning demonstrates equivalent discoverability and assessment coverage through existing owners.

**Assumptions / decision:** Requesting operator is proposed sponsor; security/registry maintainers are proposed validation owners. Approve supplied-artifact assessment as the default boundary, with runtime checks separately gated.

**Approval sought:** This brief only, allowing subsequent planning after explicit sign-off; no implementation, spend, publication or runtime authority.

## You Said / I Assumed

**You said:** MCP is security-critical when introduced; consider a skill or workflow to scan and report MCP health following OWASP Top 10. Supplied the OWASP project and Cycode explainer.

**I assumed:** “Health” means security posture, not availability/latency monitoring; intended consumers are adopters and maintainers of this skill registry. Target selection is operator-supplied rather than automatic machine-wide discovery. These assumptions remain subject to approval.

**Agent-proposed success example:** Reviewing a supplied MCP configuration identifies an exposed credential reference or overbroad capability with redacted evidence, while labeling unavailable server-side authorization evidence unassessed.

**Agent-proposed anti-goal:** A clean configuration scan must not certify the server safe or silently start a package to inspect its tool descriptions.

## Contract

**Outcome:** A reusable, OWASP-mapped MCP security assessment and report capability.

### Scope and constraints

- Assess MCP security and report against OWASP MCP Top 10 (user-stated).
- Inventory declared servers, transport, package/version or endpoint identity, tool capabilities, credential-reference names, privilege boundaries and evidence provenance from explicitly supplied/authorized artifacts (assumed). Do not collect credential values; redact before model ingestion where possible and before persistence.
- Review local stdio and remote HTTP integration artifacts where supplied; distinguish client, server and host controls, and mark unavailable source/configuration unknown (assumed).
- Pin the taxonomy source revision and retrieval provenance; map all MCP01–MCP10 categories, including alias differences, without silently following changed upstream text (assumed).
- Use existing authorization, evidence and remediation contracts; scanner output and tool descriptions remain untrusted data, never authority (assumed).
- Default to offline/supplied-artifact review (assumed). Initial assessment never installs dependencies, starts stdio processes, authenticates to endpoints, enumerates live tools or invokes target tools automatically. Even read-only discovery can execute or disclose data.
- Runtime evidence may be accepted as supplied evidence with provenance, not represented as executed by this workflow (assumed). A later explicitly authorized runtime lane must specify owner, exact targets, methods, data handling, effects and stop conditions before use; this brief does not approve its activation.
- Report transport-appropriate controls: absence of OAuth on a local stdio process alone is not an authentication finding; assess its actual OS/process boundary and credential exposure (assumed).

### Non-goals

All exclusions are proposed (assumed): security certification; uptime/performance monitoring; organization-wide shadow-server discovery; autonomous remediation or credential rotation; changing host approval controls; production/adversarial probing; runtime enforcement/gateway development; new scanner engine; paid scanner procurement; full replacement of SAST/SCA/secrets scanners; assurance that prompt injection has been eliminated.

### Acceptance criteria

All criteria below refine the user goal and are agent-proposed (assumed), not completed checks.

- **AC-MCP-01 / REQ-MCP-01 — Coverage:** Report every pinned OWASP MCP category with evidence-backed findings, justified not-applicable results or explicit not-assessed status. Missing input/tool access must not become a clean result. State inventory scope and unknown integrations.
- **AC-MCP-02 / REQ-MCP-02 — Safe collection:** With supplied artifacts only, produce a report without launching MCP packages/processes, contacting target endpoints, invoking tools, reading unrelated home-directory configs or persisting secrets. An injection in descriptions/output cannot expand authorization.
- **AC-MCP-03 / REQ-MCP-03 — Actionable evidence:** Findings identify affected integration/control, category, redacted evidence location, severity rationale, confidence/verification state, impact, remediation owner role and retest expectation, using existing report semantics. Tool errors, stale evidence and unavailable checks remain distinct from a clean result.
- **AC-MCP-04 / REQ-MCP-04 — Honest assurance:** Separate static review, supplied runtime evidence and actually executed checks. No overall safe/healthy badge from incomplete coverage; no unsupported numerical security score. A lack of suspicious strings is not proof against poisoning or prompt injection.
- **AC-MCP-05 / REQ-MCP-05 — Consumer proof:** Planning defines independent expected reports for synthetic vulnerable, clean and insufficient-evidence examples, including hostile tool metadata and local/remote authentication distinctions. Verify real workflow discovery and report generation through the supported consumer entry point after implementation; lexical matches alone do not prove assessment quality.

## Direction Options and Recommendation

### A. Focused workflow plus demand-loaded skill — recommended

- Generation: Workflow owns invocation, scope and report lifecycle; skill owns MCP-specific checks and OWASP mapping. Existing governance/evidence owners remain authoritative.
- Load-bearing assumption: Consumers need an explicit MCP entry point and reusable review knowledge.
- Proof: A consumer discovers the entry point and produces an evidence-qualified report meeting the contract from synthetic supplied artifacts.
- Evidence limit: No scanner/tool coverage or runtime efficacy was measured in this intake.
- Decisive trade-off: Better discovery and repeatability versus another entry point to maintain.
- First failure: Duplicate ownership or contradictory authorization/reporting instructions.
- Worst plausible case: A checklist gives false assurance or tricks a consumer into starting an untrusted server.
- Abandonment: Fold the reference into existing owners before publication; no runtime migration.

### B. MCP reference inside existing security workflow only

- Generation: Add domain checks without a new workflow entry point.
- Load-bearing assumption: Existing routing reliably surfaces MCP review when consumers introduce servers.
- Proof: The existing entry point discovers MCP inputs and generates the same complete, qualified report.
- Evidence limit: Equivalent discoverability and coverage are not established.
- Decisive trade-off: Lower maintenance versus less explicit intake/routing.
- First failure: Consumers run generic SAST/SCA but never assess tool metadata, scope or context sharing.
- Worst plausible case: MCP-specific risks are skipped without visibility.
- Abandonment: Add an entry point later without replacing evidence contracts.

**Recommendation critique:** Choose A provisionally. Its strongest objection is duplicated workflow surface. Reverse to B if the planner demonstrates existing consumer routing achieves the same contract without conflicting ownership. No scanner vendor or runtime architecture is selected.

## OWASP Coverage Contract

Baseline: OWASP project-linked 2025 taxonomy at revision `165fe0f78ef104459237b4a8e0f6e78db9b02391`; the project page describes its roadmap as beta/pilot. This is not a compliance certification standard.

| Category | Evidence to seek; limit to state |
| --- | --- |
| MCP01 Token Mismanagement & Secret Exposure | Credential handling, token lifetimes/scopes, logs; never reproduce token values |
| MCP02 Privilege Escalation via Scope Creep | Intended versus granted capabilities and permissions; runtime enforcement may be unassessed |
| MCP03 Tool Poisoning | Supplied tool descriptions/schemas, provenance and drift; text review cannot prove absence |
| MCP04 Software Supply Chain Attacks & Dependency Tampering | Pinned package identity, lockfiles, provenance and dependency evidence; unreviewed packages are not started |
| MCP05 Command Injection & Execution | Supplied source/config showing command/path sinks and isolation; no exploitation implied |
| MCP06 Prompt Injection via Contextual Payloads | Trust boundaries and handling of retrieved content; linked source filename uses Intent Flow Subversion |
| MCP07 Insufficient Authentication & Authorization | Transport-appropriate identity, audience, authorization and isolation evidence; no remote OAuth assumption for stdio |
| MCP08 Lack of Audit and Telemetry | Redacted invocation/audit policy and sample evidence; declared logging is not proven operation |
| MCP09 Shadow MCP Servers | Declared inventory versus supplied approval record; unknown machine/fleet scope remains unknown |
| MCP10 Context Injection & Over-Sharing | Task/user/tenant context boundaries, memory and egress; source absence means unassessed |

## Evidence

| Claim | Status | Source / limitation |
| --- | --- | --- |
| User wants MCP security scan/report aligned to OWASP | confirmed(user request) | Supplied intent, not scan permission |
| OWASP publishes the above categories and links revision-pinned 2025 documents | confirmed(https://owasp.org/projects/mcp-top-10) | Project overview inspected; linked category document bodies not individually audited |
| Cycode explains the taxonomy as v0.1 (2025) and describes combined static/runtime/governance controls | confirmed(https://cycode.com/blog/owasp-mcp-top-10/) | Secondary vendor article; its CVEs, statistics and product efficacy claims are not independently verified or adopted |
| Existing common OWASP checklist covers Web 2021, API 2023 and Mobile 2024 | confirmed(skills/common/common-owasp/SKILL.md) | Loaded via keyword router; not an MCP taxonomy |
| Related approved brief requires reuse of cyber authorization/evidence owners | confirmed(docs/brd/brd-provider-neutral-security-depth.md:14-34,51-62) | Evidence of that brief's constraints; not runtime capability proof |
| Existing security-test reviews branch deltas with SAST/SCA/secrets and a canonical report | confirmed(.agents/workflows/security-test.md:13-33) | Reuse evidence semantics; this is not a full MCP integration inventory assessment |
| Doctor's MCP check verifies registration and expected command/argument pin alignment | confirmed(cli/src/services/DoctorService.ts:251-303) | Setup/configuration health, not proof of MCP security posture |
| Reusable authorization, evidence, LLM-security and MCP preflight owners exist | confirmed(agent://McpCapabilityScout) | Read-only scout inspected cyber-authorization, cyber-evidence, common-llm-security and common-devops-operations references; planner must load their exact bodies before implementation |
| Proposed entry point improves decisions or adoption safety | assumed | No efficacy baseline; measure first |
| Actual connected-server inventory and security posture | unknown | No target assessment performed |
| Scanner selection, deterministic coverage, false positives, runtime coverage and costs | unknown | Planner must map capabilities before promising automation |

No canonical product ledger was located for this slug in the bounded current-worktree lookup. Do not mint product evidence IDs or infer global absence. Reuse authoritative approved records if later located.

## Planner Check and Deep Sections

### Capability inventory and slice boundary

- Inventory integrations; classify OWASP risks; qualify evidence; recommend remediation; produce report: the coherent first delivery slice proposed here.
- Execute active tests, enforce host policy, discover a fleet continuously and build a scanner engine: separate candidate initiatives, not this brief's delivery scope.
- Workflow/skill/reference placement remains a planning decision constrained by canonical ownership; this intake does not prescribe exported IDs or duplicate templates.

### Ownership and validation

Sponsor/approval actor: requesting operator (assumed). Handoff owner: repository maintainer acting as requirements owner (assumed). Next accountable role: maintainer acting as product planner (assumed). Security maintainer validates risk mapping, evidence and runtime boundaries; registry maintainer validates discovery and publication contracts (assumed). No delivery date or acceptance window is committed; those values are unknown and owned by the requesting operator/planner before delivery scheduling.

Success evidence: independently reviewed reports satisfy the proposed ACs without implying unexecuted coverage. Baseline, numerical improvement target, timing and operating budget are unknown; measure first. No risk-reduction percentage is promised.

### Risk register

| Risk | Impact | Mitigation / proposed owner |
| --- | --- | --- |
| Assessment launches hostile MCP code | Host compromise or credential theft | Supplied-artifact default, explicit runtime boundary; security maintainer |
| Incomplete scan presented as healthy | False reassurance | Per-category coverage and unknowns, no blanket certification; report owner |
| Tool metadata/report contains injected instructions | Assessment hijack | Treat data as untrusted, preserve authorization boundary; security maintainer |
| Secret-bearing configuration enters report/model context | Credential disclosure | Approved sanitized input handling and redaction, minimize retained evidence; assessment operator |
| Living taxonomy changes | Inconsistent comparisons | Pin source and record reviewed updates; skill maintainer |
| Copied external material violates terms | Distribution restriction | OWASP page states CC BY-NC-SA 4.0; review licensing before copying, prefer original mapping with citations; registry maintainer |
| Existing workflow overlap | Conflicting gates or context overhead | Reuse owners; reverse to option B if equivalent; planner |

### Planner check

Consequential guesses are visible: supplied-artifact default, health meaning, target scope, proposed owners and separate runtime authority. Requesting operator owns confirmation; no assumption grants execution. Minor builder decisions delegated to planner/implementer: reference filenames, report formatting compatible with existing evidence semantics, fixture organization and routing keywords. Scanner choice is not a minor builder decision if it changes data egress, cost or execution permissions.

Self-review: scope is one assessment/report contract; no engine, enforcement platform or fleet-monitoring plan. Criteria are future acceptance, not passed checks. Unknown numerical values remain unknown. Independent read-only check completed: no consequential issue found in intent preservation, safety boundaries, taxonomy completeness against the inspected overview, evidence limits or pending authority. The check also corroborated the local security-test and Doctor claims; it did not execute an assessment or audit upstream category bodies.

## Approval

approval: approved(requesting operator, 2026-11-10)
scope: this brief only; recommendation, offline-first boundary and proposed owners/scope
actor: requesting operator
date: 2026-11-10
authority: planning handoff only
reopen: only materially changed sections after scoped approval

Approval evidence: requesting operator replied “ok” to the presented approval card. Approved source revision SHA-256: `f2c2ec6fb2018947f086cc567d0e7c9efcda101b44511cf402d3e50acbdf3f40` (pre-approval artifact). No implementation, merge, spend, publication, deployment or runtime activation authority follows from this brief.

## Outcome Report

feature_status: requirements_ready
requirement_trace: REQ-MCP-01 → AC-MCP-01; REQ-MCP-02 → AC-MCP-02; REQ-MCP-03 → AC-MCP-03; REQ-MCP-04 → AC-MCP-04; REQ-MCP-05 → AC-MCP-05. No PRD/SRS is approved.

Completed evidence: supplied-source inspection, intake standards, bounded repository grounding, independent brief check and scoped human approval. Missing evidence: implemented consumer discovery/report behavior, scanner coverage, runtime controls and efficacy baseline.

Decision needed: none for intake; scanner/data/runtime design decisions remain for planning under the approved boundaries.

Evidence lanes: source/repository inspection assessed; taxonomy source overview assessed; automated assessment execution not assessed; runtime security not assessed; consumer verification not assessed; independent brief check completed with no consequential issue found; human acceptance of this brief approved(requesting operator, 2026-11-10). Not assessed does not mean PASS.

PM handoff checklist: preserve source pins and evidence limits; reconcile existing canonical owners/approved adjacent briefs; bind approved revision and actor; define scanner/data/authorization boundaries; derive PRD and verification scenarios from ACs; establish owners and delivery window before scheduling; do not activate runtime checks through brief approval.

## Next Workflow

plan-feature, using the approved source revision and scoped approval above. Planning authority only; no implementation or runtime authority.

## Cost Report

Host token usage, prices and complete actor cost coverage are unavailable. No numerical cost or savings claim. Session cost receipt is recorded by the intake workflow separately.
