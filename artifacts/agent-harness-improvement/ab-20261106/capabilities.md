# Capability Evidence Report — FINAL

## Identity, authority and evidence scope

**Task:** `harness-ab-capabilities`, Task 1; AC-HAR-01 → SRS-001.  
**Domain:** personal/open-source agent-skills-standard.  
**Disposition:** frozen analytical output for independent review; not independently accepted and not full-feature completion.

The authoritative assignment is `artifacts/agent-harness-improvement/ab-20261106/packet-a.md:1–107`. It records source revision `d1957d0a121ba386a704eb12130288e8ab675f3c`, dirty identity `approved-artifact-digests-no-tracked-source-diff`, and these approved input digests:

- PRD: `62e784bf8b02be5e58f8e695ece45dbd939c3521526ab59ef0591c8ef29bd868`.
- SRS: `1397437e7b2a547b5218ae0a3b12d0a6c29ce5277d201f7be09203461528d3d7`.

These are **packet-declared identities**, not worker-recomputed hashes or authenticated authority. Parent integration owns retained-byte digest/link verification. The task message authorizes Subagent-Driven **A/B read-only delivery only**; older PRD/SRS execution-approach fields do not expand that authorization.

**Evidence labels:**

- **confirmed(source):** inspected repository contract or source declaration, not installed execution.
- **retained observation:** installed behavior recorded in the approved BRD; not rerun here.
- **unknown / unverified:** evidence unavailable or insufficient; not a claim of absent capability.
- **unsupported:** use only for an established contract limitation, not a failed search.

Installed identities retained in the BRD are agent-skills-standard **2.7.4**, Paseo **0.8.0**, and OMP **18.16.0** (`docs/brd/brd-agent-harness-improvement.md:10,81–85,151–153,204–210`). Installed controlling configurations were not freshly inspected. No private configuration, journals, credentials or memory were accessed.

All seven areas below distinguish source, installed observations, configuration limitations and unverified integration. Paseo/OMP observations remain narrative evidence: the approved SRS explicitly excludes aliasing either runtime to a registered native qualifier host (`docs/srs/srs-agent-harness-improvement.md:123–131`).

## 1. Capture intent and assign work

**Owner and ingress:** operator supplies intent/authority; parent task owner prepares bounded assignments; Paseo owns agent creation and notification ingress; OMP owns native worker ingress. Standards own the portable packet contract, not dispatch authentication.

**Confirmed source:** `ARCHITECTURE.md:157–161` defines seven operations—prepare, dispatch, completion, resume, cancel, collect receipt and verify acceptance—and identifies `task_brief.py <PLAN_FILE> <TASK_NUMBER> --assignment <ASSIGNMENT_JSON>` as the packet publication entrypoint. The approved SRS specifies plan/source digests, owned paths, authority restrictions, standards revisions, verification and output contracts (`docs/srs/srs-agent-harness-improvement.md:133–147`).

**Installed/observed:** the approved BRD records an observed Paseo `create_agent` execution and exposed workspace/agent IDs, caller identity and notifications (`docs/brd/brd-agent-harness-improvement.md:71`). This report’s packet was read successfully. Neither fact proves lossless transfer through every runtime route or acceptance of the resulting work.

**Controlling configuration:** packet scope/authority fields are available declarations. Effective host launch policy, model/account eligibility enforcement and native OMP assignment configuration are **unavailable in this read-only evidence set**.

**Qualified state:** packet/lifecycle contract source-confirmed; specific prior creation observation retained; cross-runtime assignment delivery and independent acceptance remain **unverified**.

**Reuse / gap:** reuse standalone packets, native IDs and existing receipts. Task owner/runtime owners must later correlate actual assignment, dispatch, notification and acceptance. Do not introduce a second task format or infer authority from packet validation.

## 2. Authorize models, accounts and tool actions

**Owner and ingress:** operator/runtime owners control grants; Paseo owns creation/settings boundaries; OMP owns native per-call model approval and tool approval; standards own advisory policy and hook generation.

**Confirmed retained source evidence:** BRD E7 identifies OMP’s pinned native grant implementation:

https://github.com/can1357/oh-my-pi/blob/v18.16.0/packages/coding-agent/src/task/model-approval.ts

The BRD records operator-owned grants, intersection with live allowlists, and exclusion of project settings as granting authority (`docs/brd/brd-agent-harness-improvement.md:72,151`). Its installed Paseo handler inspection records provider/settings/caller forwarding without a named profile ID at `@getpaseo/server/dist/server/server/agent/tools/paseo-tools.js:1033–1078` (`:152`). These retained findings do not establish deployment-wide account/premium authorization.

**Installed/observed:** BRD `:81–85,206–208` records installed hook status, `(no rules in force)` from `ags policy status`, and direct synthetic invocation of the installed Codex loader producing a reminder with exit 0. No host interception or denial was demonstrated.

**Controlling configuration:** the retained project-policy status is scoped to that discovery observation. Current effective host grants, approval settings, account bindings and installed hook invocation configuration are **not available here**. Profile notes and assignment restrictions are not substitutes.

**Qualified state:** native grant/hook mechanisms have retained source evidence; reminder behavior has a retained synthetic observation; actual cross-route allow/deny enforcement is **unverified**.

**Reuse / gap:** runtime/security owners should reuse native controls and later establish a harmless pre-effect denial interface. C remains blocked by authority/preflight prerequisites. No real premium invocation, wrong-account workload or policy weakening is authorized.

**PRD inventory mapping:** intent/assignment → §1; model/account authorization → §2; context/memory → §3; tools → §2a below; recovery → §5; verification → §7; economics → §6. Route/isolate (§4) is supplemental, not a replacement for the tools area.

## 2a. Execute tool actions under runtime-owned controls

**Owner and actual ingress:** OMP owns execution-time tool approval; the tool-serving runtime owns each action’s execution boundary. Standards own advisory policy/hook generation, not runtime authentication or containment. **Exact installed action-dispatch handler identity, tool registry/configuration and per-tool approval interception entrypoints are unavailable in the retained evidence.** Paseo `create_agent` is an orchestration ingress, not evidence identifying the downstream file, shell or MCP action boundary.

**Source evidence:** retained BRD `docs/brd/brd-agent-harness-improvement.md:72,147–148` identifies standards hook generation at `cli/src/services/HookService.ts:201–248` and the installed Codex loader at `.codex/hooks/preedit-skill-loader.js:1–64`. The BRD records optional blocking, cooperative bypass and fail-open behavior in generated hook source, distinct from the installed reminder-only variant. Its OMP approval reference is pinned to v18.16.0:

https://github.com/can1357/oh-my-pi/blob/v18.16.0/docs/approval-mode.md

This is retained source/documentation evidence, not proof that a particular installed action traverses an enforced boundary.

**Installed/observed and controlling configuration:** BRD `:81–85,204–208` records installed hooks, no project rules in force at discovery, and direct synthetic loader invocation emitting a reminder with exit 0. No actual tool action was intercepted or denied. Current enabled tools, permission rules, hook wiring, sandbox policy and effective host configuration are **unavailable**; no private configuration was inspected.

**Qualified state:** retained approval/hook mechanisms are source-backed; synthetic reminder behavior is observed historically; actual tool-action ingress identity and runtime enforcement remain **unverified**.

**Reuse / gap:** reuse runtime-owned tool approval and existing hook mechanisms only within demonstrated scope. Runtime/security owner must identify the actual execution ingress and controlling configuration before any later authorized allow/deny qualification. Prompt instructions, hook installation and synthetic invocation cannot promote tool enforcement. C/D remain excluded from this correction.

## 3. Supply context and memory

**Owner and ingress:** standards/MCP own routed skill delivery; host runtimes own conversation assembly and context placement; OMP owns its compaction/session-memory machinery.

**Confirmed source:** `ARCHITECTURE.md:28–66` describes hierarchical routing, request-scoped full-body returns, SHA-256 body accounting and process-local consultation telemetry. It explicitly separates selection/body return from worker receipt, comprehension and enforcement.

OMP’s version-bound context/memory references are retained in the BRD:

- https://github.com/can1357/oh-my-pi/blob/v18.16.0/docs/compaction.md
- https://github.com/can1357/oh-my-pi/blob/v18.16.0/docs/memory.md

**Installed/observed:** this worker received the two required standards bodies through direct MCP lookup. That establishes body return to this interaction, not all-worker delivery, future recall or runtime memory behavior. The BRD describes context/memory mechanisms but reports no fresh memory-backend exercise.

**Controlling configuration:** current memory enablement, backend selection, compaction thresholds, retention and host-specific context injection configuration are **unavailable**. Upstream defaults cannot establish local enablement.

**Qualified state:** routing/body-return contract source-confirmed and assigned bodies returned here; persistent memory and cross-session recovery behavior **unverified**.

**Reuse / gap:** reuse exact standards IDs, request-scoped bodies and digests. Context owner should later verify only the required session boundary and permitted configuration. A second memory database is unjustified; neither larger instructions nor more consultation calls establish better outcomes.

## 4. Route and isolate work

**Owner and ingress:** parent applies eligible placement; Paseo owns profile materialization and workspace/worktree placement; OMP owns native task/eval/workpool model selection; runtime owners enforce actual access restrictions.

**Confirmed source:** `ARCHITECTURE.md:164–170` separates placement, capability hints, configured effort and authority. Placement receipts record the reason for worker isolation or independence; hints do not authorize accounts. `docs/agent-capabilities.md:5–19` distinguishes serialized resources from runtime support and lists registered delegation surfaces. Paseo and OMP are not registered qualifier hosts under the SRS contract (`docs/srs/srs-agent-harness-improvement.md:123–131`).

**Installed/observed:** approved BRD `:74` records available Paseo profile/workspace mechanisms and OMP source-level model grants. This report does not exercise worktree isolation or model selection.

**Controlling configuration:** the assignment names the authorized workspace and selected analysis role. Effective filesystem/network sandbox policy, runtime worktree restrictions, profile settings and native model allowlists are **unavailable for inspection here**.

**Qualified state:** placement and resource-format contracts source-confirmed; installed mechanisms retained as prior evidence; actual isolation and complete routing authorization **unverified**. Existing native qualifier dispatch rows are `not_verified`, not proof for this integration.

**Reuse / gap:** preserve configured provider/model/mode/effort/features and native workspace identities; do not fabricate host aliases. Runtime owners must distinguish checkout collision avoidance from credential/process/network containment. No new orchestration framework or profile migration is justified.

## 5. Recover, cancel and stop work

**Owner and ingress:** native runtimes own execution/cessation; parent reconciles notifications and attempts; standards own revision-bound checkpoint declarations.

**Confirmed source:** `skills/common/common-subagent-driven-development/references/progress-receipts.md:1–48` identifies `sdd_progress.py init`, `reconcile` and read-only `status`. Receipts bind plan/workspace/revision and evidence hashes; unchanged replay is idempotent. Owner/paused fields do not authenticate identity or enforce cessation. Checkpoint completion is separate from technical verification and business acceptance.

Pinned OMP recovery evidence is retained at:

https://github.com/can1357/oh-my-pi/blob/v18.16.0/docs/non-compaction-retry-policy.md

**Installed/observed:** BRD `:75,208` records lifecycle interfaces but no integrated cancellation, recovery or budget-exhaustion exercise.

**Controlling configuration:** live cancellation ownership, retry policy, recovery state, child-process behavior and notification persistence configuration are **unavailable**. No progress helper was run in this assignment.

**Qualified state:** recovery/checkpoint contracts source-confirmed; actual cross-owner stop and recovery semantics **unverified**.

**Reuse / gap:** retain native IDs and every attempt; reconcile current source/evidence before resuming. SRS `:91–97,147–149` correctly requires supported cessation evidence before conflicting resource reuse. Timeout, cancel acknowledgement or parent shutdown cannot certify child cessation. No new scheduler or checkpoint store is justified.

## 6. Observe economics and task outcomes

**Owner and ingress:** runtime owners expose permitted usage; economics verifier declares cohort/attempt mappings; `SessionJournal` consumes an explicit manifest.

**Confirmed source:** `mcp/src/services/SessionJournal.ts:6–87` declares codex/omp formats, main/implementation/review/auxiliary roles, attempt outcomes, expected actors, coverage/missing actors and separate usage categories. Task labels are declared correlation fields, not authenticated identity. SRS `:151–159` specifies `ags-mcp-session-report --manifest MANIFEST_JSON --json`, explicit permitted sources, incompatible eval usage contracts and no automatic lossless conversion.

**Installed/observed:** BRD `:76,153,208` retains OMP help observations for stats/bench/cost-time controls, not actual full-task accounting. No journals or usage sources were opened here.

**Controlling configuration:** authorized session manifest, expected actor inventory, pricing, quota, journal access and current runtime budget configuration are **unavailable**. In-flight budget overshoot remains a retained documented limitation, not an observed amount.

**Qualified state:** accounting interface source-confirmed; executable installed report parity and complete Paseo/native actor correlation **unverified**; total task money/quota unavailable.

**Reuse / gap:** reuse the explicit manifest and redacted aggregate output after separate permission. Reconcile duplicate attribution before summing orchestration and leaf usage. Include parent, workers, independent review, integration, repairs and actual failed/cancelled attempts. Missing values remain unavailable; do not generate failures to populate categories or build another pricing/telemetry service.

## 7. Verify and independently accept outcomes

**Owner and ingress:** task owner supplies evidence; independent verifier evaluates exact frozen bytes and actual behavior; operator owns final disposition.

**Confirmed source:** `docs/agent-capabilities.md:5–19` requires runtime evidence rather than serialized resource existence. SRS `:123–131` describes existing qualification discovery/execution/denial requirements and warns that exit 0 may still yield `not_verified`. `ARCHITECTURE.md:173–182` separates document-link assurance, checkpoint state, measurement arithmetic and actual acceptance.

**Installed/observed:** BRD `:86–88,154–155` retains historical eval/structural reports and their limitations. Those aggregates are not current executable-task success or productivity proof. No tests, qualification command or live acceptance scenario was run here.

**Controlling configuration:** live scenario oracle, authorized probe environment and current qualifying trace set are **unavailable**. This packet assigns independent manual review; that review has not been performed by this worker.

**Qualified state:** verification contracts source-confirmed; this report **awaits independent acceptance**. C/D remain blocked; full baseline completion remains partial.

**Reuse / gap:** use existing qualifier only for genuine registered-host subclaims. Review Paseo/OMP narrative evidence independently without invented host IDs. Missing required lifecycle proof cannot be satisfied by a schema-valid run record, successful helper, worker completion or human acceptance of a partial report.

## Bounded leverage and completion limits

**Recommendation:** reuse the existing packet, qualification, receipt and explicit-manifest mechanisms; retain unknowns before proposing repairs. No replacement runtime, registry extension, memory store or telemetry service is justified by this evidence.

Potential leverage remains **hypothesized**, not realized ROI:

1. Revision/config-qualified records may reduce repeated discovery and stale safety claims.
2. Explicit attempt/notification/acceptance linkage may reduce restart archaeology and false completion.
3. Complete actor accounting may expose repair/review/cache costs before routing optimization.

Measure accepted-task handling time, recovery effort, false-completion/regression outcomes and complete comparable costs only under separately authorized validation. No current benefit percentage, monetary saving or payback is established. Source availability alone does not prove the proposed reuse will cover all runtime boundaries.

## Frozen completion receipt

- **Status:** FINAL / frozen for parent persistence and independent review.
- **Files changed by worker:** none.
- **Evidence:** assigned packet; approved BRD/PRD/SRS; narrowly inspected architecture, capability documentation, journal declarations and receipt contract.
- **Not performed:** runtime probes, private configuration/journal access, code changes, builds/lint/tests, installs, nested delegation or premium calls.
- **Unresolved:** current controlling configurations; live enforcement/cessation; complete actor accounting; independent acceptance.
- **Compliance:** packet-required standards bodies loaded; compliance audit completed before return.
- **Scope:** report delivery only. No self-issued AC-HAR-01 acceptance, C/D completion or full-feature completion.
