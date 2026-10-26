---
name: marketing-audience-research
description: 'Conducts evidence-based developer audience research from consented notes and public statements without fabricated interviews. Maps pain points, sample limitations, and proxy assumptions. (triggers: `marketing audience research`, `developer audience discovery`, `audience problem mapping`)'
guardrail: true
metadata:
  triggers:
    files: []
    keywords:
      - 'marketing audience research'
      - 'developer audience discovery'
      - 'audience problem mapping'
      - 'customer research synthesis'
---

# Marketing Audience Research

## **Priority: P0 (CRITICAL)**

Synthesize developer audience insights anchored strictly in verifiable public statements or consented research notes. Explicitly identify sample limitations, distinguish customer findings from proxy assumptions, and forbid fabricated quotes or interview data.

## 1. Capability Preflight

Verify consumed PM capabilities and evidence infrastructure before synthesizing audience findings:
1. **Consumed Capabilities Resolution**:
   - Check `product-customer-discovery` via MCP (`get_skill("product-management", "product-customer-discovery")`) or installed root `<root>/product-management/product-customer-discovery/SKILL.md` (ordinary) / `<root>/product-management-product-customer-discovery/SKILL.md` (flattened).
   - Check `product-evidence` via MCP (`get_skill("product-management", "product-evidence")`) or installed root `<root>/product-management/product-evidence/SKILL.md`.
   - Missing or excluded skill is an explicit capability gap; never infer installation from monorepo source checkout.
2. **Companion Resource**: Check `scripts/validate-product-evidence.mjs` relative to resolved `product-evidence`. Missing companion is a resource gap.
3. **Evidence Distinction**:
   - Distinguish missing capability (tooling absent) from missing evidence (`docs/product/<slug>/evidence.json` absent or no consented data).
   - If either capability or evidence is missing, safe analysis proceeds strictly as `status: "proposal"` (unvalidated).
   - No auto-install, no ambient network fetching, no simulated validation, and no silent repo fallback.

## 2. Core Protocol

1. **Consent & Sourced Provenance**:
   - Ingest only participants with explicit consent (`consent: "granted"`) or publicly documented statements (e.g. public GitHub issues, public forum threads).
   - Reject unconsented private notes, withdrawn participant records, and anonymous speculation.
   - Forbid fabricating interviews, surveys, persona quotes, or statistical percentages.
2. **Proxy Assumption Labeling (AC-02)**:
   - When primary customer interviews are absent and research relies on proxy data (e.g. issue trackers, search queries, documentation feedback), label all audience beliefs as `assumption: proxy_inferred`.
   - Never present proxy assumptions as verified customer findings.
3. **Sample Limitations & Selection Bias (AC-17)**:
   - Every audience synthesis must publish an explicit `sample_limitations` section detailing sample size, source channel bias, geographic concentration, and underrepresented developer segments.
4. **Contradictory Evidence & Scope (AC-01)**:
   - Retain conflicting developer feedback and dissenting workflows with explicit scope boundaries. Never average out or dismiss contradictory evidence to present false consensus.
5. **Problem Statement Mapping**:
   - Formulate friction points as falsifiable problem statements linked to specific source records (`SRC` references or public URLs).

## 3. Anti-Patterns & Red Flags

- **No Fabricated Interviews**: Never invent quotes, interview sessions, or developer personas.
- **No Proxy as Fact**: Never label proxy observations or developer hunches as verified customer findings.
- **No Unbounded Generalization**: Never claim audience findings represent "all developers" without representative sample proof.
- **No Identifier Leaks**: Never leak private participant keys, personal emails, or company credentials in public research artifacts.

## 4. References

- [Audience Research Protocol](references/audience-research-protocol.md) — Consent validation, proxy classification, and bias disclosure.
- [Audience Segment Template](references/audience-segment-template.md) — Standard structure for evidence-grounded developer segments.
