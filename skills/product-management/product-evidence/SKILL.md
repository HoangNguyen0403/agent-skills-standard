---
name: product-evidence
description: Ground and validate SDLC product decisions with canonical evidence ledgers, immutable recorded decisions, typed provenance, and scoped action gates. Use when inspecting, maintaining, or validating product evidence ledgers.
guardrail: true
metadata:
  triggers:
    files:
      - 'docs/product/*/evidence.json'
    keywords:
      - 'product evidence ledger'
      - 'product decision authority'
      - 'product evidence freshness'
---

# Product Evidence Ledger Standard

## **Priority: P0 (CRITICAL)**

Decisions must be grounded in versioned local evidence, immutable recorded decisions, and explicit authority bridges. Validation yields structural integrity and host-check eligibility, never autonomous action consent.

## Core Rules

1. **One Versioned Ledger**: Maintain initiative evidence at `docs/product/<slug>/evidence.json`. Point readable views to ledger IDs; never duplicate editable records.
2. **Exact Snapshot Identity**: Every stable entity has one current row in `records` or `authorities`. Historical bindings resolve in `record_history` or `authority_history` at exact `(id, revision)` pairs, never to current implicitly.
3. **Nine Disjoint Record Kinds**:
   - `SRC`: External/local origin, license, retrieval instant, and privacy constraints. Status is `available|unavailable|withdrawn`. Origin scope is a full Scope object.
   - `CLM`: Falsifiable statement, classification (`confirmed|inference|assumption|unknown`), and counterevidence.
   - `OPP`: Customer job, problem, alternatives, and substitutes.
   - `HYP`: Opportunity, prediction, mechanism, metric, and disconfirmation criteria.
   - `EXP`: Predeclared bounds, exposure, method, rules, and recorded authorization.
   - `INV`: Analyzed alternatives, financial artifacts, and accounting rationale.
   - `DEC`: Immutable recorded decisions; purpose, scope, authority, and bindings.
   - `MET`: Measurement definition, denominator, exact query-origin revision, baseline window, and lifecycle-specific baseline or exception.
   - `REV`: Post-release attribution, actual costs, observations, and recommendations.
4. **Three Separate Relations**:
   - Structural resolution validates exact retained pairs across the union.
   - Explicit `depends_on` forms an acyclic provenance DAG.
   - Bounded `influence` evaluates support worklists across three roles (`evidence`, `plan`, `exception`), allowing legal descriptive cycles.
5. **Immutable Recorded Decisions**: Recorded DECs are immutable. Supersession or revocation uses a new DEC ID; never overwrite an existing recorded row.
6. **Scoped Action Gates**:
   - `structural`: Shape, integrity, pair resolution, and DAG acyclicity check.
   - `experiment`: Validates experiment proposal against authorized learning DEC.
   - `commit`: Verifies investment authorization and business bridge to BRD objective.
   - `release`: Verifies metric baselines or scoped risk-accepted exceptions.
7. **Human Authority Boundary**: Attribution in JSON is not proof of host authorization. Missing authority permits `proposal_only`, never autonomous execution.

## Gate Boundaries

- `validating` requires a scoped recorded learning/experiment `authorize`; `validated_for_scope` requires linked completed supported EXP evidence and investment `authorize`. Every State HYP reference must be an exact current pair; plan lifecycle compatibility never repairs stale State references.
- Investment `risk_accept` records explicit uncertainty and rationale; it never changes unvalidated/inconclusive evidence into validated proof. Any recorded action requiring approval also requires a current available scoped authority pair; nullable DEC pairs are structurally valid but cannot prove approval.
- Experiment eligibility requires the exact or plan-compatible retained EXP projection, then validates the current selected authorization, finite bounds, and queried primary/guardrail metrics. Any reached MET baseline_exception is traversed and checked as exact current release risk_accept support; it waives only the baseline source, never current query/source/guardrail support.
- Missing selected DEC/INV artifacts are proof gaps; actual I/O faults and depth overflow are global errors. Dependency and supersession depth checks include all current and retained historical rows. Do not suppress them as “missing evidence.”
- Output always keeps `valid`, `readiness`, `effective_product_state`, `affected_decisions`, complete issue tuples, and the three permanent limitations.

## Verification Workflow

- Invoke standalone resource package-relatively:
  - Standard agent layout:
    ```bash
    node <agent-skill-root>/product-management/product-evidence/scripts/validate-product-evidence.mjs docs/product/<slug>/evidence.json --authority-root <abs-path> --as-of <UTC-instant> --gate <gate>
    ```
  - Flattened / Kiro layout:
    ```bash
    node <agent-skill-root>/product-management-product-evidence/scripts/validate-product-evidence.mjs docs/product/<slug>/evidence.json --authority-root <abs-path> --as-of <UTC-instant> --gate <gate>
    ```
- Exit codes: `0` eligible/coherent, `1` structural error, `2` invocation/IO/limit/version error, `3` action gap, `4` internal error.
- Verify that obsolete bindings, expired evidence, or changed artifact hashes flag only consumed decisions (`affected_decisions`), leaving unaffected decisions intact.

## Anti-Patterns

- **No Newest-Wins Overwrites**: Never mutate recorded DEC bytes or replace historical refs silently.
- **No Autonomous Execution**: Never treat valid structural schema as execution authority.
- **No Unscoped Invalidation**: Never mark unaffected decisions invalid when unrelated sources change.
- **No Synthetic Truth**: Never cite synthetic examples as real customer observations.

## References

- [Ledger Contract](references/ledger-contract.md)
- [Authority and Freshness](references/authority-and-freshness.md)
- [Synthetic & Adversarial Examples](references/examples.md)
