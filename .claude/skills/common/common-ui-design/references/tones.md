# Tone Palette & Font Pairings

## Tone Spectrum

| Tone | Feeling | Color Hint | Layout Hint |
|---|---|---|---|
| Brutally Minimal | Confident, sparse | Monochrome + one sharp accent | Extreme whitespace, single column |
| Maximalist | Energetic, loud | Multi-color, clashing on purpose | Overlapping elements, dense |
| Retro-Futuristic | Nostalgic + tech | Neon on dark, scanline textures | Grid with broken rules, glitch |
| Editorial/Magazine | Authoritative | Muted neutrals + ink black | Asymmetric, pull-quotes, large type |
| Luxury/Refined | Exclusive, calm | Champagne, deep navy, ivory | Generous margins, serif type |
| Brutalist/Raw | Confrontational | Primary colors, hard borders | Intentionally broken layout |
| Playful/Toy-like | Warm, joyful | Bright pastels, rounded shapes | Bubbly, wobbly, fun hover states |
| Organic/Natural | Calm, earthy | Terracotta, sage, warm beige | Soft curves, flowing dividers |

## Font Pairings by Tone

### Editorial / Luxury
- Display: Playfair Display, Cormorant Garamond, DM Serif Display
- Body: DM Sans, Lora, Source Serif 4
- Avoid: Inter, Roboto, Arial

### Retro-Futuristic / Brutalist
- Display: Space Mono, VT323, Bebas Neue, Syne
- Body: IBM Plex Mono, JetBrains Mono, Inconsolata
- Avoid: Nunito, Poppins, Open Sans

### Minimal / Refined
- Display: Fraunces, Libre Baskerville, Instrument Serif
- Body: Geist, Plus Jakarta Sans, Figtree
- Avoid: Inter (too safe), Arial, system-ui

### Playful / Organic
- Display: Nunito, Pacifico, Caveat, Quicksand
- Body: Nunito Sans, Mulish, Jost
- Avoid: Roboto Mono, Times New Roman

## CSS Custom Properties Pattern

```css
:root {
  --color-bg: #0d0d0d;
  --color-surface: #1a1a1a;
  --color-primary: #e8ff00;   /* dominant accent */
  --color-text: #f0ede6;
  --color-muted: #6b6b6b;

  --font-display: 'Bebas Neue', sans-serif;
  --font-body: 'IBM Plex Mono', monospace;

  --radius: 2px;
  --spacing-unit: 0.5rem;
}
```

## Backgrounds & Texture

```css
/* Gradient mesh */
background: radial-gradient(at 40% 20%, hsl(28,100%,74%) 0px, transparent 50%),
            radial-gradient(at 80% 0%, hsl(189,100%,56%) 0px, transparent 50%);

/* Noise texture overlay */
.noise::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,...");
  opacity: 0.04;
  pointer-events: none;
}

/* Grain overlay */
backdrop-filter: contrast(1.1) brightness(0.95);
```
