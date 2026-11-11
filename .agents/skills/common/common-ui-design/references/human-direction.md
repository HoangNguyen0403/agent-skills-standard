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

## 4. Rendered Critique & Action Loop

When evaluating or recommending changes, inspect actual screenshots and rendered viewports across relevant project viewports (such as the default benchmark viewports defined by `common-web-visual-testing`: desktop 1440×900, tablet 768×1024, mobile 375×812, 200% desktop zoom, or project-specific viewports). Record the specific element, region, viewport, and interactive state (default, hover, focus, completed receipt, error).

Follow this four-step sequence:

$$\text{Observation} \longrightarrow \text{Impact} \longrightarrow \text{Smallest Change} \longrightarrow \text{Preserve Constraint}$$

1. **Observation**: State an observed fact anchored to a specific rendered region and state (e.g., "Secondary action button uses identical background fill and weight as primary submit button in the mobile checkout viewport"). Distinguish verifiable visual or structural facts from unverified impact hypotheses.
2. **Impact**: Identify the hypothesized user or brand consequence (label clearly as an impact hypothesis when unverified, e.g., "Hypothesis: users may hesitate or trigger accidental cancellations due to equal visual weight").
3. **Smallest Change**: Propose the minimum edit that resolves the issue (e.g., "Switch secondary button to ghost/outline variant with 1px border").
4. **Preserve Constraint**: Confirm adjacent elements that remain untouched (e.g., "Preserve form layout, input heights, and primary button position").

### Three Distinct Delivery Outcomes

Delivery evidence must strictly separate three distinct outcomes:
1. **Functional Verification**: Automated smoke tests, keyboard navigation, form calculations, and recovery flow checks prove the interface operates correctly. This never establishes visual quality or aesthetic acceptance.
2. **Human Visual Acceptance**: Explicit maintainer or stakeholder review of rendered composition, hierarchy, tone, and brand fit. An automated agent cannot supply this acceptance.
3. **Model Efficacy**: Controlled, blinded empirical comparison across models and runs. A single refined demonstration or hand-crafted example does not demonstrate general model improvement.

## 5. Product-Specific Judgement Protocol

Apply product-grounded critique rather than an abstract aesthetic recipe or universal rubric:

1. **Demonstrated Product Proof**: Ask what real operational rule, workflow mechanism, or data outcome a visual, copy claim, or interactive affordance communicates. Flag misleading proof — fabricated metrics, simulated activity, or mock UI presented as working capability. Intentional decorative or illustrative imagery is legitimate when it serves atmosphere, tone, or orientation; judge its communicative role and require it to be recognisable as illustration rather than claimed capability. Not every graphic must prove an operational rule.
2. **Copy Truth & Claim Discipline**: Distinguish verifiable product facts (concrete features, demonstrated metrics, supported integrations) from marketing hypotheses or ungrounded overclaims. Critique whether copy accurately reflects product reality without inflating capability.
3. **Composition & Evidence Hierarchy**: Organize visual density, negative space, and focal rhythm around user task completion and evidence hierarchy rather than rigid template symmetry. Visual prominence must align with operational importance.
4. **Preserve Justified Conventions**: Allow familiar colors (including brand-appropriate accents), container cards, platform typography, and established navigation patterns when justified by the user task or domain ergonomics. Do not reflexively ban conventions as "generic" or mandate novelty for novelty's sake.
5. **Separate Evidence from Taste & Preference**: Distinguish verifiable defects (objective accessibility or contrast failures) and evidenced usability concerns from aesthetic preference. The maintainer or owner holds final aesthetic authority; their preference can accept the baseline or choose an alternative without needing empirical justification. Automated scores or agent ratings NEVER override human aesthetic judgment or unresolved defects. A justified no-change outcome is fully valid.

## 6. Classification of Findings

Categorize every critique finding or suggested alteration:

| Category | Definition | Resolution Rule |
|---|---|---|
| **Defect** | Objective failure (WCAG contrast violation, broken responsive wrapping, clipped touch targets, lost keyboard focus). | Must fix; prioritize highest severity. |
| **Context Concern** | Mismatch with audience workflow, domain ergonomics, or platform conventions. | Recommend fix with trade-off rationale. |
| **Taste** | Subjective aesthetic preference or alternative styling variant. | **Human judgment decides**: Human visual judgment may select or keep a variant on taste without needing objective clarity proof; record preference and preserve it. The original baseline also wins if the human prefers it. |

## 7. Concrete Decision Examples (Bad → Better)

### Example 1: Harbor Workshops Receipt (Hierarchy & Surface Simplification)
- **Context**: Confirmation view after reservation submission.
- **Bad (Observed Nested Surfaces & Redundant Labels)**: Multi-layered bordered containers (`.confirmation-card`, `.confirmation-banner`, `.receipt-list`, and row dividers); redundant labeling where both label and value repeat the same descriptor (label "Booking Reference" paired with value "Reference: HW-204", and label "Amount" paired with value "Total: $30"); nested container borders compete with the confirmation heading.
- **Better (Clean Hierarchy & Exact Preservation)**:
  - *Hierarchy & Surfaces*: Reduce unnecessary nested bordered containers to a single cohesive receipt surface with crisp row dividers.
  - *Clarity*: Remove only the optional duplicate labels that repeat a value's own descriptor (the "Booking Reference" label wrapping `Reference: HW-204`, and the "Amount" label beside `Total: $30`); keep the required value strings themselves intact.
  - *Preservation*: Retain the exact required content — `Reference: HW-204`, guest name, party size of 2 attendees, email, `Total: $30` — the disclosure notice, and the focus destination (the "Reservation confirmed" heading is a semantic, focusable heading that receives focus once the receipt is revealed). No optional duplicate labels are required. Do not invent new actions (no cancel/change buttons).

### Example 2: Relay Courier Dispatch (Responsive Ergonomics & Structural Restraint)
- **Context**: Dispatch table on mobile viewports (e.g., 375×812).
- **Bad (Observed Layout Friction)**: Desktop table content measures 647px within a 341px visible container width; table columns force horizontal clipping, shipment IDs wrap across lines after "R-", and the status, ETA, and detail action sit outside the visible area with no discoverable way to reach them.
- **Better (Ergonomic Access & Structural Restraint)**:
  - *Ergonomic Access*: Retaining a natively horizontally scrolling table is fully valid; make the scroll affordance discoverable (e.g., a persistent scrollbar or an edge cue) so the offscreen columns are reachable without guessing.
  - *Preserve Structure*: Retain existing data fields (Shipment ID, Customer, Region, Status, ETA), existing non-color-only status badges, and search/filter controls. Any structural reorganization from table to cards requires explicit user approval under the Restyle/Rethink boundary; do not invent new barcodes, addresses, or action buttons.
## 8. Attributions & Selective Inspiration

Selected principles in this protocol are informed by:
- [Nutlope/hallmark](https://github.com/Nutlope/hallmark): Human creative direction, critique loops, and editorial refinement practices.
- [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill): Semantic design tokens, contextual recommendations, and domain-specific decision rubrics.

*(Attribution recorded as architectural inspiration, not empirical benchmark proof. No external scripts, datasets, or unconditional novelty models are imported).*
