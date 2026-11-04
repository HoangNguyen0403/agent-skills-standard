---
name: marketing-landing
description: 'Audits landing page UX, message hierarchy, conversion pathways, and responsive DOM layouts against observed desktop and mobile evidence. Produces falsifiable conversion hypotheses without inventing baseline conversion loss or assuming telemetry. Use when diagnosing landing page performance, evaluating CTA visibility, or auditing responsive conversion funnels. (triggers: `landing page audit`, `conversion pathway diagnosis`, `responsive landing review`)'
guardrail: true
metadata:
  triggers:
    files: []
    keywords:
      - 'landing page audit'
      - 'conversion pathway diagnosis'
      - 'responsive landing review'
      - 'landing CTA hierarchy'
---

# Marketing Landing Page Audit Standard

## **Priority: P1 (HIGH)**

Diagnose developer-facing landing pages using empirical surface observations, viewport-specific layout inspection, and grounded conversion hypotheses. Never invent conversion loss, fabricated bounce rates, or phantom baseline drops when analytics are unconfigured or absent.

## Core Rules

1. **Empirical Surface Evidence**:
   - Audit findings must anchor to observed DOM elements, selectors, layout regions, and viewport geometry captured from the page under audit. Never substitute assumed section names or another product's component paths.
   - Evaluate across target viewport boundaries (e.g., target desktop $\ge 1280 \times 800\text{ px}$ and target mobile $\le 390 \times 844\text{ px}$, or requested project breakpoints).
2. **Testable Hypotheses Over Invented Loss (AC-23)**:
   - When conversion baseline is unknown (`baseline_unknown`), never fabricate drop-off percentages, bounce metrics, or lost pipeline revenue.
   - Frame diagnostic findings as falsifiable conversion hypotheses with clear rationale, proposed UI variation, proxy indicator, and review trigger.
3. **Zero-Telemetry Graceful Degradation**:
   - Primary user pathways (reading docs, copying CLI commands, navigating sections) must remain fully operable when telemetry transport is absent, blocked, or disabled.
   - Verify that CTA button interactions and clipboard helpers execute without relying on background analytics pings.
4. **Prepared / Proposal-Only Output (AC-04)**:
   - Landing page audit reports and layout recommendations are prepared drafts by default and cannot authorize production changes.
   - Do not directly mutate production website code or deployment configurations; procedural guidance prepares proposals for human web owner review.
5. **Measurement Alignment**:
   - Integrate with `marketing-measurement` metric definitions (`MET-001` through `MET-005`). Never confuse landing page visits or CTA impressions with verified user activation.

## Audit Workflow

1. **Inspect Viewports**: Evaluate desktop multi-column balance and mobile stacked hierarchy (drawer navigation, button tap target sizing $\ge 44 \times 44\text{ px}$).
2. **Trace Primary CTA**: Confirm visibility and one-click execution of the core action (e.g. CLI install command copy).
3. **Check Proof Binding**: Verify that capability claims on the landing page link to verified reference documentation or reproducible benchmarks.
4. **Formulate Hypotheses**: Format each diagnostic item as:
   `Observation` $\to$ `Falsifiable Hypothesis` $\to$ `Proposed Variation` $\to$ `Measurable Proxy Metric`.

## Anti-Patterns

- **No Invented Conversion Drops**: Never declare "the hero has a 40% bounce rate" without empirical telemetry.
- **No Telemetry-Dependent Core UX**: Never break CLI copy buttons if analytics endpoints fail.
- **No Vanity Metric Substitution**: Never equate total page hits to product adoption.

## References

- [Landing Audit Protocol](references/landing-audit-protocol.md) — Viewport checklists, hypothesis templates, and degradation gates.
