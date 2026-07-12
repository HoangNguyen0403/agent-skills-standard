MUI is supported, but its runtime styling generally requires Client Component wrappers in the App Router. Isolate MUI behind the smallest possible client boundary, configure its SSR/cache integration correctly, and avoid making the entire layout or page client-side. Prefer Tailwind/shadcn or CSS Modules when zero-runtime, RSC-compatible styling is the priority.

