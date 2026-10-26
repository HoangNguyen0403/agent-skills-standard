---
name: common-ui-design
description: Design distinctive, production-grade frontend UI with bold aesthetic choices. Use when building web components, pages, interfaces, dashboards, or applications in any framework (React, Next.js, Angular, Vue, HTML/CSS).
metadata:
  triggers:
    keywords:
    - build a page
    - create a component
    - design a dashboard
    - landing page
    - UI for
    - build a layout
    - make it look good
    - improve the design
    - build UI
    - create interface
    - design screen
---
# UI Design Direction

## **Priority: P0 (CRITICAL)**

Before writing any code, commit to deliberate aesthetic direction grounded in product context.

## Phase 0: Design Thinking & Direction (Pre-Code)

Answer these before touching implementation:

1. **Context & Baseline**: For existing designs, **polish is the default** (preserve structure/behavior). Restyle or rethink requires explicit request. For new designs, explore purposefully without an absent baseline constraint.
2. **Audience & Task**: Who uses the interface, under what conditions, and what constitutes task success?
3. **Character & Tone**: Define 2–3 concrete traits grounded in brand and domain (e.g., utilitarian, editorial, refined, playful, minimal) — intentionality, not extreme novelty, is key.
4. **Visual Purpose**: Ensure visual choices support task clarity; a restrained, coherent neutral design is fully valid when justified by utility and domain.

## Aesthetic Dimensions

### Typography

- Match typography to brand personality and platform conventions. Platform typography (`system-ui`, SF Pro, Roboto, Segoe UI) is valid for high-density, utility-first interfaces; pair distinctive display + refined body fonts when brand identity demands character.
- Ensure readable type scale, robust hierarchy, and accessible line lengths.
- Self-host web fonts via framework loaders or `@font-face` — never use CDN `<link>` in production.
- See [Font Pairing & Tone Examples](references/tones.md)

### Color & Theme

- Deliberate color system: dominant brand tone + semantic states, with an accent or restrained neutral palette suited to the task.
- Ground mode choice (light, dark, high-contrast) in audience ergonomics, task lighting, and brand requirements.
- Use CSS custom properties (`--color-primary`, `--color-accent`) for consistent token binding.
- Ensure WCAG AA contrast compliance across all text and interactive states.

### Spatial Composition & Depth

- Structure spatial density by purpose: generous negative space for focus; controlled density for data tools.
- Grid breaks and asymmetry must serve information flow, never decorative gimmickry.
- Backgrounds and depth: choose functional surfaces (crisp neutrals for reading clarity, layered depth and subtle borders for elevation) aligned with tone. Avoid unconsidered solid fills and gratuitous textures alike.

### Motion

- One well-orchestrated entrance or transition > scattered micro-interactions.
- CSS-first: `@keyframes`, `transition`, `animation-delay`; motion libraries only for complex choreography.
- Always respect `prefers-reduced-motion`.
- See [Motion Patterns](references/motion.md)

## Human Direction & Refinement

- **Existing Designs**: Default to **Polish** (fix spacing, contrast, alignment). Keep layout and behavior intact.
- **Creative Changes**: Material creative shifts require **explicit human approval**.
- **Critique Loop**: Follow `Observation → Impact → Smallest Change → Preserve Constraint`.
- **Classification**: Distinguish defects (must fix), context concerns (recommend), and taste (human judgment decides; original or preference can win without objective clarity proof).
- When using Stitch, Stitch generates screens; AI recommends and human approves direction.
- See [Human Direction & Refinement Protocol](references/human-direction.md)

## Anti-Patterns

- **No ungrounded novelty**: Do not force extreme brutalism or decorative chaos onto utility-first tools.
- **No unreasoned style bans or defaults**: Do not ban colors (e.g. brand-appropriate purple) or force gratuitous accents; ground palette decisions in task and brand rationale rather than cliché.
- **No unapproved restyle**: Never dismantle existing layouts without explicit human direction.
- **No scattered animations**: Avoid random hover effects; keep transitions cohesive and functional.
- **No inaccessible styling**: Never compromise readability, touch targets, or contrast for aesthetic flair.

## References

- [Human Direction & Refinement Protocol](references/human-direction.md) — load for refinement briefs, borrow/avoid rules, and critique loops
- [Tone Palette & Font Pairings](references/tones.md) — load when choosing aesthetic direction or fonts
- [Motion Patterns](references/motion.md) — load when implementing animations or transitions

## Canonical response anchors

When this skill applies, preserve the following domain terminology or equivalent concrete examples in the answer when relevant:
- aesthetic

- Additional task-grounded exact anchors: typography
