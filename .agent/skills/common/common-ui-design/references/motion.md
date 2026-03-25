# Motion Patterns

## Core Principle

One well-orchestrated entrance > ten scattered micro-interactions.
High-impact moments: page load, route transition, modal open.

## CSS-First Patterns

### Staggered Entrance (Recommended)

```css
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

.card { animation: fadeUp 0.5s ease both; }
.card:nth-child(1) { animation-delay: 0ms; }
.card:nth-child(2) { animation-delay: 80ms; }
.card:nth-child(3) { animation-delay: 160ms; }
```

### Hover States with Depth

```css
.button {
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.2);
}
```

### Scroll-Triggered (CSS only)

```css
@keyframes slideIn {
  from { opacity: 0; transform: translateX(-30px); }
  to   { opacity: 1; transform: translateX(0); }
}

/* Use with IntersectionObserver adding .visible class */
.reveal { opacity: 0; }
.reveal.visible { animation: slideIn 0.6s ease both; }
```

## React: Motion Library

Use `motion` (formerly Framer Motion) for complex sequences.

```tsx
import { motion } from 'motion/react';

// Staggered list
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0 }
};

<motion.ul variants={container} initial="hidden" animate="show">
  {items.map(i => <motion.li key={i} variants={item}>{i}</motion.li>)}
</motion.ul>
```

## Anti-Patterns

- **No animation on every element**: Max 3–4 animated elements per view.
- **No slow animations**: Keep duration 200–600ms; above 800ms feels broken.
- **No infinite spin/pulse on primary content**: Reserve for loading states only.
- **No animation without `prefers-reduced-motion`**:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; }
}
```
