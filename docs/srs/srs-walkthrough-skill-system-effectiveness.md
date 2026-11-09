# Design Walkthrough: Skill System Effectiveness

Date: 2026-11-05
Status: draft design delivered; approval and implementation handoff blocked on named decisions
Design: [SRS revision 1](srs-skill-system-effectiveness.md)
Run receipt: [design outcome](../../artifacts/runs/skill-system-effectiveness/20261105-design-solution.json)

## Authorized Scope

The requesting maintainer approved the BRD and subsequently agreed to a bounded technical design. This authorizes documentation, not code, provisioning, pilot spend, generation attempts or runtime execution. Only design and walkthrough/outcome artifacts were created in this step. The original implementation plan and historical acceptance receipts were not rewritten.

## Evidence Read

- `scripts/evals/execute.ts:58-76,141-209`: current runner launches read-only Codex and returns final-answer text/usage. It is not a candidate build/run sandbox.
- `scripts/evals/types.ts:1-4,31-56`: existing arms and usage/outcome types have a transcript-specific contract; new L3 types must remain separate.
- `benchmarks/evals/backend-system-design-roi-pilot.md:52-86,88-143`: original prose protocol, independent semantic grading and explicit absent executable lane.
- `scripts/harness-smoke/run.ts:25-43,60-66`: existing host/delegation qualification is distinct from executing generated application candidates.
- Git `4acc21f4d:docs/prd/prd-backend-system-design-roi-improvement.md`: original scoped guidance/distribution acceptance does not authorize T7 or substantiate ROI.
- Retained T5 acceptance receipt from the preceding readiness assessment matches the current held-out packet hash. This does not establish all current candidate inputs match the freeze.

## Design Decisions and Limitations

1. Keep transcript evaluation unchanged. Add a standalone artifact protocol; original prose attempts cannot become executable evidence through grader translation.
2. Trusted controller and stubs remain outside candidate containers; candidate containers run only inside a separately authorized disposable Linux VM. Docker alone is not asserted to contain arbitrary hostile code.
3. Use no-network/offline build and execution, frozen artifact identities, mandatory finite limits and candidate-owned mechanisms. Runtime controls must be demonstrated, not merely described by flags.
4. Treat independent observation of tenant intermediate stages and overload buffers as an explicit evaluator acceptance gate. Self-reported zero errors is insufficient.
5. Exact operation schemas, VM/runtime selection, limits/retention and current input binding must close before affected implementation dispatch. These are owned design gates, not implicit freedom for workers to improvise.

## Exercised Checks

- Docker client query returned `Docker version 29.5.2, build 79eb04c`.
- This only establishes client availability. Docker daemon, disposable VM, image availability, isolation enforcement, cleanup, fault drivers and L3 candidate behavior were **NOT RUN**.
- The checkout previously failed its metrics command because `tsx`/dependencies are absent. That failure was not rerun; no full test/build/lint result is claimed.
- Outcome/document integrity checks are performed as bounded Node read-only checks; they do not qualify runtime behavior or independent security review.

## Review and Handoff

Self-review addressed protocol contamination, evaluator substitution, unbounded resources, missing host authorization, evidence overwrites, mixed result schemas and human-time versus agent-time confusion. No independent architecture/security review was performed in this step; design approval cannot substitute for it.

Next decision: approve or correct the proposed isolated-runtime and separate-protocol direction. After approval, close the named interface/runtime inputs and perform implementation-readiness before authorizing a multi-task implementation plan. Pilot authority remains separate.

## Cost

Host-wide tokens, complete actor coverage and pricing are unavailable. MCP session counters are not total task cost. No claim of $0 cost or numerical savings is made.

## Revision-2 Closure and Readiness

This addendum supersedes the draft-stage open-input list above, without rewriting its history. The maintainer approved the direction and selected a dedicated local disposable Linux VM. The SRS now provides concrete operation payload/results, common strict framing, controller-owned fault timelines, a proposed Lima/VZ profile, numerical resource ceilings, retention rules and D1–D5 owned-path implementation slices. Independent acceptance remains NOT RUN; supplied design details are not deployed controls.

Readiness evidence: Docker selected `desktop-linux`, but its daemon socket was unavailable; `limactl`, `qemu-system-aarch64` and `vz` executables were not found by PATH lookup. This does not prove Apple's Virtualization.framework is absent. Proposed Lima backend support must be checked against the installed Lima/macOS version before use; official configuration reference: https://lima-vm.io/docs/config/vmtype/vz . No VM, Docker daemon, downloads or image builds were started.

The original pilot's public prompts are prose-only. Revision-2 artifact contracts are a new, separately frozen generation protocol. Time-compressed payment schedules and scaled overload workloads explicitly limit the duration/capacity claims they can support. Tenant internal-stage inspection requires independent source/observation review; candidate-generated traces alone cannot establish absence of leakage.

Self-review fixed unbounded message-ID lists in overload status/drain responses, made the workload schedule fit the whole-attempt deadline, and preserved existing transcript/scorer schemas. Qualification must still prove actual byte transport, isolation, deadlines, observation completeness and owned cleanup.

Remaining source-implementation gates: independent revision-2 contract/security review and scoped D1–D4 implementation authority. Remaining live-qualification gates: provisioning/activation authority and genuine frozen images/runtime identities. Model experiment authority and actual benefit measurements are later, separate gates. Do not reclassify these as additional generic design-writing tasks.

## Correction Retrospective — Proposal Only

- Evidence: maintainer asked “why you not continue?” after the assistant stopped immediately after recording the runtime-target selection, while authorized schema/limit/plan drafting remained.
- Root cause: workflow/procedure; an intermediate approval was incorrectly used as a stopping condition.
- Improvement item: `SSE-CONTINUE-001`, status `proposed`, owner workflow maintainer. Continue all independent authorized work after a decision; pause only the affected operation requiring new authority. Consolidate consequential choices into one explicit decision rather than repeatedly asking generic “ok”.
- Prevention candidate: held-out workflow evaluation in which runtime selection is answered while design-only work remains. Expected behavior is to finish contracts/plan without provisioning or starting a pilot. This evaluation has NOT RUN; no prevention efficacy claimed.
- Relevant skills were loaded; no trigger miss was identified. No registry, policy, AGENTS.md, CLAUDE.md, AGENTS_LEARNING.md or memory changes are authorized by this correction, and none were made. This is a retrospective proposal in the task record, not automatic promotion or a learning-log append.
