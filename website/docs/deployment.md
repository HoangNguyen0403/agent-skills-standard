# Cloudflare Pages Deployment & Operations Runbook

## Hosting model

- Package: private workspace package `@ags/website` in the public Agent Skills Standard repository.
- Output: static Next.js export in `website/out`; no Workers, Functions, Node server, database, or backend API.
- Cloudflare Pages build root: repository root, so pnpm uses the root workspace and lockfile.
- Build command: `pnpm --filter @ags/website build`.
- Output directory: `website/out`.
- Required runtime: Node 22.x for the website build. Keep tests and shared root commands compatible with the existing root CI runtime (Node 20.x); do not raise that runtime as part of website setup.

No Cloudflare account, project, Pages project name, production domain, billing authorization, analytics provider, or deployment approval is assumed by this runbook. All are pending inputs until approved by the repository/release owners.

## Activation prerequisites — block before provisioning or publishing

Obtain and record owner approval for each item before installing a GitHub integration, creating a Pages project, enabling builds, or publishing any artifact. Pages project creation or its first deployment may expose a public `*.pages.dev` address even before a custom domain is attached.

1. Named human release owner and authorized Cloudflare account owner.
2. Explicit approval for Cloudflare Pages project creation, billing/account use, repository GitHub App access, project naming, and the visibility of any `pages.dev` preview.
3. GitHub organization/repository approval for the Cloudflare Pages GitHub application and its exact repository permissions.
4. Owner-approved canonical HTTPS origin and domain ownership. Use a reserved placeholder such as `<approved-production-origin>` in configuration until approved; never copy an example domain as a real setting.
5. Explicit approval of preview access and noindex policy. Restrict previews to reviewed same-repository branches; no production secrets or real analytics in previews.
6. Reviewed security-header policy derived from the actual static export and successful local-origin compatibility checks.
7. Before the first production launch, the release owner must approve a recovery plan that acknowledges no prior production artifact exists for rollback. Later launches require a previously verified successful production artifact or a separately owner-approved recovery plan.

Do not use production credentials in build environments. Never commit secrets or insert them into the static export.

## Cloudflare Pages build settings

After activation approval, configure the project with these repository-owned inputs:

| Setting | Value |
| --- | --- |
| Root directory | Repository root (`/`) |
| Build command | `pnpm --filter @ags/website build` |
| Build output directory | `website/out` |
| Node build runtime | Node 22.x |
| `SITE_URL` | Owner-approved canonical HTTPS origin; required explicit build input |
| `DEPLOYMENT_ENV` | `preview` for preview builds; `production` only for an approved production build |
| `APPROVED_SITE_URL` | Omit for local and preview; set to the same owner-approved HTTPS origin as `SITE_URL` only for an approved production build that may be indexed |
| Indexing policy | `shouldIndex` is true only when `DEPLOYMENT_ENV=production`, `SITE_URL` is HTTPS, and it exactly matches the HTTPS `APPROVED_SITE_URL`; local and preview builds remain noindex |
| Protected checks | Root CI and the required `website-gate` check; enforce protected `main` and human review |

Expected origin/indexing behavior from `website/src/app/site.ts`:

| Context | `SITE_URL` | `DEPLOYMENT_ENV` | `APPROVED_SITE_URL` | `shouldIndex` |
| --- | --- | --- | --- | --- |
| Local exported-site verification | `http://127.0.0.1:4321` | `local` (default) | Unset | `false` |
| Reviewed preview, even with production canonical origin | Explicit canonical origin | `preview` | Unset | `false` |
| Production-mode build without matching owner approval | Explicit HTTPS origin | `production` | Unset or different HTTPS origin | `false` |
| Human-approved production | Owner-approved HTTPS origin | `production` | Same approved HTTPS origin as `SITE_URL` | `true` |

This table documents the source predicate; it is not an executed environment-matrix result or an approval to index.

Configure watch paths for all website and build-input changes:

- `website/**`
- root `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `.github/workflows/website.yml`

Do not configure a fallback SPA rewrite. The static export's `404.html` must be served with HTTP 404 for unknown paths.

## Domain, DNS, and TLS

Only after the project, account, and origin have explicit approval:

1. Add the approved custom domain in Cloudflare Pages.
2. Verify existing DNS and certificate-authority authorization (CAA) records before changing records; wait for Cloudflare to provision TLS.
3. For a subdomain, add the exact owner-approved CNAME target displayed by Cloudflare. Do not substitute a guessed `pages.dev` project name.
4. Do not move apex nameservers without explicit domain-owner approval and a documented email impact review covering MX, SPF, and DKIM. An apex move can interrupt email independently of website correctness.
5. Verify HTTPS, redirect/canonical behavior, sitemap, robots policy, and status codes from the approved origin before public launch.

## Security headers, CSP, and caching

`website/public/_headers` is copied/generated for the static output by the build pipeline. The final policy must be the policy emitted for the **actual build**, not a hand-copied example. Do not use `unsafe-inline`, wildcard sources, or invented hash values.

Before activation, inspect the generated header and the built files. Confirm that the CSP accounts for the actual inline script elements and inline style elements/attributes on every exported HTML response, including the root document and `404.html`; confirm Next hydration works with that policy. If the export's style attributes cannot be represented safely, stop the release and resolve the source/pipeline compatibility instead of weakening CSP.

`pnpm --filter @ags/website serve:export` checks the static export, routes, and strict 404 only; it does not parse `website/public/_headers` or prove CSP enforcement.

## Final local artifact compatibility checkpoint — 2026-10-09

The final export was checked locally with Wrangler Pages 4.148.0. Wrangler parsed five valid header rules and reported no Functions; its implicit compatibility-date warning was recorded. `GET /` returned 200 and an unknown path returned 404. The effective CSP, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and referrer policy were checked. Hydrated Replay and both Copy controls were visible and enabled; the page had one H1, one main, 11 main sections (13 structural sections including header/footer), and the document/body fit the 1280px viewport. Chrome 154 at 1280×720, DPR 1 loaded all four local font faces; the browser console had zero errors or warnings.

The final generated policy accounted for 3 HTML documents, 4 script hashes, 1 style-element hash, and 4 style-attribute hashes; headers measured 1,544 bytes with a longest line of 720 characters. The final inspector found no missing CSP hashes across the three HTML documents. A separate isolated Chrome 134 no-JavaScript smoke verified native keyboard focus and horizontal scrolling of the init command at 320px and 375px widths, with visible unclipped focus, 16px text, and no root/body overflow. This was local compatibility evidence, not Cloudflare edge/production validation. The test-only local origin override used during validation is not an approved public origin.

This receipt applies to the inspected final local artifact only. For any later source change, rebuild the export and repeat CSP inspection, header-aware root/404/hydration checks, and the relevant browser/performance gates before treating the artifact as current. For a fresh local header-aware run, invoke the pinned Wrangler version, for example `pnpm dlx wrangler@4.148.0 pages dev website/out --ip 127.0.0.1 --port 4322`; do not assume Wrangler is a website package dependency. No Cloudflare account/project was provisioned or used, and no deployment occurred.

The final no-JavaScript scenario was exercised with standalone version-matched Playwright after the native CLI scenario timed out; no exact driver root cause is inferred. Lighthouse was separately run against the strict local export server, with all other owned browser/E2E sessions closed for a quiet lab run. Lighthouse results remain lab data, not field INP.

The later publication checkout retained the same page source and security policy generator, while patching test/tool dependencies to Vitest 4.1.11, Playwright 1.55.1, and `get-uri@6>basic-ftp` 6.2.1. Its Node 20.20.2 recursive coverage passed (CLI 1,254, MCP 181, website 12; server has no tests), and all 63 unchanged browser cases passed on real Chromium 140.0.7339.186 without retries. A fresh quiet Lighthouse 12.3.0 run at 2026-10-09T16:30:28.173Z completed all three audits (100/99/99), with median score 99, LCP 1,804.4483 ms and CLS 0.0004523810058988496. This also exercised the patched Lighthouse dependency through a real audit. The production dependency audit was clean; the full development audit was not. These remain local receipts, not field INP, edge verification, human approval or launch authorization.

Playwright owns a strict static server with `reuseExistingServer: false`; stop any manually started listener before `pnpm --filter @ags/website test:e2e`. Lighthouse does not start a server: after Playwright exits, start a separate server against the verified `website/out`, confirm it serves that exact export, and record the actual Chrome executable/version (set `CHROME_PATH` when required) before running the three audits.

Cache policy must match the emitted asset names and paths: long-lived immutable caching only for fingerprinted bundles and fonts; HTML, canonical metadata, and route documents must revalidate. Confirm the actual font paths before configuring a font rule. Robots/sitemap and social metadata must use the approved production origin and correct noindex behavior for local/previews. Avoid broad extension-only rules that miss clean routes or root HTML.

## CI and pre-release verification

The website workflow is a required, path-aware `website-gate`; keep that final check enabled for unrelated pull requests so branch protection receives a conclusion. It must fail closed on change-detection errors and require the website job on relevant changes. Website CI must install from the root lockfile, typecheck, lint, run unit tests, build with a local `SITE_URL`, serve the exported `out` directory, run browser tests against that static origin, and retain failure artifacts. It must not deploy or publish packages.

Before release approval, inspect the exact source revision and actual receipts for: static export and actual 404; unit, browser, keyboard, no-JavaScript, responsive/reflow, clipboard, reduced-motion and cancellation behavior; axe results; local CSP/hydration; metadata, fonts, and social image; and three full, unrounded, consistently configured mobile Lighthouse LHRs. Lighthouse results are lab data only and do not establish field INP. Root recursive unit CI remains a separate consumer and must pass on its existing supported Node runtime.

## Preview and public-launch gates

A preview is not public-launch approval. Keep preview URLs noindex and analytics-disabled, and restrict who can access or share them under the approved project policy. Do not add production secrets or assume a provider exists.

Public production activation requires all of the following, with evidence attached to the release record:

- All source owners settled and the repository's root and website covering checks passed on the exact release revision.
- Actual export/browser smoke passed against the configured static server and approved preview; effective CSP/security headers, metadata, fonts, links, and strict 404 verified.
- At least four of five representative developers, after 30 seconds, correctly explain the product's purpose, its relationship to their existing agent, and how to start; record individual outcomes. Completion without meeting this criterion does not pass UAT.
- Actual social-share preview rendered and was reviewed from the approved public origin.
- A real analytics provider was selected through privacy review, event/data collection was verified against approved consent and privacy requirements, and the owner approved it. Until this exists, keep analytics disabled and keep the analytics launch gate open; do not use mock telemetry.
- Domain, account, billing, GitHub access, HTTPS, preview/indexing controls, and production deployment settings received explicit owner approval.
- For later launches, a previously successful production artifact with verified origin and headers is available as rollback target. For first launch, no such target exists; require the release-owner-approved recovery plan and explicit acceptance that rollback to a prior production artifact is unavailable.

Only then may the release owner enable the production deployment and approve public DNS/indexing. No deployment, account, billing, domain, analytics, or DNS action is authorized by this document.

## Production smoke and rollback

After an owner-authorized deployment, verify the actual production origin:

- `/` returns 200; an unknown path returns 404 rather than SPA fallback.
- Canonical, Open Graph, sitemap, robots, HTTPS, and response headers match approved production settings.
- Local font and static asset requests succeed without CSP errors; client hydration and browser console are clean.
- Setup commands, clipboard behavior, keyboard navigation, native FAQ, and core external links work.
- The reviewed social card is returned and renders from the real share-preview service.

Rollback only to a previously successful **production** artifact whose origin and headers were verified. Preview deployments are not rollback targets. If the first production release has no earlier production artifact, stop and obtain an owner-directed recovery plan; do not describe a preview as a rollback. After rollback, repeat the production smoke checks and record the exact artifact/revision.

## Analytics boundary

`REQ-008` is not satisfied by disabling tracking or adding a placeholder. No fake/no-op analytics is permitted. Keep production activation gated on selection and privacy approval of a real provider, verification of actual events and data handling, and human owner approval.
