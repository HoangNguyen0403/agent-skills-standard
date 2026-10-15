# Product Experimentation Protocol

## Priority: P0 (CRITICAL)

This document establishes the experimentation method for designing, governing, and interpreting product experiments within `agent-skills-standard` under t01-v2.

---

## 1. Core Principles

1. **Falsifiability & Clear Predictions**:
   - Every experiment must test a clear, falsifiable hypothesis (`HYP` record).
   - Define the prediction, causal mechanism, and unambiguous disconfirmation criteria matching normative ledger schema.
2. **Precommitment of Decision Thresholds**:
   - Success, failure, and inconclusive thresholds must be established in `rules: { success, failure, inconclusive }` *before* any exposure or data collection begins.
   - Modifying thresholds after observing initial data ("p-hacking", moving goalposts) is strictly prohibited.
3. **Primary Metric vs Guardrails**:
   - Designate exactly one primary decision metric (`MET` ref `{id, revision}`).
   - Define explicit guardrail metrics (`guardrails: [{id, revision}]`).
   - A guardrail breach overrides primary-metric gains and requires an immediate stop proposal/decision. Execute a production halt only through preauthorized authenticated host/operator controls.
4. **Finite Exposure, Budget, and Duration**:
   - Every experiment must define strict bounds in `bounds`:
     - `starts_at` and `ends_at` (UTC ISO timestamps, `starts_at < ends_at`).
     - `exposure_cap`: Finite safe integer ($\ge 0$).
     - `budget_cap`: Unsigned decimal string with $\le 4$ fractional digits.
     - `currency`: 3 uppercase ASCII letters (required if budget_cap is non-null).
     - `stop_rules`: Nonempty array of explicit stop conditions.
5. **Ethical Eligibility & Stop Rules**:
   - Verify ethical eligibility: no deceptive patterns, no exploitative harm, informed consent where applicable.
   - Pre-commit automated stop rules for severe regressions or ethical breaches.

---

## 2. Authorization and Lifecycle Isolation

1. **Ledger Eligibility vs Host Authorization**:
   - An authorized experiment plan (`status: "authorized"`) in the ledger records that the experiment is eligible for execution.
   - Ledger eligibility does NOT constitute live permission or authorization to modify production traffic, alter feature flags, or spend company funds.
   - Live changes require authenticated host/operator control. If host execution capability is unavailable, provide a proposal/handoff.
   - An approver name or role listed in JSON metadata does NOT constitute executive authorization without verified ledger authority binding (`AUTH` record).
2. **Frozen Plan vs Lifecycle Evolution**:
   - The experiment design (`EXP` record) represents an immutable plan binding.
   - Results and observations are recorded in separate observation/metric records (`MET`/`SRC`). Completed experiments populate `EXP.result: { classification, sources, limitations }`.
   - Any material change to the hypothesis prediction, exposure cap, telemetry query, or guardrails invalidates the prior plan and requires a new authorized experiment revision.

### Frozen authorization, current result, and evidence chain

- Preserve the complete authorized plan snapshot as a separately retained artifact with a recorded SHA-256 binding. The hash must identify that plan, not the later-mutated whole ledger.
- For lifecycle evolution, retain complete prior HYP/EXP/MET revisions in `record_history`; keep the original recorded authorization DEC current and unchanged. Exact `(id, revision)` pairs resolve only to the matching snapshot.
- Compare frozen EXP/HYP/MET plan-role projections, including the exact `depends_on` projection. A changed prediction, query, primary/guardrail, rule, budget, exposure, scope, or plan dependency is material: create a new EXP revision and new authorization DEC ID; do not reuse an earlier approval.
- A completed result requires observed primary and every guardrail MET, current query and baseline/source support, and a result source for each finding. Bind all `result.sources` and metrics through typed refs and dependencies. The investment recommendation is advisory and must consume the supported result chain; it cannot claim finance, host, or customer authority.
- Never treat a recorded ledger authorization as live host permission, consent, production access, exposure, or spend.
4. **Immutable Decision Lineage**:
   - Once recorded, a decision record (`DEC`) is immutable.
   - Changes to direction are recorded through a new decision record referencing the prior decision via `supersedes: {id, revision}`.

---

## 3. Decision Routing Matrix

When an experiment concludes or a stop rule triggers, separate immediate operational safety from the permitted ledger decision type:

| Experiment Outcome | Evidence State | Required Decision Route | Prohibited Action |
| --- | --- | --- | --- |
| **Supported / Success** | Primary metric meets precommitted threshold; all guardrails respected. | Propose investment review (`DEC` purpose: `"investment"`, outcome: `"propose"`). Requires separate human budget authority. | Do NOT auto-deploy or declare full build approved. |
| **Refuted / Failure** | Primary metric fails to meet threshold, or hypothesis disconfirmed. | Recommend stopping further experiment activity or bounded iteration. A proposed experiment/learning DEC may use `propose`, `defer`, or `reject`; `stop` is not valid with `purpose: "experiment"`. Record a `purpose: "value_review", outcome: "stop"` only when its required strategy binding, authority, and artifact proof exists; otherwise retain a proposal and name the missing proof. | Do NOT re-run with loosened thresholds or fabricate a recorded stop decision. |
| **Inconclusive** | Insufficient power, statistical noise, or ambiguous effect. | Bounded further learning or deferral (`DEC` purpose: `"learning"`, outcome: `"defer"`). | Do NOT treat absence of negative evidence as proof of success. |
| **Guardrail Breach** | Any guardrail metric breached regardless of primary metric. | Immediately halt through verified preauthorized host/operator control, or urgently hand off a stop proposal. Record an actual halted EXP with its retained evidence and required authorization where applicable. A value-review stop DEC requires its complete proof; otherwise leave it proposed. | Do NOT claim automated execution/rollback, record an experiment-purpose `stop`, or ignore guardrail harm. |

---

## 4. Anti-Patterns & Red Flags

- **No Moving Thresholds**: Never adjust success criteria after viewing preliminary data.
- **No Unconditional Full Build**: Never claim an experiment result directly authorizes full production build.
- **No Proxy as Truth**: Never mistake leading proxy metrics (clicks, sign-ups) for durable retention or product value.
- **No Uncapped Exposure**: Never run an experiment without hard limits on user exposure, spend, and duration.
- **No Conflating Eligibility with Host Permission**: Never treat a ledger state as authorization to modify production without host control.
