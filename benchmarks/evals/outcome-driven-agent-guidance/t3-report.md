# T3 candidate report — outcome-brief implementation handoff

Status: **FINAL corrective R2, static source candidate only** — frozen for parent integration review. Not qualified, not executed, not published, not activated. No paid trials, adapter/schema/runtime/generation changes, commits, T2 integration, or delegation.

- Worktree: `/Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/illegal-platypus`
- Authority: operator “Start implement the plan”, 2026-11-26; T1 R2 independently accepted; this packet dispatched for T3 source development.
- Baseline identity: `benchmarks/evals/outcome-driven-agent-guidance/baseline/manifest.json`.
- Inputs: plan T3/REQ-02/REQ-03; `t0-review.md`; settled T1 guidance and `t1-report.md`; T1 review acceptance. T2 is not fully accepted and is not integrated as qualification.
- Corrective review: portable worker dispatch must state authority precedence. Packet-wins is now limited to worker-added assumptions/choices, and the carried record cannot grant authority it lacks.
- Owned write set only: the two canonical files below plus this report. T1/T2 paths unchanged by this slice.

## Changed paths (frozen)

| Path | Baseline bytes / sha256 | Candidate bytes / sha256 | Limit |
| --- | --- | --- | --- |
| `.agents/workflows/implement-feature.md` | 7520 / `d62961e4…76d2a` | 8111 / `48b57bfc6dd53ebbdfcde69679f0691bd31eb25b7c7b60eaafed16d7cddc8d93` | 80 lines → 80 |
| `skills/common/common-subagent-driven-development/references/templates.md` | 14818 / `4b20e2da…1495` | 16117 / `d81ae93a43c51d79af32aa4ce4ff631e30d4aa4260339a34d2331ad8028ce07e` | reference, no line budget |

## Baseline → candidate disposition ledger

### `.agents/workflows/implement-feature.md`

| Baseline normative instruction | Disposition | Candidate location / rationale |
| --- | --- | --- |
| Step 3 ownership packet: owner, files, goal, in/out scope, authority, criteria refs, lane, approval, receipt | Retained; extended | All baseline fields kept. Adds observable outcome, acceptance criteria, delegated method choices, required evidence, stop condition. REQ-02 outcome brief without weakening scope/authority. |
| Step 3: record work item @ revision once; link criteria/lanes; standalone packet; blocked slices name blocker/owner/input | Retained | Verbatim intent unchanged. |
| Step 4 freshness/`BLOCKED-STALE`/invalidation binding/no full re-plan | Retained untouched | No semantic change. |
| Step 5 placement, named-benefit delegation, one owner per disjoint slice, packet bootstrap | Retained | Text unchanged. |
| Step 5 TDD contract, RED observation, `invalid_red`/`frozen_snapshot_red`/`NOT RUN`, smallest change, focused single-run, raw counts, revision-bound receipts | Retained untouched | No semantic change; honest-TDD obligations preserved. |
| — | Added | “Resolve discoverable facts … before asking; ask only a material decision tools cannot resolve. Choose method inside the packet's delegated choices; an unrelated improvement is a proposal, not scope expansion.” REQ-02 autonomy inside authorized scope; AC-03/AC-04/AC-05. |
| Step 6 independent slice review; self-review never satisfies | Retained untouched | No semantic change. |
| Step 7 missing prerequisite → `needs_context`/`blocked`; exhaustion → authorized fallback; safety/design → human; no premium | Retained | Route structure unchanged. |
| Step 7 defective output → one corrective assignment naming the failed AC | **Narrowed/strengthened** | Now names cited evidence, failed AC, repair boundary, and required verification. Adds unchanged-evidence stop with the missing input instead of retry or method switch. REQ-03/AC-07/AC-08; no blind retry. |
| Steps 8–10 context preservation, settle/shared checks, whole-branch review, `snc:diff`, trace/outcome audits, human acceptance vs release | Retained untouched | No semantic change. |
| Runtime Contract, Handoff Payload, Output Template, Cost Report | Retained untouched | No semantic change. |
| Blocking Questions: max 3, material-only, default + options | Retained; extended | Adds discovery-first from packet/repository/named standards before asking. AC-04 material-question behavior without needless clarification. |

### `skills/common/common-subagent-driven-development/references/templates.md`

| Baseline normative instruction | Disposition | Candidate location / rationale |
| --- | --- | --- |
| Section 0 intro: `task_brief.py` validates required fields; missing field exits 2 | Retained; clarified | Adds that `Delegated method / stop` is additional carried guidance and validator required labels are unchanged. Prevents a false validation claim. |
| Section 0 Inputs | Retained; extended | Adds discoverable sources the worker must check before asking. |
| Section 0 Outputs | Retained; extended | Adds observable outcome/acceptance criteria. |
| Section 0 Real Ingress, Invariants (positive/negative), Gate/rollback | Retained untouched | No semantic change. |
| — | Added | `Delegated method / stop`: methods the worker may choose inside scope; unrelated improvements are proposals; stop when criteria are met or name the missing input. |
| Section 0 Verification owner + exact command | Retained; extended | Adds required RED/GREEN/smoke evidence receipt. |
| Section 0 Handoff/freeze: FINAL report before review | Retained untouched | No semantic change. |
| Section 0 Correction route: host ladder, one corrective follow-up, escalate, no automatic premium | Retained; strengthened | Now requires cited evidence, failed AC, repair boundary, required verification; unchanged evidence stops with the missing input. Host route and no-premium rule preserved. |
| Section 1 Assignment Packet: “packet is authoritative”; “the packet wins”; do not repeat intake | **Clarified** | Host policy and matching user authorization outrank the packet. Packet-wins is limited to worker-added assumptions or choices; the packet cannot grant authority it does not carry. |
| Section 1 Carried Delivery Contract: “Authority comes from this carried record” | **Clarified** | Authority applies only where the record carries it; host policy and matching user authorization outrank it. Intake/approval/sensitive-change guidance unchanged. |
| Section 1 implementer “request only named standards”; YAGNI on owned files; focused tests; no commit; self-review not independent; report | Retained | Item 2 adds discovery-first and method choice inside delegated choices; YAGNI retained. |
| Section 1 boundaries: no git commits, no recursive delegation, focused verification, evidence boundary, denial alternative, sibling forward-only, terminal-state, provenance, escalation | Retained | All prior boundary text preserved; adds No-Progress Stop for unchanged evidence. |
| Section 1 report format | Retained; extended | Adds correction evidence line: failed AC, cited evidence, repair boundary, verification result. |
| Sections 2–4 blind reviewer, reconciliation, fix-round routes | Retained untouched | No semantic change; structural tests still pass. |

No protected obligation was removed or downgraded: delivery modes, scope/revision/approval, bounded ownership, freshness checks, honest TDD/RED taxonomy, independent slice and branch review, real consumer smoke, cause-based authorized fallback, archive/state, actual counts, trace/outcome audits, human acceptance/release separation, uncertain-effect reconciliation, and no-progress stop remain. Host/user authority stays above the packet.

## REQ / AC status

| Item | Status | Evidence | Limit |
| --- | --- | --- | --- |
| REQ-02 | Source-candidate implemented | Outcome fields, delegated method, discovery-first, stop condition in workflow and templates | No executable evaluation |
| REQ-03 | Source-candidate implemented | Evidence-backed correction fields and unchanged-evidence stop in workflow and templates | No executable evaluation |
| AC-03 direct execution without unnecessary confirmation | **NOT RUN** | Guidance supports direct execution inside scope; no approved execution adapter | Static only |
| AC-04 material decision requested when tools cannot resolve | **NOT RUN** | Discovery-first + existing Blocking Questions contract | Transcript evaluation not run |
| AC-05 stop when no criterion remains | **NOT RUN** | Stop condition in brief/delegated-method fields | Executable evaluation not run |
| AC-06 unauthorized consequential action stays unexecuted | **NOT RUN** | Approval/authority text preserved; no change to host controls | Instrumented safety evaluation not run |
| AC-07 correction satisfies failed criterion without weakening oracle | **NOT RUN** | Evidence/failed-AC/repair-boundary/verification assignment | Executable correction evaluation not run |
| AC-08 unchanged failure stops or seeks input | **NOT RUN** | No-progress stop in workflow Step 7, template correction route, implementer boundary | Blinded decision evaluation not run |

AC-03–AC-08 are not PASS. Static source review and transcript decisions are separate evidence tiers; no execution adapter is approved.

## Checks actually run (narrow, post-freeze)

1. `wc -l .agents/workflows/implement-feature.md` → `80` (limit 80). PASS.
2. Python structural check against the real validator labels and candidate markers:
   - parsed Section 0 from `templates.md`;
   - `task_brief._CONTRACT_LABELS` misses: `[]`;
   - `Delegated method / stop` present: `True`;
   - `No-Progress Stop` present: `True`;
   - workflow semantic markers (`observable outcome`, `delegated method choices`, `Resolve discoverable facts`, `cited evidence, failed AC, repair boundary`, `unchanged evidence → stop and name the missing input`): all `True`;
   - authority-precedence markers (`Host policy and matching user authorization outrank this packet`, `The packet wins only over assumptions or choices`, `cannot grant authority it does not carry`, `Authority comes from this carried record only where the record carries it; host policy and matching user authorization outrank it`): all `True`;
   - `RESULT= PASS`.
3. `python3 -m unittest scripts.skill-tests.common-subagent-driven-development.test_review_dispatch` → `Ran 5 tests in 0.002s / OK`. The existing blind-review/reconciliation/fix-round structural contract still passes.

No build, lint, formatter, paid eval, or broader suite was run.

## NOT RUN

- AC-03–AC-08 executable/transcript qualification; no approved execution adapter, no action traces, no paid trials.
- T4 comparison, cost/savings, adoption decision.
- T2 integration or qualification; T2 contract gap is unresolved and independent of this source candidate.
- Generated mirrors, generation/provenance steps, publication parity, activation.
- Repo-wide tests, build, lint, formatters; not required for this static candidate and not authorized mid-flight.

## Residual risks / reviewer focus

1. **Source-only claim**: The candidate changes what the workflow and templates say, not what a model does. AC-03–AC-08 remain unverified behaviorally.
2. **Validator scope**: `Delegated method / stop` is carried guidance, not a `task_brief.py` required key. A future validator extension would be a separate schema/runtime change and is not authorized here.
3. **Line budget**: `implement-feature.md` is exactly 80 lines. Any reviewer-requested addition requires an equivalent compression elsewhere.
4. **Correction route**: One corrective follow-up plus host-route escalation is preserved. The new evidence/repair-boundary fields do not grant extra retries or premium authority.
5. **T2 exclusion**: No routing-collision fix is integrated or claimed; this candidate consumes accepted T1 guidance only.
6. **Authority precedence**: The dispatch now states host/user precedence in both the Assignment Packet and the Carried Delivery Contract. A worker must still treat any host-enforced restriction as binding even where the packet text does not repeat it.

Freeze: the two source files above are the T3 FINAL R2 candidate bytes. Any later edit invalidates the hashes and this report; re-run the narrow structural check and the review-dispatch test after such a change. Parent integration owner arranges independent review; no worker self-approval.
