# Tone Palette & Font Pairings

> **Usage Note**: The tones and font pairings below are optional visual inspirations, not prescriptive requirements. Existing brand guidelines, established design systems, and native platform typography (`system-ui`, SF Pro, Roboto, Segoe UI, Inter) can and should win whenever justified by product context, reading ergonomics, or task efficiency.

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

## CSS Custom Properties Pattern

```css
:root {
  --color-bg: #0d0d0d;
  --color-surface: #1a1a1a;
  --color-primary: #e8ff00;   /* primary brand accent */
  --color-text: #f0ede6;
  --color-muted: #6b6b6b;

  --font-display: 'Bebas Neue', sans-serif;
  --font-body: 'IBM Plex Mono', monospace;

  --radius: 2px;
  --spacing-unit: 0.5rem;
}
```

## Backgrounds & Texture (Optional Enhancements)

Atmospheric backgrounds, subtle noise, and gradient meshes are optional styling enhancements. Clean, untextured neutral surfaces (crisp white, neutral gray, flat dark) are fully valid and often preferred for data-dense tools and readability.

```css
/* Gradient mesh (optional atmosphere) */
background: radial-gradient(at 40% 20%, hsl(28,100%,74%) 0px, transparent 50%),
            radial-gradient(at 80% 0%, hsl(189,100%,56%) 0px, transparent 50%);

/* Noise texture overlay (optional tactile feel) */
.noise::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,...");
  opacity: 0.04;
  pointer-events: none;
}

/* Contrast adjustment */
backdrop-filter: contrast(1.1) brightness(0.95);
```
