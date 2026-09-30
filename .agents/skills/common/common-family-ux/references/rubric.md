# Family UX Rubric

Score each axis 0-3 per screen. 0 = fails a Blocker rule, 1 = several Major gaps, 2 = Minor gaps only, 3 = meets every rule. Cite a screenshot region or audit rule id for every score below 3.

## 1. Audience fit
- Declared age band appears in content: milestones, activities, copy, and sample ages all fit it.
- Parent surfaces and child surfaces never share a screen.
- Parent gate (adult-only check, not a simple tap) before settings, purchases, external links, data export, and deletion.
- 0 when content targets a different age band or a child can reach a parent-only action.

## 2. Accessibility
- Text contrast 4.5:1, large text (24px, or 18.66px bold) 3:1, UI component edges 3:1.
- Body 16px minimum, labels and captions 14px minimum, no uppercase tracking on diacritic languages.
- Touch targets 48px on parent surfaces, 64px on child surfaces for ages 3-6, 8px apart.
- Icon-only buttons have an accessible name. Status uses colour plus icon plus word.
- Motion respects reduced-motion; no information only in animation.
- 0 when a primary action fails 4.5:1.

## 3. Safety and trust
- AI or automatic summaries carry a visible label and sit apart from what a clinician recorded; no dosing advice from AI.
- No "verified", "official", or "premium" badge on medical content without a named source.
- Destructive actions: two steps, name what is lost, offer export first or a restore window.
- No dark patterns: confirmshaming, hidden cancel, pre-ticked consent, fake scarcity.
- Child data: collect the minimum; Apple Kids Category, Google Play Families, and COPPA points are marked `needs validation` for legal review.
- 0 when medical data contradicts across screens or AI output is presented as clinical fact.

## 4. Comfort
- One accent colour; status colours reserved for real status.
- No countdown timers, streak counters, loss framing, or red badges for non-urgent reminders.
- Clear stopping points; no autoplay chains on child surfaces.

## 5. Consistency and convenience
- One design system: one primary colour, one font family, one corner scale.
- Identical navigation tabs and order on every top-level screen.
- One language per screen; locale date format and units.
- Primary action in the bottom third on phone; common logging in 3 taps or fewer.
- Tablet: two-pane list-detail or a navigation rail; landscape supported.

## 6. Human feel
See [Human feel](human-feel.md). 0 when sample data contradicts itself on a medical or identity field.
