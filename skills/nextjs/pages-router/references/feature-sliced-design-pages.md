# Feature-Sliced Design (FSD) for Pages Router

In a large Next.js Pages Router monolith, the worst anti-pattern is giant page files or "God Components" handling heavy UI mapping and Business Logic simultaneously.

The AI must strictly adhere to FSD:

## Structure

```text
pages/
└── cart.tsx                    <-- Thin route

src/
├── features/
│   └── cart/
│       ├── components/         <-- UI only (CartItem, OrderSummary)
│       ├── services/           <-- Pure logic (API calls)
│       └── CartFeature.tsx     <-- Assembles UI and handles main state
└── shared/
    ├── ui/                     <-- Global UI (Button, Modal)
    └── utils/                  <-- Globally shared utilities
```

## How to Execute Work

1. `pages/cart.tsx` is only responsible for returning `<CartFeature />` and exporting `getServerSideProps` if Server-Side Rendering is needed for SEO/Auth.
2. `<CartFeature />` ties together the `useCartCalculations` hook and the presentation components `<CartItem />`.
3. Massive logic blocks (like Redux `useSelector` subscriptions or complex `useEffect` chains) are extracted into custom hooks (e.g., `src/features/cart/hooks/useCartData.ts`).
4. **Avoid direct Redux imports** inside low-level presentation components (`components/`). Pass needed data via props from the Feature wrapper, or keep the Redux hook localized strictly to the Feature wrapper or custom hooks.
