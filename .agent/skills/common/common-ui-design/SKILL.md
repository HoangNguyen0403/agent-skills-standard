---
name: common-ui-design
description: "Create distinctive, production-grade frontend UI with bold aesthetic choices. Use when building web components, pages, interfaces, dashboards, or applications in any framework (React, Next.js, Angular, Vue, HTML/CSS). Triggers: 'build a page', 'create a component', 'design a dashboard', 'landing page', 'UI for', 'build a layout', 'make it look good', 'improve the design', build UI, create interface, design screen"
---

# UI Design Direction

## **Priority: P0 (FOUNDATIONAL)**

Before writing any code, commit to a deliberate aesthetic direction.

## Phase 0: Design Thinking (Mandatory Pre-Code)

Answer these before touching implementation:

1. **Purpose**: What problem does this UI solve? Who uses it?
2. **Tone**: Pick one extreme and commit — brutally minimal | maximalist | retro-futuristic | editorial/magazine | luxury/refined | brutalist/raw | playful/toy-like | organic/natural | art deco | industrial/utilitarian
3. **Differentiation**: Name the one thing a user will remember about this interface.

Bold maximalism and refined minimalism both work — intentionality, not intensity, is the key.

## Aesthetic Dimensions

### Typography

- Pair a distinctive **display font** + refined **body font**; never default to system fonts.
- Self-host via `next/font`, `@font-face`, or Google Fonts API — never CDN `<link>` in production.
- See [Font Pairing & Tone Examples](references/tones.md)

### Color & Theme

- Dominant color + sharp accent > timid, evenly-distributed palettes.
- Use CSS custom properties (`--color-primary`, `--color-accent`) for consistency.
- Commit: dark or light — don't default to light because it feels "safe".

### Motion

- One well-orchestrated entrance (staggered reveals, `animation-delay`) > scattered micro-interactions.
- CSS-first: `@keyframes`, `transition`, `animation-delay`; React: Motion library for complex sequences.
- See [Motion Patterns](references/motion.md)

### Spatial Composition

- Break the grid intentionally: asymmetry, overlap, diagonal flow, grid-breaking elements.
- Generous negative space OR controlled density — never accidental middleground.

### Backgrounds & Depth

- Create atmosphere: gradient meshes, noise textures, layered transparencies, grain overlays.
- Dramatic shadows and decorative borders should match the chosen tone.
- Solid white/gray backgrounds = missed creative opportunity.

## Anti-Patterns

- **No generic font defaults**: Inter/Roboto/Arial/system-ui produce forgettable UIs; choose characterful fonts.
- **No purple-gradient-on-white**: Most overused AI aesthetic; commit to something context-specific.
- **No scattered animations**: One orchestrated entrance beats ten random hover effects.
- **No accidental layouts**: Every spacing and positioning decision must serve the aesthetic intent.
- **No same aesthetic twice**: Vary light/dark, font style, tone — never converge on a single style.

## References

- [Tone Palette & Font Pairings](references/tones.md) — load when choosing aesthetic direction or fonts
- [Motion Patterns](references/motion.md) — load when implementing animations or transitions
