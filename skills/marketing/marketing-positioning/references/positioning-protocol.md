# Positioning Protocol

## Overview

This protocol governs the creation of developer tool positioning within `agent-skills-standard`. It mandates competitive rigor, including internal DIY alternatives, verified claim grounding, and explicit target scope.

## 1. Defining the Target Segment

Developer positioning fails when it targets "all developers" or "any software engineer".
- **Primary Segment**: Identify specific developer profile (e.g. "engineers maintaining complex multi-agent workflows using Node/TypeScript").
- **Workflow State**: Specific context where the tool operates (e.g. CI/CD automation, local CLI execution, prompt evaluation).
- **Explicit Non-Targets**: Explicitly disqualify non-matching profiles (e.g. "monolithic backend web apps with no agent components", "teams seeking no-code visual builders").

## 2. Competitive Alternatives & The DIY Imperative (AC-18)

In developer tooling, the primary competitor is rarely a direct commercial vendor; it is developer inertia:
1. **DIY / Custom Scripts**: Bash scripts, one-off Python scripts, ad-hoc regex wrappers.
2. **Do Nothing / Manual Process**: Developers manually inspecting outputs or tolerating friction.
3. **Indirect Tools**: General-purpose Linters, standard test harnesses, or built-in IDE features.
4. **Direct Competitors**: Dedicated alternative libraries or frameworks.

**Requirement**: Every positioning analysis must explicitly compare capabilities and trade-offs against DIY/do-nothing options.

## 3. Evidence-Qualified Differentiation (AC-18)

Differentiators must not rely on subjective marketing fluff:
- **Forbidden**: "The fastest, easiest, most intuitive way to build agents."
- **Required**: Evidence-qualified differentiation tied to observable behaviors or benchmarks:
  - "Provides deterministic offline 14-day cohort repeat rate calculations without server telemetry (verified by `CLM-003`)."
  - "Preserves known edge cases and immature activation exclusions rather than fabricating retention."
- **Scope Caveats**: If a capability has known constraints (e.g. "requires Node >= 20", "supports only git-based workspaces"), that caveat must accompany the differentiator.

## 4. Upstream Proxy Assumption Inheritance (AC-02)

- If input research used proxy sources rather than verified user interviews, the positioning rationale must retain the flag: `[assumption: proxy_derived]`.
- Do not drop assumption markers when passing briefs to downstream copywriters or campaign planners.

## 5. Canonical Statement Format

Use this structured format to summarize positioning:
> For **[Target Segment]** who struggle with **[Evidenced Friction]**, **[Product Name]** is a **[Category Definition]** that **[Evidence-Qualified Differentiator]**. Unlike **[DIY Scripts / Do-Nothing / Direct Alternatives]**, **[Product Name]** provides **[Reason to Believe / Proof Reference]** with **[Explicit Caveat / Boundary]**.
