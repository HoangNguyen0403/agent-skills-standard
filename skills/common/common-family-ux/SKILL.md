---
name: common-family-ux
description: Judge and shape UI/UX for products used by parents and young children - audience fit, accessibility, safety and trust, comfort, consistency, and human feel. Use when reviewing or designing family, parenting, or kids app screens on phone or tablet.
metadata:
  triggers:
    keywords:
      - family app
      - parents and children
      - kids app
      - child ux
      - parent gate
      - preschool
      - parenting app
      - designed for families
      - coppa
---

# Family UX

## **Priority: P1 (HIGH)**

## Declare First

- Surfaces: parent, child, or both. Age band (for example 3-6). Locale. Devices: phone and tablet.
- Content, milestones, and examples must match the age band.

## Score Six Axes (0-3, cite evidence)

1. **Audience fit**: parent and child surfaces separated; parent gate before settings, purchases, external links, and deletion.
2. **Accessibility**: text contrast 4.5:1 (3:1 large); body 16px, labels 14px minimum; targets 48px parent, 64px child; icon buttons have accessible names; status never colour-only; reduced motion respected.
3. **Safety and trust**: AI output labelled and separated from clinician-recorded data; no "verified" badge without a source; destructive actions two-step with export or restore; no dark patterns. Store and COPPA rules: mark `needs validation`, never assert compliance.
4. **Comfort**: calm palette, one accent; no countdown timers, streak guilt, or red badges for non-urgent items.
5. **Consistency**: one design system; identical navigation on every top-level screen; one language per screen; locale dates; primary action in the thumb zone; tablet uses two-pane or a rail, not a stretched phone.
6. **Human feel**: sample people agree across screens (names, ages, dates); one illustration style; no empty placeholders, filler hints, AI cliches, or invented metrics.

Criteria: [Rubric](references/rubric.md). Child rules: [Child surface](references/child-surface.md). AI tells: [Human feel](references/human-feel.md).

## Findings

- Severity: **Blocker** (audience fit, safety, or AA contrast on a primary action), Major, Minor, Human-feel.
- Row: severity | axis | screen | evidence | consequence | smallest fix | edit prompt.
- Cross-screen check: allergies, conditions, names, ages, and dates agree everywhere. Contradictory medical data is a Blocker.

## Anti-Patterns

- **No bold for its own sake**: maximalist, dramatic, or perpetual-motion styles tire parents and distract children.
- **No urgency mechanics**: countdown timers, streaks, and loss framing on child surfaces.
- **No colour-only status**: pair colour with an icon and a word.
