---
name: marketing-proof
description: 'Audits and verifies marketing claims against dated sources, benchmark evidence, and caveats. Rejects universal claims and preserves NOT READY limitations and contradictions. (triggers: `marketing proof review`, `marketing claim verification`, `evidence proof register`)'
guardrail: true
metadata:
  triggers:
    files: []
    keywords:
      - 'marketing proof review'
      - 'marketing claim verification'
      - 'evidence proof register'
      - 'marketing substantiation'
---

# Marketing Proof

## **Priority: P0 (CRITICAL)**

Audit, verify, and substantiate developer marketing claims against reproducible evidence. Reject universal performance superlatives, retain source limitations and contradictory data, enforce immutable context revisions, and forbid vanity metrics as retention proof.

## 1. Capability Preflight

Verify consumed PM capabilities and evidence sources before validating claims:
1. **Consumed Capabilities Resolution**:
   - Check `product-evidence` via MCP (`get_skill("product-management", "product-evidence")`) or installed root `<root>/product-management/product-evidence/SKILL.md` (ordinary) / `<root>/product-management-product-evidence/SKILL.md` (flattened).
   - Missing or excluded skill is an explicit capability gap; never infer installation from monorepo source checkout.
2. **Companion Resource**: Check `scripts/validate-product-evidence.mjs` relative to resolved `product-evidence`. Missing companion is a resource gap.
3. **Evidence Distinction**:
   - Distinguish missing capability (tooling absent) from missing evidence (`docs/product/<slug>/evidence.json` absent or candidate claim lacks dated `SRC` / benchmark runs).
   - If either capability or evidence is missing, claims proceed strictly as `status: "unsubstantiated_proposal"`.
   - No auto-install, no ambient network fetching, no simulated validation, and no silent repo fallback.

## 2. Core Protocol

1. **Proof Register Maintenance**:
   - Register each proposed claim with required fields: `claim_id`, `statement`, `context_revision`, `source_ref` (`SRC` reference and revision), `status` (`verified`, `qualified`, `rejected`, `unsubstantiated`), `scope_limitations`, and `contradictions`.
2. **Universal Performance Rejection (AC-19)**:
   - Forbid universal claims (e.g. "works with every LLM", "100% token savings across all environments", "zero bugs").
   - If a benchmark or test report indicates `not_ready`, partial failure, or platform constraints, reject any universal phrasing and require strict qualification of scope.
3. **Contradictory Evidence Retention (AC-01)**:
   - When evidence contains contradictory observations (e.g. tool succeeds on bash commands but fails on interactive curses apps), retain both the capability and the contradiction in the proof record. Never suppress negative evidence to project certainty.
4. **Consistent Context Revision Binding (AC-03)**:
   - Ensure all claims approved for campaign copy link to the exact same `context_revision`. Prevent claim drift where claims reference differing, incompatible product versions.
5. **No Stars as Retention or Capacity as Cash**:
   - Reject GitHub star counts, repository forks, or download spikes as proof of user retention, satisfaction, or product quality.
   - Forbid claiming developer hours saved as cash cost reduction or ROI proof without explicit finance-verified cash benefit proof.

## 3. Anti-Patterns & Red Flags

- **No Cherry-Picked Runs**: Never cite single-run benchmark outliers while ignoring failing runs.
- **No Overriding NOT READY**: Never promote a feature to "production ready" when readiness reports state NOT READY.
- **No Vanity Metrics as Quality**: Never use stars, social upvotes, or pageviews as evidence of retention.
- **No Dropping Caveats**: Never strip caveats, operational limits, or platform requirements from public claims.

## 4. References

- [Proof Register Protocol](references/proof-register-protocol.md) — Claim verification lifecycle, contradictory evidence, and scoping.
- [Proof Register Template](references/proof-register-template.md) — Schema and format for evidence-bound claim registers.
