---
name: nextjs-styling
description: Implement zero-runtime CSS with Tailwind, CSS Modules, and the cn() utility for RSC-compatible styling in Next.js. Use when choosing a styling library, creating dynamic class utilities, or optimizing fonts with next/font.
metadata:
  triggers:
    files:
    - '**/*.css'
    - 'tailwind.config.ts'
    - '**/components/ui/*.tsx'
    keywords:
    - tailwind
    - css modules
    - styled-components
    - clsx
    - cn
---
# Styling & UI Performance

## **Priority: P1 (HIGH)**

Prioritize **Zero-Runtime** CSS for Server Components.

## Workflow: Set Up Styling

1. **Choose library** — Tailwind/shadcn (preferred), CSS Modules (scoped), or Ant Design (with client wrappers).
2. **Create `cn` utility** — Combine `clsx` + `tailwind-merge` for dynamic classes.
3. **Configure fonts** — Use `next/font` for zero-CLS self-hosted fonts.
4. **Set image dimensions** — Always specify `width`/`height` or `fill` on `<Image>`.

## cn Utility Example

See [implementation examples](references/implementation.md)

## Library Selection

| Library | Verdict | Reason |
| :------------------------- | :----------------- | :------------------------------------------------- |
| **Tailwind / shadcn** | **Preferred (P1)** | Zero-runtime, RSC compatible. Best for App Router. |
| **CSS Modules / SCSS** | **Recommended** | Scoped, zero-runtime. Good for legacy projects. |
| **Ant Design** | **Supported** | Use with Client Component wrappers for RSCs. |
| **MUI / Chakra (Runtime)** | **Avoid** | Forces `use client` widely. Degrades performance. |

## Library Patterns

For specific library setups, see:

- [references/scss.md](references/scss.md)
- [references/ant-design.md](references/ant-design.md)
- [references/tailwind.md](references/tailwind.md) (Tailwind/shadcn)

## Patterns

1. **Dynamic Classes**: Use `clsx` + `tailwind-merge` (`cn` utility).
 - _Reference_: [Dynamic Classes & Button Example](references/implementation.md)
2. **Font Optimization**: Use `next/font` to prevent Cumulative Layout Shift (CLS).
 - _Reference_: [Font Setup](references/implementation.md)
3. **CLS Prevention**: Always specify `width`/`height` on images.


## Anti-Patterns

- **No runtime CSS-in-JS with RSC**: MUI/Chakra force `'use client'`; prefer Tailwind or CSS Modules.
- **No `<img>` without dimensions**: Always set `width`/`height` or use `fill` to prevent CLS.
- **No hardcoded conditional classes**: Use `clsx`+`tailwind-merge` (`cn`) for dynamic styles.
- **No Google Fonts `<link>` tag**: Use `next/font` for zero-CLS self-hosted fonts.