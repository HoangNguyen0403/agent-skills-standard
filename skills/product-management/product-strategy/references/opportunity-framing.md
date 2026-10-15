# Opportunity Framing & Hypothesis Synthesis

This reference provides detailed rules for synthesizing opportunities (`OPP`), structuring falsifiable hypotheses (`HYP`), and formulating proposed decision recommendations (`DEC`).

## 1. Structuring Opportunity Records (`OPP`)

An opportunity articulates a meaningful customer problem framed in terms of desired progress, context, and alternatives:
- **Problem Statement**: Clear, objective description of the operational struggle or market friction, supported by verified `CLM` records.
- **Customer Job**: The underlying functional, emotional, or social progress the customer is seeking.
- **Substitutes**: All existing mechanisms customers use to address the job today (e.g., spreadsheets, competing tools, manual workarounds, or inaction). Must include `"unknown"` if not yet formally researched.
- **Alternatives**: The distinct strategic paths available to address the opportunity (e.g., build internally, partner/integrate, buy, or deliberately defer).
- **Non-Goals in Rationale**: Define explicit out-of-scope personas, platforms, and capabilities in `data.rationale`.
- **Status Lifecycle**: `candidate` -> `selected` | `deferred` | `rejected`.

## 2. Structuring Falsifiable Hypotheses (`HYP`)

A strategic hypothesis is a testable, falsifiable proposition that bridges an opportunity to an experimental or delivery initiative:
- **Prediction**: A precise statement of what will happen under specific conditions (e.g., "Automating routing number sync will reduce reconciliation error rate from 4.2% to <0.5%").
- **Mechanism**: The causal explanation of *why* the prediction should hold true (e.g., "Eliminating manual re-keying removes human transcription mistakes and copy-paste drift").
- **Supporting Claims**: References to verified `CLM` records in `depends_on`.
- **Primary Metric**: Pointer to a planned or instrumented `MET` record, or `null` during candidate discovery when metric instrumentation has not yet been designed. Never reference an undeclared `MET` ID.
- **Disconfirmation Criteria (MANDATORY)**: An explicit, pre-declared statement of what observable result will prove the hypothesis wrong (e.g., "If reconciliation error rate remains >2.0% after 30 days of active customer use, or if users revert to manual CSV export, the hypothesis is refuted").
- **Status Lifecycle**: `proposed` -> `testing` -> `supported` | `refuted` | `inconclusive`. A hypothesis can only achieve `supported` status after an authorized `EXP` has executed and confirmed the prediction.

## 3. Prioritization Scores vs. Financial Accounting (CRITICAL BOUNDARY)

Product teams frequently utilize prioritization scoring frameworks (e.g., RICE, WSJF, Kano):
- **Role of Heuristic Scores**: These frameworks are directional sorting heuristics designed to assist in backlog grooming and team discussion.
- **STRICT PROHIBITION**:
  - Never equate a RICE score or WSJF ratio to financial Return on Investment (ROI).
  - Never multiply `Reach * Impact` and label the product a "monetary benefit".
  - Never calculate Net Present Value (NPV) or Payback Period using prioritization scores.
- **Boundary**: Formal financial analysis is governed strictly by the investment evaluation contract (`product-investment`), requiring explicit monetary cash flows, price bases, and discount factors. Strategy artifacts must treat scores solely as relative ranking inputs.

## 4. Revisit Triggers & Historical Integrity (Contract §2.6)

Strategic assumptions decay over time, requiring disciplined change management:

### Distinct Trigger Fields
- **Freshness Review Triggers (`freshness.review_triggers`)**: String array on the record envelope defining operational conditions under which record freshness decays (e.g. competitor pricing change, annual benchmark update).
- **Decision Revisit Triggers (`data.revisit_triggers`)**: String array on `DEC` data payload defining strategic criteria that warrant formally reopening the decision outcome (e.g. pilot experiment refutes hypothesis, partner introduces prohibitive API fees).

### Immutable Recorded DEC Lineage Invariant
Contract §2.6 establishes that each stable ID has exactly one current row in `records`, and recorded decisions are immutable:
- **Never Rewrite Recorded DECs**: Once recorded (`status: "recorded"`), a DEC row (including revision, bindings, freshness, and payload) is strictly immutable.
- **Never Move Recorded DECs to History**: When strategic direction changes or a decision is superseded, **do NOT move `DEC-001/r1` to `record_history`**, and **do NOT duplicate it across arrays**. The original recorded DEC remains in `records`.
- **Supersession via New ID**: To supersede or revoke an existing decision, issue a **NEW decision ID** in `records` (e.g., `DEC-002/r1`) in the same purpose/scope with `supersedes: { "id": "DEC-001", "revision": "r1" }`.
- **When `record_history` Is Used**: Archive into `record_history` **only** complete prior snapshots of the *same stable ID* when a new current revision replaces them (e.g. updating revisable proposal `CLM-001/r1` to `CLM-001/r2`, or updating proposed `DEC-001/r1` to proposed `DEC-001/r2` before it is recorded).

When inputs change, reassess only influenced active decisions using the installed `product-evidence` §2.6 bounded, role-aware worklist. Do not implement a local subset: traverse all typed support pointers per kind, including CLM sources and counterevidence, OPP claims, HYP opportunity/claims/primary metric, EXP hypothesis/primary and guardrail metrics/results/authorization, INV claims/artifacts, DEC consumed/critical claims/authority/strategy/artifacts/bridges, MET query/baseline/exception, and REV hypotheses/metrics/observations/actual-costs. Apply its evidence/plan/exception roles, current/retired selection, exact scope/revision, and helper propagation.

Keep exact-pair structural resolution, acyclic `depends_on` provenance, bounded influence, and acyclic DEC supersession as separate relations. Supersession and `REV.decision` history are not current support. Preserve all counterevidence, bridges and state history; never retarget an old approval or globally invalidate unrelated decisions.
