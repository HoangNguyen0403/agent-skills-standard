---
name: marketing-positioning
description: 'Formulates developer-focused product positioning grounded in verified evidence, competitive alternatives including DIY/do-nothing, and explicit target segments. (triggers: `marketing positioning`, `developer tool positioning`, `product positioning framework`)'
guardrail: true
metadata:
  triggers:
    files: []
    keywords:
      - 'marketing positioning'
      - 'developer tool positioning'
      - 'product positioning framework'
      - 'competitive differentiation'
---

# Marketing Positioning

## **Priority: P0 (CRITICAL)**

Articulate sharp, evidence-backed positioning for developer tools. Anchor differentiation in verified claims, name precise target segments, mandate DIY and do-nothing alternatives, and preserve proxy assumption caveats.

## 1. Capability Preflight

Verify consumed PM capabilities and evidence inputs before drafting positioning:
1. **Consumed Capabilities Resolution**:
   - Check `product-market-research` and `product-strategy` via MCP (`get_skill("product-management", "product-market-research")`, `get_skill("product-management", "product-strategy")`) or installed root `<root>/product-management/{product-market-research,product-strategy}/SKILL.md` (ordinary) / `<root>/product-management-{product-market-research,product-strategy}/SKILL.md` (flattened).
   - Check `product-evidence` via MCP (`get_skill("product-management", "product-evidence")`) or installed root `<root>/product-management/product-evidence/SKILL.md`.
   - Missing or excluded skill is an explicit capability gap; never infer installation from monorepo source checkout.
2. **Companion Resource**: Check `scripts/validate-product-evidence.mjs` relative to resolved `product-evidence`. Missing companion is a resource gap.
3. **Evidence Distinction**:
   - Distinguish missing capability (tooling absent) from missing evidence (no verified `CLM` or `OPP` records in `docs/product/<slug>/evidence.json`).
   - If either capability or evidence is missing, positioning proceeds strictly as `status: "proposal_hypothesis"` (unvalidated).
   - No auto-install, no ambient network fetching, no simulated validation, and no silent repo fallback.

## 2. Core Protocol

1. **Target Segment Definition**:
   - Define the primary developer audience with surgical specificity (workflow, language ecosystem, team constraints).
   - Explicitly list non-target developer segments to maintain focus and avoid generic appeal.
2. **Mandatory DIY & Do-Nothing Alternatives (AC-18)**:
   - Every positioning framework MUST evaluate DIY / do nothing / custom shell scripts / ad-hoc manual procedures as primary competitors alongside commercial or open-source alternatives.
   - Contrast value against what developers already do before introducing new tooling.
3. **Evidence-Qualified Differentiation (AC-18)**:
   - Ground every competitive differentiator in verified claim records (`CLM` refs) or benchmark evidence.
   - Forbid unsubstantiated superlatives ("fastest", "only", "universal").
   - Retain known operational boundaries and limitations within differentiating statements.
4. **Proxy Assumption Inheritance (AC-02)**:
   - When positioning is based on proxy research without customer interviews, preserve `assumption: proxy_derived` labels on audience beliefs.
   - Never convert upstream assumptions into established market facts.
5. **Positioning Synthesis**:
   - Synthesize category framing, differentiated value proposition, and reasons to believe into a structured canvas.

## 3. Anti-Patterns & Red Flags

- **No "For All Developers"**: Reject universal positioning that claims to solve all problems for all teams.
- **No Ignoring DIY**: Never omit "do nothing" or custom bash/python scripts from competitive alternatives.
- **No Unsubstantiated Superlatives**: Reject claims of "the best" or "100% automated" without comparative benchmarks.
- **No Score-to-ROI Conversion**: Never claim high positioning alignment proves financial ROI.

## 4. References

- [Positioning Protocol](references/positioning-protocol.md) — Framework for evidence-grounded developer positioning.
- [Positioning Canvas Template](references/positioning-canvas-template.md) — Canvas template capturing segment, alternatives, and claims.
