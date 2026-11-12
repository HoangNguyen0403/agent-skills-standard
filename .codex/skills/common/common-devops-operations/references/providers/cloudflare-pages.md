# Cloudflare Pages CI/CD & DNS Onboarding Reference

Supplements [Cloudflare Provider Reference](cloudflare.md) for static sites hosted on **Cloudflare Pages** via tag-gated GitHub Actions.

## 1. Pages vs. Workers Builds Onboarding Trap

Cloudflare's **"Create application → Continue with GitHub"** defaults to **Workers Builds** (`npx wrangler deploy` + `pnpm run build`). Do **not** connect that screen for a static Pages export in a monorepo:
- Root `pnpm run build` often builds another workspace package (e.g. CLI) instead of the website.
- Dashboard Git auto-builds bypass `verify`/E2E gates, tag release approval, and `SITE_URL` validation.

Create the Pages project **without** Dashboard Git integration:
1. CLI: `wrangler pages project create <project-name> --production-branch main` (with scoped token + account ID), **or**
2. Dashboard: **Workers & Pages → Create → Continue to Pages → Drag and drop your files** (upload initial static export once).

## 2. Token Scoping & GitHub Environments (`secrets` vs `vars`)

- **Token permission**: Scope `CLOUDFLARE_API_TOKEN` strictly to `Account:Cloudflare Pages:Edit` (never Global API Key or Account Administrator).
- **GitHub Environments**: Configure `preview` and `production` (require human reviewer approval on `production`).

| GitHub Store | Key | `preview` | `production` |
| --- | --- | --- | --- |
| Environment Secret | `CLOUDFLARE_API_TOKEN` | Pages Edit token | Pages Edit token |
| Environment Secret | `CLOUDFLARE_ACCOUNT_ID` | Target account ID | Target account ID |
| Environment Variable | `CF_PAGES_PROJECT` | Exact Pages project name | Exact Pages project name |
| Environment Variable | `SITE_URL` | `https://<project>.pages.dev` (or preview origin) | Owner-approved `https://` canonical origin |
| Environment Variable | `APPROVED_SITE_URL` | **Unset / cleared** (`noindex`) | Exact match to `SITE_URL` |

Put `CF_PAGES_PROJECT`, `SITE_URL`, and `APPROVED_SITE_URL` in **Environment Variables** (`vars.*`), not Secrets (`secrets.*`).

## 3. Two-Stage Tag-Gated CI/CD Pattern

Separate verification from deployment so E2E local-origin assertions never leak into production exports:
1. **Triggers**: `push.tags: ['website-v*']` → `production`; `workflow_dispatch` (`target: preview | production`, default `preview`). Never deploy on PRs or ordinary branch pushes.
2. **`verify` job (zero deploy secrets)**: Install from frozen lockfile, run typecheck, lint, unit tests, local static export (`SITE_URL=http://127.0.0.1:4321`), and browser E2E.
3. **`deploy` job (`needs: verify`, bound to GitHub Environment)**:
   - Fail closed before checkout/build if `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CF_PAGES_PROJECT`, or `SITE_URL` is empty, or if `production` lacks matching `https://` `APPROVED_SITE_URL`.
   - Clean-rebuild output directory (`rm -rf <out>`) with target `SITE_URL`, `DEPLOYMENT_ENV`, and `APPROVED_SITE_URL` (analytics flags disabled unless explicitly authorized).
   - Verify exported `index.html` canonical matches `SITE_URL` (and contains no `127.0.0.1`), `404.html` and `_headers` are non-empty, and `robots.txt` matches `Allow: /` (`production`) vs `Disallow: /` (`preview`).
   - Deploy with pinned Wrangler (`pnpm dlx wrangler@<pinned> pages deploy <out> --project-name "$CF_PAGES_PROJECT" --branch "$PAGES_BRANCH" --commit-hash "$GITHUB_SHA"`), using `--branch main` for production tag releases.
   - Smoke-check the returned deployment URL: `GET /` returns `200` with `X-Content-Type-Options: nosniff` + `Content-Security-Policy`, and `GET /__smoke-404-check` returns `404` (not `200` SPA fallback).

## 4. Registrar → Cloudflare DNS Cutover Checklist

Before switching nameservers at a domain registrar (e.g. Hostinger, Namecheap, GoDaddy):
1. **Audit mail & verification records first**: If `@<domain>` email is active anywhere, copy every existing `MX`, `TXT` (`SPF`, `DKIM`, `DMARC`), and `CAA` record into Cloudflare DNS **before** changing nameservers. Parking `A`/`CNAME` records alone with no `MX` records mean no mail is configured yet (safe to switch; add `MX` or Cloudflare Email Routing later if needed).
2. **Disable DNSSEC at the registrar** before updating nameservers (stale `DS` records break resolution; re-enable DNSSEC in Cloudflare after zone activation).
3. **Update nameservers** to the two assigned `*.ns.cloudflare.com` servers and wait until Cloudflare zone status is **Active**.
4. **Bind Custom Domain in Pages**: Go to **Workers & Pages → `<project>` → Custom domains → Set up a custom domain**. Let Cloudflare replace any old registrar parking `A` record with the Pages `CNAME` and wait for TLS **Active**.
5. **Canonical `www` redirect**: If both apex and `www` exist, redirect `www` → apex (`301`) to match `SITE_URL` cleanly.

## 5. First-Launch Rollback Boundary

- Before the first production launch, no prior production Pages deployment exists for rollback. Document an owner-approved initial recovery plan (teardown or maintenance page) and never treat a `*.pages.dev` preview URL as a production rollback target.
