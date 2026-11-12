# Next.js App Router Static Export for Cloudflare Pages

Complements [Self-Hosting Standard](SELF_HOSTING.md) (`output: 'standalone'`) when shipping a zero-server static landing site (`output: 'export'`) to **Cloudflare Pages**.

## 1. Static Export Configuration

```ts
// next.config.ts
const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: false,
  reactStrictMode: true,
};
```

- Do **not** configure a fallback SPA rewrite on Cloudflare Pages; unknown paths must serve exported `404.html` with HTTP `404`.
- Keep Node runtime pinned to the website build version in CI (e.g. Node `22.x`) without silently raising unrelated monorepo runtime requirements.

## 2. Origin & Indexing Guardrails (`SITE_URL` vs `APPROVED_SITE_URL`)

Never hardcode a production domain or fall back silently in production builds:
- Require `SITE_URL` as an explicit HTTP(S) origin without path, query, or fragment (`http://127.0.0.1:4321` for local E2E).
- Gate indexing (`shouldIndex = true`, `robots.txt` `Allow: /`, no `noindex`) strictly on **all three**:
  1. `DEPLOYMENT_ENV === 'production'`
  2. `SITE_URL` uses `https:`
  3. `APPROVED_SITE_URL` is an `https:` origin matching `SITE_URL` exactly
- Preview and local builds must emit `noindex, nofollow` and `Disallow: /` even when testing with a real domain `SITE_URL`.

## 3. Two-Stage CI/CD Build Separation

Playwright E2E tests against the local static export server assert `http://127.0.0.1:4321` canonical links, `noindex`, and `sitemap.xml` URLs:
- **Never** deploy the `verify` job's `out/` directory to Cloudflare Pages.
- In the `deploy` job, remove `out/` and run a clean rebuild with the target environment's `SITE_URL`, `DEPLOYMENT_ENV`, and `APPROVED_SITE_URL`, then assert `out/index.html` contains the target canonical origin (and not `127.0.0.1`) before uploading.

## 4. Security Headers (`_headers`) & CSP

- Generate SHA-256 `script-src`, `style-src`, and `style-src-attr` (`'unsafe-hashes'`) CSP directives from the **actual exported HTML** (`out/**/*.html`) into `out/_headers` during `build`; avoid `'unsafe-inline'` or wildcard sources.
- Local Node static servers (e.g. `serve`) ignore `public/_headers`. Verify `_headers` parsing and CSP enforcement locally with pinned `wrangler pages dev <out>` and post-deploy against the live Cloudflare Pages URL (`X-Content-Type-Options: nosniff`, `Content-Security-Policy`, and strict `404`).
