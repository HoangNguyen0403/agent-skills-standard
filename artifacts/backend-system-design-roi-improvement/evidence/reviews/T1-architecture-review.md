# T1 independent architecture review

## Verdict: CHANGES REQUESTED

Role: specialist-architecture-guard; independent of implementation. Scope: canonical guidance, documentary evidence only; not a running service or efficacy evaluation. Reviewed the four settled sources against T0 frozen originals using `rtk proxy diff -u`; exit 1 indicated differences, not test failure. `rtk proxy shasum -a 256` independently matched every full source/baseline hash below to T1-report.md and the baseline manifest. No source changes, delegation, builds, tests, formatters, generators, model evaluations, sealed T5 cases, commits or pushes.

Rules loaded: code-review and review-system-design workflows; MCP common/common-code-review, common/common-architecture-audit, common/common-security-audit, common/common-security-standards, common/common-skill-creator, common/common-feedback-reporter, common/common-session-retrospective, common/common-workflow-writing, common/common-best-practices, specialists/specialist-architecture-guard, system-design/system-design-methodology, system-design/system-design-principles, system-design/system-design-review. Router additionally returned golang/golang-architecture, python/python-architecture and react-native/react-native-security; those language-specific rules are not applicable to these Markdown guidance files. MCP audit performed before this report; its generic Markdown/product-management coverage warning does not identify a missing architecture rule. Semantic rubric read separately; lexical checks are not mechanism proof.

Governing contracts: approved ROI plan §4 and T1, review-contract.md, lead-dispatch-contract.md. No proposed application topology was extracted or scored: this is a guidance-delta review against explicit ACs, not an operations-readiness nine-axis assessment. Human approval remains separate.

## Confirmed blocking findings

### [MAJOR] T1-A1 — shared is not synonymous with optional; ejection caps do not override enforcement

Evidence: `skills/system-design/system-design-resilience-ops/references/reliability-operations.md:25` says "Required means fail readiness; optional or shared means keep serving degraded" and explicitly includes an auth provider. `skills/system-design/system-design-building-blocks/references/building-blocks.md:13-15` likewise conflates optional/shared and offers route-to-all panic without constraining safety. Both skill bodies correctly distinguish optional dependencies and mandatory gateway enforcement (`building-blocks/SKILL.md:61,64`), and the gateway reference correctly fails closed at `building-blocks.md:80`; the operational procedure contradicts those rules.

Why: shared describes blast radius, not whether a request is safe to serve. An ejection-fraction cap is a passive-balancer mechanism, not a guarantee that platform readiness will preserve endpoints, nor permission to route unsafe requests.

Adverse timeline: all replicas lose the required auth/quota dependency; the prescribed "shared means keep serving degraded" and route-to-all panic are applied to protected routes. Forwarding unverified work violates enforcement; marking every replica unready instead still empties discovery regardless of a passive-ejection cap. Neither branch establishes the intended safe degraded availability.

Violated contract: AC-ROI-03 (optional shared dependency, not every shared dependency); T1 explicit auth/quota correctness boundary; shared canonical ownership/no contradictory contracts.

Bounded repair: classify required/optional per request class independently of shared/local. Keep serviceable routes available; reject protected requests locally when mandatory enforcement cannot be established. Distinguish readiness/discovery from passive ejection and panic. State that neither panic nor ejection limits bypass auth/quota or route work an instance cannot safely serve. Update report timeline B accordingly. No new infrastructure required.

### [MAJOR] T1-A2 — pool size is not a QPS bound

Evidence: `skills/system-design/system-design-resilience-ops/references/reliability-operations.md:44` requires `callers × per-instance pool size` to fit a dependency's "connection or QPS ceiling"; building-blocks reference `:28` supplies the same product without units.

Why: callers × connections/caller produces connections (or concurrent requests for an explicitly request-concurrency pool), not requests/second. It cannot establish admission below a rate ceiling.

Adverse timeline: 10 callers × 10 pooled connections = 100 connections. Dependency permits 100 QPS. Calls take 10 ms and each connection runs sequential calls: the pool can generate about 100 / 0.01 = 10,000 QPS. The published inequality appears satisfied by comparing 100 to 100, yet downstream rate is exceeded by 100× and retries amplify overload.

Violated contract: AC-ROI-02's bounded admission and T1 connection between admission and downstream ceilings; semantic quantitative-coherence rule rejects unlike-unit comparisons.

Bounded repair: name safe-load/admitted-demand units and workload assumptions. Compare aggregate pools to connection/concurrency ceilings only; separately bound request rate/cost admission against QPS/work ceilings, accounting for fan-out/retries and the measured workload/service time when deriving rate from concurrency. Preserve the existing surviving-instance arithmetic.

### [MAJOR] T1-A3 — distributed-budget classification and finite partition bound are not established

Evidence: `skills/system-design/system-design-building-blocks/references/building-blocks.md:95` classifies any edge-cached budget as per-replica with `replicas × budget`; `:98` labels a local bucket reconciled to authority "available, bounded overshoot" without specifying allowance/refill/window/partition duration. `T1-report.md:71` computes eight 12.5 rps budgets as 800 rps.

Why: disjoint authoritative allocations can conserve a global allowance without synchronous admission at every edge. Independently copied full allowances can overshoot; locally refilling allowances can accumulate excess for the entire partition. Reconciliation later is not a bound. Eight × 12.5 rps is 100 rps, not 800 rps.

Adverse timelines: (1) authority allocates eight disjoint 12.5 rps shares of a 100 rps limit; guidance incorrectly rejects this as an 800 rps/global-exactness failure. (2) every edge instead independently refills a copied 100 rps allowance through a T-second partition: aggregate rate can reach 800 rps and excess grows by roughly 700T requests, plus initial burst allowance. No finite total overshoot follows without a time/refill/lease bound.

Violated contract: T1 limiter atomic authority and explicit partition/overshoot trade-off; shared constraint-driven selection and semantic arithmetic invariants.

Bounded repair: distinguish copied full budgets from conserved, disjoint allocations. Declare budget units/window, burst allowance, refill ownership, valid allocation/lease lifetime, replica bound and behavior after authority loss. State whether the bound is instantaneous rate, per-window admissions or cumulative overshoot; derive it from those assumptions. If finite exhaustion/no refill is intended, state it. Correct timeline E to 100 rps, or change each independent budget to 100 rps to demonstrate 800 rps. Mandatory auth/quota routes must still honor the enforcement contract rather than inherit optional fail-through.

## AC disposition at reviewed hashes

| AC | Documentary check | Disposition |
| --- | --- | --- |
| AC-ROI-02 | BB body :62,73; BB reference :20-28; RO body :30; RO reference :33-44 require residual capacity, explicit admission/degradation and retry-inclusive demand | Core instance/zone-loss mechanism present. Not cleanly accepted until A2 removes the dimensional error in downstream admission. |
| AC-ROI-03 | BB body :61,64; BB reference :12-15,80; RO reference :22-29 | Optional recommendations outage has a defined degraded result; shared/required-auth and panic contradictions block acceptance (A1). |
| AC-ROI-04 | BB reference :63-67; RO body :64,75; RO reference :50-55,69-72 | PASS as guidance: bytes/items/time, backpressure, disconnect cleanup, finite drain/lifetime, cursor retention, explicit restart outside history, recovery by resumed delivery. No executable proof claimed. |

## Other checks and nonblocking observations

- L4/L7 and HTTP multiplexing no longer recommend gRPC-to-L4 by default. Load metric caveat correctly separates connection count from mixed-cost active work. This is selection guidance, not a claim that an existing stream can be redistributed mid-stream.
- Deadline propagation and one retry owner are explicit (BB body :63; RO reference :59-65), including queue time and retry budget. RO drain :52-53 should be read with :60's idempotency precondition: cancellation alone cannot establish that a business effect did not commit. Avoid a future unconditional-retry interpretation; T3 owns the operation/outcome mechanism.
- TLS termination and client-identity-header overwrite are explicit at BB reference :81. No runtime ingress isolation or mTLS deployment is established by that prose.
- Expired stream history explicitly returns resume/restart rather than silently advancing; concurrent-stream and lifetime caps plus per-instance buffered-byte monitoring are present.
- +29% bodies/+80% references are reported costs, not benefits. Selection in BB and procedure in RO is defensible; no extra blocker based solely on size. Repeated health wording is consequential because it currently conflicts, not because repetition is stylistically undesirable.
- Primary citation links are present. This review did not independently re-fetch every vendor page or claim citation verification beyond inspecting their placement and mechanism relevance.

## Exact source binding

| File | Frozen original SHA-256 | Reviewed SHA-256 |
| --- | --- | --- |
| `skills/system-design/system-design-building-blocks/SKILL.md` | `71236855db7b29b5753c059c030c092a5295839d4ee9434187779b6b4c291785` | `0a2cbfa756ca6cfb8a88012aa8ef633706d24653917cd5209488d40a0d013a9d` |
| `skills/system-design/system-design-building-blocks/references/building-blocks.md` | `b5b7eb34a3daee42223a0cd9cd72cc5b386f1585c77edb013baece5c7e4d0fe8` | `b98bf71e9d2cca472e51ed9d86ebc6d1e21b6185bc1bed67b807648712401f7d` |
| `skills/system-design/system-design-resilience-ops/SKILL.md` | `952db0997ed9c58804b22769b7f0252d07c1bfc3afa7990ac42f563b99203d33` | `482601311ae4e5b467d9da657cbaf403890cf395daa40fee46ef78c86e76351c` |
| `skills/system-design/system-design-resilience-ops/references/reliability-operations.md` | `9abb27ff728ac2afd8bff7855eb82c7d61c68c049dd791b82a044d22efb03849` | `3b131f20239a785ab4324303ef0159e9d323595a83fef03e41d984171dfbe5e0` |

Baseline revision: `92d06c420f6a41f08e11579423e4e3eacdb7880d`; originals retrieved from baseline-snapshot, not HEAD. Later owner corrections invalidate this source-qualified verdict until re-reviewed. Source author must repair; reviewer made no implementation changes. T5 discrimination, T6 integrated checks, T7 efficacy/ROI, human acceptance and release are separate pending scopes.
