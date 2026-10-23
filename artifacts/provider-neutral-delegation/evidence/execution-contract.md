# Implementation execution contract

Project/domain: agent-skills-standard / Personal, confirmed by requesting operator.
Authorized workspace: /Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/flawless-mule.
Selected approach: Subagent-Driven.
Canonical plan: docs/plans/provider-neutral-delegation.md.
Requirements: docs/prd/prd-provider-neutral-delegation.md.
Technical design: docs/srs/srs-provider-neutral-delegation.md.

## Dispatch gate

No implementation worker starts before independent design review is settled and the requesting operator explicitly approves the sensitive technical design. The earlier implementation request selects intent; it is not fabricated approval of an unseen design. Once approved, scope is Tasks 1–8, not a reduced subset. Native qualification/repeated paid trials require separate resource/account authorization.

## All-worker invariants

- Load exact applicable standards into the worker context; never treat a parent/sibling MCP ledger as proof that the worker received a body.
- One implementation owner per component. No recursive delegation, commits, release/merge/deploy, unrelated cleanup, private account substitution or approval-control changes.
- Read the approved design and exact task/ACs; do not repeat global intake or redesign settled interfaces. Missing essential context is a concrete needs_context/blocked receipt, not permission to infer authority.
- Preserve existing user changes. Baseline inspection found only the review/planning artifacts from this conversation untracked; do not stage/commit them implicitly.
- Distinct plausible behavior regressions justify permanent tests. Never re-pin source/wording/wiring tests or weaken acceptance. Follow required RED/GREEN where permitted by coordinated verification schedule; no full suites, watchers or mid-flight shared checks.
- All source edits settle before covering checks. The integration owner runs final focused/covering checks and actual changed-path smoke, recording errors without mislabeling infra failures as expected RED.
- Return task/owner/revision identity, changed files or findings, AC results, commands actually run, obstacles/workarounds, artifact references and remaining risks. Process exit or self-review is not independent acceptance.
- Do not claim filesystem/network/tool enforcement from prompt text, comments or parseable exports. Support is host/surface/version/evidence-scoped.
- All expected actors/attempts remain in usage accounting; missing rates/coverage mean no monetary savings claim. No premium escalation from task size, retry count or strong hint.
- Archive required immutable packets, review snapshots and verification evidence at stable references before temporary workspace cleanup.

## Shared design interfaces

D1: full required skill bodies per request; no process-global omitted-body dedup or invented worker identity; migrate obsolete force_reload schema/callers/docs.
D2: mandatory explicit assignment JSON, `--assignment` / optional `--out`, complete authority/invariants/owner/AC/verification, plan/source/dependency identity, content-addressed immutable output, actual producer-revision checks.
D3: semantic prepare/dispatch/completion/resume/cancel/collect/verify; static native surface and versioned runtime qualification are distinct; no universal executor.
D4: shared .agents/workflows catalog + optional versioned existing lock extension; ownership-respecting actual-byte/digest verification and safe partial acquisition; present bad/legacy managed metadata never falls back to local_source; no-lock authored source remains labeled local_source.
D5: extend existing actor/attempt journals and harness/eval seams; preserve unknown/overlapping billing semantics and evidence layers.

## Ownership and parallel waves

Wave A after design approval: Task1 policy/server instructions; Task2 Python packet helper/test; Task5 CLI capabilities/specialist exports. No shared source edits.
Wave B: Task3 MCP body delivery after Task1 settles server; Task6 routing after bootstrap contract. Task4 catalog follows Task3 tools settlement and coordinates CLI sync edits with Task5.
Task7 fixture work may overlap only in disjoint owned files after D5 settles; actual integrated qualification needs Tasks1–6. Task8 owns regenerated exports, final docs/changelog integration and full acceptance trace after all source owners settle.

## Profile routing gate

Use only eligible Personal project/account profiles, exact provider/model/mode/effort. Discovered Personal - Cheap profile selects Gemini but also contains a Codex-route restriction; obtain explicit routing clarification rather than silently interpreting contradictory restrictions. Do not alter profile settings to authorize work. Independent reviews use eligible Personal · Analysis & Review, not implementation pools or premium advisors.
