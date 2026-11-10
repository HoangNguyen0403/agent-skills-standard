# Tone Palette & Font Pairings

> **Usage Note**: The tones and font pairings below are optional visual inspirations, not prescriptive requirements. Existing brand guidelines, established design systems, and native platform typography (`system-ui`, SF Pro, Roboto, Segoe UI, Inter) can and should win whenever justified by product context, reading ergonomics, or task efficiency.
>
> **Accessibility Precaution**: Sample colors and hex values in this reference are creative starting points, NOT pre-verified accessible palettes. Always calculate and verify actual composited contrast for your specific pairing and background; avoid sample pairings with misleading AA claims.

## Tone Spectrum

These archetypes illustrate deliberate aesthetic directions across the spectrum:

| Tone | Feeling | Color Hint | Layout Hint |
|---|---|---|---|
| Brutally Minimal | Confident, sparse | Monochrome + one deliberate accent | High whitespace, focused single-column or disciplined grid |
| Maximalist | Energetic, expressive | Rich multi-color palette | Overlapping elements, controlled density |
| Retro-Futuristic | Nostalgic + technical | Neon accents on dark, scanline cues | Structured grid with technical accents |
| Editorial/Magazine | Authoritative, curated | Muted neutrals + ink black | Asymmetric elements, pull-quotes, expressive scale |
| Luxury/Refined | Exclusive, calm | Deep navy, ivory, warm neutrals | Generous margins, elegant serif or geometric type |
| Brutalist/Raw | Direct, functional | Primary tones, prominent borders | Visible structure, high-contrast boundaries |
| Playful/Toy-like | Warm, joyful | Soft pastels or vibrant primary hues | Rounded geometry, expressive interactive states |
| Organic/Natural | Calm, grounded | Terracotta, sage, warm beige | Soft curves, natural divider rhythms |

## Font Pairings by Tone (Inspirations)

These pairings serve as starting ideas when a brand identity calls for distinctive display typography. Standard platform fonts (`system-ui`, SF Pro, Roboto, Segoe UI) and workhorse typefaces (Inter, Arial) remain fully valid whenever functional density and platform ergonomics take precedence.

### Editorial / Refined
- **Display**: Playfair Display, Cormorant Garamond, DM Serif Display
- **Body**: DM Sans, Lora, Source Serif 4, or system platform fonts

### Technical / Expressive
- **Display**: Space Mono, Bebas Neue, Syne, VT323
- **Body**: IBM Plex Mono, JetBrains Mono, Inconsolata, or platform monospace

### Clean / Contemporary
- **Display**: Fraunces, Libre Baskerville, Instrument Serif, or semi-bold platform display
- **Body**: Geist, Plus Jakarta Sans, Figtree, Inter, or system-ui

### Playful / Warm
- **Display**: Nunito, Pacifico, Caveat, Quicksand
- **Body**: Nunito Sans, Mulish, Jost, or platform sans-serif

## Role-Based Semantic Design System Tokens

When the project lacks an established design system, define a minimal role-based token structure rather than one-off hex values:

```css
:root {
  /* 1. Canvas & Surface Hierarchy */
  --color-canvas: #ffffff;          /* Base background */
  --color-surface: #f8fafc;         /* Cards, secondary containers */
  --color-surface-raised: #ffffff;  /* Elevated panels, dropdowns */
  --color-overlay: rgba(15, 23, 42, 0.4); /* Backdrop */
  --color-border: #e2e8f0;          /* Dividers and structural borders */
  --color-focus: #2563eb;           /* Focus indicator (min 3:1 vs adjacent) */

  /* 2. Brand & Semantic Roles (Illustrative role definitions; measure actual contrast for chosen pairings) */
  --color-brand: #0369a1;             /* Brand accent; verify contrast with --color-brand-contrast */
  --color-brand-contrast: #ffffff;    /* Paired foreground text/icon on brand */
  --color-success: #15803d;           /* Semantic success */
  --color-success-contrast: #ffffff;
  --color-error: #b91c1c;             /* Semantic error */
  --color-error-contrast: #ffffff;
  --color-warning: #b45309;           /* Semantic warning */
  --color-warning-contrast: #ffffff;

  /* 3. Text & Icon Foreground Roles (Verify against target background) */
  --color-text-primary: #0f172a;      /* High contrast primary copy */
  --color-text-secondary: #334155;    /* Secondary/supporting copy */
  --color-text-muted: #64748b;        /* Subdued text (must still meet WCAG AA for its font size) */
  --color-icon-primary: #334155;      /* Interactive icon foreground */

  /* 4. Typography & Spacing Rhythm */
  --font-display: 'Inter', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;
  --spacing-unit: 0.25rem;          /* 4px base grid */
  --radius-sm: 4px;
  --radius-md: 8px;
  --control-height-sm: 32px;
  --control-height-md: 40px;

  /* 5. Interactive Component States */
  --color-brand-hover: #075985;
  --color-brand-active: #0c4a6e;
  --color-surface-hover: #f1f5f9;
}
```

## Color Harmony & Surface Composition

Evaluate color relationships across surfaces rather than isolated hex codes:

1. **Undertones & Temperature**: Align base surfaces with brand undertones (e.g., warm stone neutrals with amber/terracotta accents; cool slate neutrals with cyan/blue accents). Intentional temperature contrast (such as a warm accent on a cool ground) can provide effective visual hierarchy when chosen contextually.
2. **Saturation & Lightness Distribution**: Balance surface saturation against readability. Lower-saturation surfaces can reduce visual competition and keep typography readable, while higher saturation effectively signals primary actions and status states; the right level depends on task density and brand context, not a fixed rule. Choose levels contextually without arbitrary numerical caps.
3. **Meaningful Surface Separation**: Establish depth through tonal contrast, subtle lightness shifts, or crisp borders. Avoid gratuitously nesting multiple bordered boxes inside bordered cards when a single surface or simple divider achieves equal clarity.
4. **Proportional Visual Emphasis**: Direct attention to the primary task completion action with the strongest visual weight. Style secondary and supporting actions (such as subtle fills, borders, or lower-weight treatments) so they remain discoverable without competing with the primary goal. Choose variants contextually based on layout needs rather than rigid component-type rules.
5. **No Dogmatic Ratios or Mandatory Formats**: Do not enforce rigid percentage rules (e.g. 60-30-10), arbitrary color counts, or mandatory OKLCH syntax. Use RGB, HSL, or OKLCH as appropriate for the codebase.

## Composited Contrast & Accessibility Rules

1. **Actual Browser-Composited Contrast**:
   When using alpha transparency, overlays, or backdrop blur, contrast MUST be verified on the actual browser-composited pixel values behind text and interactive cues. Avoid simplistic mathematical alpha approximations that fail to account for color space conversions, multiple stacked layers, or CSS blending modes.
   - Normal text: ≥ 4.5:1.
   - Large text (≥ 18pt or 14pt bold): ≥ 3:1.
   - Non-text UI controls and interactive state boundaries: ≥ 3:1 where the contrast is required to identify the control or its state; inactive or purely decorative elements are exempt — see `common-accessibility` for the applicable WCAG exceptions.
2. **Gradient Contrast Across Full Glyph Regions & Cues**:
   When text or interactive state indicators sit on a linear or radial gradient, WCAG AA contrast must hold across all rendered text glyph regions, intermediate coordinates, and essential cues—not merely at the gradient start/end stops or along a single baseline point.
3. **Dark Theme Mapping**:
   Dark mode requires deliberate surface-to-text mappings, not mathematical color inversion. Elevated surfaces in dark mode should typically be slightly lighter than the canvas (simulating proximity to light sources); text contrast must be re-verified against every elevated surface.
4. **Forced Colors & High Contrast**:
   Always respect `@media (forced-colors: active)` without overriding system colors. Never remove native focus outlines without a high-contrast replacement.
5. **Non-Color-Only Semantic State**:
   Never indicate status, errors, or selection by hue alone. Always pair color with an icon, textural border pattern, or explicit text label.

## Backgrounds & Texture (Optional Enhancements)

Atmospheric backgrounds, subtle noise, and gradient meshes are optional styling enhancements. Clean, untextured neutral surfaces (crisp white, neutral gray, flat dark) are fully valid and often preferred for data-dense tools and readability.

```css
/* Subtle gradient background (check contrast along all text positions) */
background: radial-gradient(at 20% 20%, rgba(2, 132, 199, 0.08) 0px, transparent 60%),
            radial-gradient(at 80% 80%, rgba(37, 99, 235, 0.05) 0px, transparent 60%);
```
