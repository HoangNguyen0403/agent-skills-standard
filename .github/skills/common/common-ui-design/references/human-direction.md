# Human Direction & Refinement Protocol

## Core Contract

When using Stitch, Stitch generates screens; AI recommends and human approves direction.
For existing designs, **polish is the default**. Restyle preserves structure and task flow. Rethink requires explicit request.
For new designs without an existing baseline, creative exploration is permitted without polish constraints, but remains anchored in brand, audience, and task.

```
AI Role:    Analyze context → Recommend bounded direction → Propose smallest effective change
Human Role: Set creative intent → Approve material changes → Hold final authority (original or preference can win)
```

## 1. Direction Brief Structure

Every refinement proposal, design critique, or creative recommendation must structure direction across these fields:

- **Audience & Task**: Who uses the interface, in what physical/cognitive context, and what primary outcome constitutes success?
- **Character Traits**: 2–3 concrete, actionable personality adjectives (e.g., "crisp, utilitarian, calm" rather than generic "modern, clean").
- **Keep**: Specific elements, layouts, tokens, or flows that work and MUST NOT be modified.
- **Change**: Specific visual or ergonomic friction points causing hierarchy breakdown, cognitive load, or brand misalignment.
- **Avoid**: Explicit aesthetic traps, clichés, anti-patterns, or unwanted design tropes.

## 2. External References & Borrowing

When providing visual references or inspirations:
- Explicitly differentiate:
  - **Borrow**: Specific, isolated mechanisms to adopt (e.g., "borrow two-column metric card layout with top-aligned delta chips").
  - **Do Not Borrow**: Associated styling to reject (e.g., "do not borrow high-saturation neon gradients or heavy drop shadows").
- External references are **never required** if available project context, brand tokens, or existing UI surfaces provide sufficient direction. Never block progress demanding moodboards when context is clear.

## 3. Refinement Tiers (Existing Designs)

When working on existing screens, classify the scope before proposing edits:

1. **Polish (Default)**:
   - Cadence, alignment, optical balance, typography scale/contrast, padding consistency, interactive state completeness.
   - Preserves information architecture, major composition, navigation, content, and behavior; allows local spacing, wrapping, and sizing adjustments.
2. **Restyle**:
   - Visual aesthetic update (color palette, typography pairings, surface elevation, radius, borders).
   - Preserves layout structure, information architecture, and task flow, without freezing pixel positions.
3. **Rethink (Explicit Request Only)**:
   - Structural reorganization of layout, information architecture, or navigation flows.
   - **NEVER** initiate a rethink without explicit user instruction.

Any material creative change (altering dominant palette, typographic hierarchy, component semantics, or layout geometry) requires **explicit human approval** before generation or code changes.

## 4. Critique & Action Loop

When evaluating or recommending changes, follow this four-step sequence:

$$\text{Observation} \longrightarrow \text{Impact} \longrightarrow \text{Smallest Change} \longrightarrow \text{Preserve Constraint}$$

1. **Observation**: State an observed fact (e.g., "Secondary action button uses identical weight and fill as primary submit button"). Distinguish verifiable visual or structural facts from unverified impact hypotheses.
2. **Impact**: Identify the hypothesized user or brand consequence (label clearly as an impact hypothesis when unverified).
3. **Smallest Change**: Propose the minimum edit that resolves the issue (e.g., "Switch secondary button to ghost/outline variant with 1px border").
4. **Preserve Constraint**: Confirm adjacent elements that remain untouched (e.g., "Preserve form layout, input heights, and primary button position").

## 5. Classification of Findings

Categorize every critique finding or suggested alteration:

| Category | Definition | Resolution Rule |
|---|---|---|
| **Defect** | Objective failure (WCAG contrast violation, broken responsive wrapping, clipped touch targets). | Must fix; prioritize highest severity. |
| **Context Concern** | Mismatch with audience workflow, domain ergonomics, or platform conventions. | Recommend fix with trade-off rationale. |
| **Taste** | Subjective aesthetic preference or alternative styling variant. | **Human judgment decides**: Human visual judgment may select or keep a variant on taste without needing objective clarity proof; record preference and preserve it. The original baseline also wins if the human prefers it. |

## 6. Attributions & Selective Inspiration

Selected principles in this protocol are informed by:
- [Nutlope/hallmark](https://github.com/Nutlope/hallmark): Human creative direction, critique loops, and editorial refinement practices.
- [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill): Semantic design tokens, contextual recommendations, and domain-specific decision rubrics.

*(Attribution recorded as architectural inspiration, not empirical benchmark proof. No external scripts, datasets, or unconditional novelty models are imported).*
