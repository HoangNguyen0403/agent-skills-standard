# Agent Harness Assurance Baseline — A/B Evidence Delivery

Scope: approved Subagent-Driven A/B analytical evidence only.
Status: reports delivered; independent final review pending; full baseline incomplete.
Activation: not_required. No runtime/source implementation, policy change or live C/D scenario.

## Outcome

**Reuse the current harness; do not build a duplicate control plane on this evidence.** The reports establish useful source-level mechanisms and distinct control boundaries. They do not establish active-daemon provenance, cross-route project/account/premium enforcement, real tool denial, complete lifecycle recovery or full-task ROI.

- A: [capabilities.md](capabilities.md), Task 1 / AC-HAR-01 / SRS-001. Seven PRD areas explicitly mapped; routing/isolation analysis is supplemental. Original independent-review P2 tools-coverage gap corrected by the report author with an explicit action-ingress/configuration limitation.
- B: [dispatch-boundaries.md](dispatch-boundaries.md), Task 2 / AC-HAR-02 / SRS-002. Six source-backed paths separately mapped: create, settings update, CLI, schedule, heartbeat and native OMP task.
- Authority: operator explicitly selected Subagent-Driven A/B. [Validated task plan](plan.md), [packet A](packet-a.md), [packet B](packet-b.md). Authoritative product/design definitions remain in the approved [BRD](../../../docs/brd/brd-agent-harness-improvement.md), [PRD](../../../docs/prd/prd-agent-harness-improvement.md) and [SRS](../../../docs/srs/srs-agent-harness-improvement.md).
- Evidence uses retained discovery versions (ags 2.7.4 / Paseo 0.8.0 / OMP 18.16.0) and pinned upstream OMP source. Installed source is not authenticated proof that the active daemon loads those bytes. Current private host configuration was not inspected.

## Current Situation And Reuse Decisions

| Capability / owner | Evidence-backed leverage | Boundary / disposition |
| --- | --- | --- |
| Intent and assignment — Paseo/OMP/standards | Existing creation/lifecycle IDs, task packet validation, receipts and completion notifications | Reuse. Packet validity does not authenticate authority or prove every worker received/obeyed the contract |
| Model/tool authority — runtime owners | OMP operator-owned per-call grants; runtime tool approval; standards cooperative hooks/policy checks | Reuse within demonstrated scope. Cross-route commercial-account and scoped premium authorization remains unverified, not proven absent |
| Context/memory — OMP and MCP | Native compaction/session mechanisms; request-scoped skill bodies/digests | No second memory database. Current backend/threshold/retention and cross-session efficacy remain unknown |
| Routing/isolation — Paseo and OMP | Existing profiles, workspaces/worktrees, provider readiness and native dispatch policy | No new orchestrator. Profiles guide launch settings; worktrees prevent edit collisions but do not establish account/process/network isolation |
| Recovery — runtime + task owner | Native recovery and revision-bound progress receipts | Reuse. Timeout/cancel acknowledgement does not prove execution ceased; no actual stop/recovery proof was collected |
| Economics — runtime + independent verifier | Existing explicit-manifest SessionJournal and separate eval usage contracts | No new telemetry/rate service. Actor/attempt correlation and complete comparable cost remain unverified; quota failure is not cost accounting |
| Verification — independent verifier + operator | Existing qualification, manual boundary review, source/evidence integrity checks | Keep host limits. Paseo/OMP cannot be disguised as registered native qualifier hosts. Human disposition remains separate |

## Six Dispatch Boundaries: Consequential Findings

1. **Paseo create:** existing placement, provider readiness and mode/features resolution can be reused. The inspected handler forwards provider/settings/caller context, not a named profile identity. This does not establish account/premium eligibility enforcement.
2. **Model/settings update:** root-session update is distinct from native worker per-call model approval. Installed OMP adapter source says changing approval mode requires a new session. Preserve requested versus effective settings; sequential changes are not an atomic transaction. A generic success signal is insufficient to assert all settings took effect.
3. **CLI launch:** it reaches a daemon session creation route, not the MCP catalog handler. MCP tool exposure control cannot alone establish CLI denial or policy coverage.
4. **Schedule:** the scheduler creates a new agent with stored settings and unattended context. Run count/expiry are not per-run cost/duration limits or renewable human spend approval. Creation and fire-time authority both matter.
5. **Heartbeat:** it prompts an existing agent rather than creates a new one. Its later effective settings and authority can differ from registration-time state; do not inherit scheduled-new-agent safety claims.
6. **OMP native task:** native preflight/model grants/spawn policy are real reusable source mechanisms, distinct from Paseo create. Per-call operator grants are not a general human premium approval or cross-account policy engine. Later source inspection found the adapter's launch-mode translation; the earlier uncertainty about that source mapping is narrowed, but effective live mode enforcement remains unverified.

Each finding's exact source path, line scope and configuration limitation is retained in B. No runtime action was run to validate the policy boundary.

## ROI And Tradeoffs

No realized numerical ROI, acceptance-rate gain or monetary saving is established. Qualitative priorities:

| Candidate | Benefit hypothesis | Cost/tradeoff | Decision now |
| --- | --- | --- | --- |
| Keep evidence current and bind effective settings to route | Less repeated discovery and fewer false safety statements | Evidence maintenance/version invalidation | Reuse current artifact/receipt conventions |
| Qualify demonstrated authorization gaps | Lower risk of unapproved account/model/action use | Requires safe pre-effect ingress, host authority and independent security verification; wrong fail-closed policy can disrupt legitimate work | Defer implementation; C remains separately gated |
| Preserve requested/effective settings truth | Prevent false belief that a mode update took effect | Version-specific adapter/UI/contract handling; first verify actual behavior | Concrete verification candidate, not an implemented fix |
| Correlate task/attempt/notification/review | Less restart archaeology and duplicate work | Native identity differences and privacy constraints | Reuse receipts; D needs explicit bounded authorization |
| Measure full actor economics before routing/cache optimization | Expose repair/review/failure/cache cost instead of optimizing headline model price | Data permission and missing usage/pricing can keep comparison inconclusive | No new store or optimization experiment now |
| Add another control plane/memory/result cache | Speculative centralized convenience | Duplicate ownership, stale/ACL cache risks and untested bypass surfaces | No-build on current evidence |

Future value tests should measure operator minutes per independently accepted task, failures/false completion, recovery effort and complete comparable actor costs. The BRD's proposed 10% handling-time target remains a future decision threshold, not a measured result. API money, quota, cache categories and elapsed time stay separate.

## Verification And Known Handoff Blocker

- Validated `task_brief.py` published both standalone packets; source hashes bind the approved inputs. A/B output is analytical evidence, not software behavior.
- A artifact check verified seven original sections and matching approved PRD/SRS digests; reviewer requested explicit tools mapping, now corrected. A separate reviewer is evaluating revised A and B.
- No build/lint/typecheck or permanent unit tests: not applicable to this report-only change. No invented TDD RED. Retained earlier installed CLI/helper smoke is scoped to entrypoint/reminder behavior, not repeated as runtime proof.
- **Required governed trace audit: FAIL, exit 1.** [trace-audit.md](trace-audit.md) records malformed HAR IDs, unrecognized declarations and dangling numeric aliases. Previous RunRecord/link/digest PASS does not cover this different audit. This is a document-link compatibility blocker, not evidence of unsafe or absent runtime controls.
- Do not claim a fully green governed implementation handoff or silently rename approved IDs. Repair requires a bounded explicit trace-identity compatibility decision, with affected history/digests preserved. The current A/B approval did not authorize an audit implementation change or identity migration.

## Delivery And Recovery Receipt

A author: `73683746-cfd1-49b3-a75a-57bd7de595f7`; B author: `3a6cf9b8-ccb7-4971-979a-7b643c30a241`; independent architecture/security reviewer: `a5865acb-08d5-4d27-a218-c764f4cd3dab`. Parent persists worker-authored frozen bodies and owns integration; no author accepts its own artifact.

B's first attempt ended in `usage_limit_reached`, confirmed error/no active turn. Operator explicitly stated quota reset; same profile and packet resumed, no cross-account/model substitution. The exhausted attempt remains in [recovery.md](recovery.md). That history is not a complete task-cost cohort.

## Excluded / Still Blocked

- C actual allow/deny probes: NOT RUN; safe real boundary and authentic scoped authority/bounds unresolved.
- D real lifecycle/cancel/recovery/usage walkthrough: NOT RUN; independent oracle, permitted sources and finite authority limits unresolved.
- Full E technical completion and operator final disposition: pending. Acceptance of A/B reports or a partial narrative cannot satisfy missing lifecycle evidence.
- Dependency installation, advanced validation resource activation, policy/source fixes, premium calls, publishing and deployment: not authorized.

A/B evidence can inform the next scoped decision. It does not authorize the deferred improvements or establish that the complete harness is trusted end to end.
