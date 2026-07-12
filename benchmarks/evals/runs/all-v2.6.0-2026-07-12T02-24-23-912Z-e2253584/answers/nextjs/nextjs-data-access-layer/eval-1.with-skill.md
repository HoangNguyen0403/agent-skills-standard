# Add a DAL

Yes, especially when multiple Server Components need the same authorization, DTO, caching, and error behavior. Put database/API access in a server-only module such as `lib/data.ts` or `services/`, import `'server-only'`, authenticate inside every DAL function, and return plain DTOs rather than ORM instances. Wrap repeated reads in React `cache()`. Client Components must not import the DAL; expose a Server Action or Route Handler as the bridge.

