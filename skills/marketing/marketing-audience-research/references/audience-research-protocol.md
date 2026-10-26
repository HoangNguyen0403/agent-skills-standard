# Audience Research Protocol

## Overview

This protocol defines the procedures for gathering and structuring developer audience research within the `agent-skills-standard` framework. It enforces source provenance, consent verification, and sample limitation reporting, preventing fabricated findings or false certainty.

## 1. Provenance Classification

Every audience research data point must belong to one of two valid provenance categories:

1. **Consented Primary Notes**:
   - Recorded direct interactions (interviews, usability sessions, pilot feedback).
   - Requires explicit `consent: "granted"` from participants with `role: "external"`.
   - Participants with `consent: "absent"` or `consent: "withdrawn"` must be purged immediately from active synthesis.
2. **Publicly Documented Statements**:
   - Public GitHub issues, pull request discussions, public Discord/Discourse forums, or public technical blogs.
   - Must link to an immutable locator (URL or canonical `SRC` reference with retrieval timestamp and git commit SHA).

## 2. Proxy Research vs. Verified Customer Findings

When direct customer interviews or pilot cohorts are not available:
- **Proxy Research**: Research gathered through documentation analytics, public issue trends, search queries, or community sentiment.
- **Rule (AC-02)**: All beliefs, pain points, and behavioral hypotheses derived from proxy research must be explicitly labeled `assumption: proxy_inferred`.
- **Prohibition**: Presenting proxy-derived assumptions as "customer-verified findings" or "validated user demand" is strictly forbidden.

## 3. Sample Limitations & Bias Disclosure (AC-17)

Every audience research summary must include a structured `sample_limitations` block:
- **Sample Count**: Total number of distinct contributors or observed threads ($N$).
- **Channel Bias**: Specific forums or channels analyzed (e.g. "early-adopter AI agent developers on GitHub", "TypeScript monorepo maintainers").
- **Missing Demographics**: Segments deliberately or incidentally omitted (e.g. junior developers, closed-source enterprise teams, non-English speakers).
- **Selection Bias**: Acknowledgment of self-selection (e.g. developers filing issues are encountering problems, not a random cross-section of satisfied users).

## 4. Contradictory Evidence Handling (AC-01)

Developers often hold conflicting technical preferences:
- Retain both sides of a contradiction with scoped contexts (e.g., "teams preferring CLI-first composability vs. teams requiring GUI dashboards").
- Never discard negative or contradictory feedback to craft a clean, uniform narrative.

## 5. Privacy & Redaction

- Strip private names, email addresses, personal handles, and repository tokens before storing research artifacts in public repositories.
- Use opaque participant identifiers or anonymized contributor summaries.
