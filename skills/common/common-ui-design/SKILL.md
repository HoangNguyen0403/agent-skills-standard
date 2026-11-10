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

Commit to deliberate aesthetic direction grounded in task, audience, and brand before writing code.

## Phase 0: Design Thinking & Journey Hierarchy (Pre-Code)

Answer these before choosing components or layouts:

1. **Context & Baseline**: For existing designs, **polish is the default** (preserve structure/behavior). Restyle and rethink BOTH require explicit human request and approval; restyle preserves flow and content behavior, rethink alters structure. For new designs, explore purposefully without an absent baseline constraint.
2. **Audience & Primary Journey**: Establish primary user journey, required decisions, content order, and dominant action before picking components. Reject automatic hero → equal-card → pricing templates without task purpose. Cards group genuinely independent items; never enforce generic symmetry over hierarchy.
3. **Character & Tone**: Define 2–3 concrete traits grounded in brand and domain (e.g., utilitarian, editorial, refined, playful). Intentionality over extreme novelty. Restrained neutral design is valid when utility demands it.
4. **Visual Purpose & Restraint**: Visual hierarchy must direct attention to task completion; preserve required helper text, safety notices, and keyboard focus destinations.

## Aesthetic & Design System Foundations

### Typography & Spatial Composition
- Match typography to personality and platform conventions. Platform fonts (`system-ui`, SF Pro, Roboto) are valid for high-density tools; pair distinctive display + refined body fonts when identity demands character.
- Ensure readable type scale, robust hierarchy, and accessible line lengths.
- Self-host fonts via framework loaders or `@font-face` — never use CDN `<link>` in production.
- Structure density by purpose: generous negative space for focus; compact rhythm for data. Grid breaks must serve flow, not ornament.
- See [Tone Palette & Font Pairings](references/tones.md)

### Role-Based Color, Tokens & Contrast
- **System First**: Use existing project design systems first. If absent, define minimal role-based tokens: brand accent vs semantic roles (success, warning, error, info); canvas, surface, overlay, border, focus; paired text/icon foregrounds; control radii and elevation.
- **Harmony & Relationships**: Evaluate undertones, saturation, lightness, and meaningful surface separation with visual emphasis proportional to task importance. No fixed palette ratios, color counts, or mandatory OKLCH.
- **Composited Contrast**: WCAG AA on actual browser-composited pixels for solid fills, alpha overlays, and gradients across all intermediate glyph regions and state cues (normal text ≥ 4.5:1, large text ≥ 3:1, non-text cues ≥ 3:1).
- **Theme & States**: Dark themes require independent surface/text mappings, not color inversion; respect forced colors. Non-color-only state cues (icons/text/patterns). Cover interactive states (hover, focus, pressed, disabled, loading).

### Motion
- One well-orchestrated transition > scattered micro-interactions. CSS-first; always honor `prefers-reduced-motion`. See [Motion Patterns](references/motion.md).

## Rendered Critique & Human Refinement

- **Rendered Inspection**: Critique actual screenshots and populated viewports with state and region specificity.
- **Loop**: `Observation → Impact → Smallest Change → Preserve Constraint`. Distinguish verifiable facts from impact hypotheses.
- **Classification**: Defects (must fix), context concerns (recommend), taste (human judgment decides; original or preference can win without objective proof).
- **Three Separate Delivery Receipts**: Separate functional smoke (interaction/keyboard/contract), human visual acceptance (maintainer appearance sign-off), and model efficacy (controlled empirical benchmark).
- See [Human Direction & Refinement Protocol](references/human-direction.md)

## Anti-Patterns

- **Reject unjustified template defaults**: Do not default to hero → three equal cards → pricing grid when unsupported by task.
- **No unreasoned style bans**: Do not ban colors (e.g. brand-appropriate purple), cards, or platform fonts; ground choices in task and brand.
- **No unapproved restyle/rethink**: Never dismantle existing layouts or recovery flows without explicit human direction.
- **No uncomposited contrast shortcuts**: Never test gradient/alpha contrast at endpoints alone or convey status by color alone.
- **No false equivalence**: Never treat passing automated tests as human visual acceptance or model efficacy.

## References

- [Human Direction & Refinement Protocol](references/human-direction.md) — refinement tiers, rendered critique loop, and concrete bad->better examples
- [Tone Palette & Font Pairings](references/tones.md) — role-based tokens, color harmony, compositing rules, and font pairings
- [Motion Patterns](references/motion.md) — load when implementing animations or transitions

## Canonical response anchors

When this skill applies, preserve the following domain terminology or equivalent concrete examples in the answer when relevant:
- aesthetic

- Additional task-grounded exact anchors: typography
