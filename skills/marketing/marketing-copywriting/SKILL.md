---
name: marketing-copywriting
description: 'Drafts evidence-anchored marketing copy, announcement drafts, and documentation highlights while strictly preserving proof qualifications, source citations, and test bounds. Use when writing technical marketing copy, release announcements, or value propositions from proof registers. (triggers: `marketing copywriting`, `write marketing copy`, `proof qualification copy`, `technical copy draft`)'
guardrail: true
metadata:
  triggers:
    files: []
    keywords:
      - 'marketing copywriting'
      - 'write marketing copy'
      - 'proof qualification copy'
      - 'technical copy draft'
---

# Marketing Copywriting

## **Priority: P0 (CRITICAL)**

Draft clear, evidence-anchored technical marketing copy that strictly preserves proof qualifications, test environment boundaries, and experimental limitations, without exaggerating claims or generating unsubstantiated hype.

## 1. Capability Preflight & Claim Resolution

1. **Proof Register Binding**:
   - Every factual claim, performance benchmark, or capability statement in copy MUST bind to an approved claim ID (`claim_refs: ["CLM-xxx"]`) in `docs/product/*/evidence.json` or `docs/prd/prd-*.md`.
   - Never generate copy for unverified or speculative claims without explicit disclaimer labeling.
2. **Context Revision**:
   - Each copy artifact must declare `context_revision` linking it to the approved campaign and strategy snapshot.

## 2. Core Protocol: Proof Qualification Preservation (AC-22)

1. **Mandatory Qualification Retention**:
   - If a claim in the proof register carries qualifications, operational boundaries, or sample constraints (e.g., "offline synthetic cohorts only", "tested under Node 20+ arm64", "60–90% token reduction measured on shell command outputs", "Windows untested"), the generated copy MUST explicitly retain that exact qualification.
   - Refuse requests to strip qualifications, generalize narrow benchmarks into universal performance promises, or remove platform constraints.
2. **NOT READY & Experimental Disclosure**:
   - If a capability is marked `status: "not_ready"` or `experimental` in the proof register, the copy must explicitly state its experimental or pre-release status.
   - Never describe pre-release capabilities as "battle-tested", "production-ready", or "enterprise-grade".
3. **No ROI or Financial Invention**:
   - Never translate developer labor capacity into cash savings or claim financial ROI without verified accounting evidence.
4. **Concrete Technical Register**:
   - Use plain, precise engineering language. Avoid vague superlatives ("seamless", "revolutionary", "game-changing", "magic", "best-in-class"). State exact inputs, measured outputs, and verifiable behavior.

## 3. Proposal-Only Lifecycle

1. **Prepared State**:
   - All generated drafts must be stamped `state: "prepared"`, `action: "propose"`.
   - Automated copy generation produces reviewable proposals; it does NOT publish or release copy publicly without human approval.

## 4. Anti-Patterns & Guardrails

- **No Stripping Qualifications**: Reject any instruction to remove caveats, test bounds, or disclaimers from proof claims.
- **No Universal Upgrades**: Never turn "measured on 5 CLI commands" into "speeds up all AI agent workflows".
- **No Fake Quotes or Testimonials**: Never invent developer quotes, synthetic customer reviews, or fabricated user feedback.
- **No Unattributed Metrics**: Every numeric percentage, speedup ratio, or cost figure must link to a valid `claim_ref`.

## 5. References

- [Proof Binding](references/proof-binding.md) — Claim mapping, qualification propagation rules, and sample disclaimer schemas.
- [Copy Templates](references/copy-templates.md) — Technical announcement, feature spotlight, and documentation highlight templates.
