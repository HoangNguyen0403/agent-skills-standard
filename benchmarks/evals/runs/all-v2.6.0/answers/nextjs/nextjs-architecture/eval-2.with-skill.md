# Thin pages

Move data fetching and business logic out of `page.tsx`. In the App Router, keep the page as a thin composition of widgets or features; place data access in a DAL/service module and interactive logic in Client Components at leaf boundaries. Server Components can be async and call the DAL directly, while client-only behavior belongs behind `'use client'`. This preserves the App layer’s routing responsibility and avoids page-level `useEffect`/`fetch` waterfalls.

