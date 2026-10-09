# @ags/website — Agent Skills Standard Landing Page

Public static landing page for **Agent Skills Standard**, presenting portable coding standards and SDLC workflows for AI coding agents.

## Stack & architecture

- **Framework**: Next.js App Router static export (`output: 'export'`).
- **UI**: React 19, strict TypeScript, CSS Modules, localized Material Design 3 button icons.
- **Fonts**: Locally hosted WOFF2 subsets (Space Grotesk, Source Sans 3, IBM Plex Mono).
- **Static host target**: Cloudflare Pages. No deployment or hosting account is configured by this package.
- **Testing**: Vitest + React Testing Library + jsdom; Playwright against the served static export; axe-core browser scan; three-run mobile Lighthouse lab audit.

The website build uses Node 22.x. Keep test fixtures and root-recursive test commands compatible with the existing root CI Node 20.x runtime; the website CI runtime does not replace that root consumer.

## Commands

Run from the repository root using `pnpm --filter @ags/website <script>`:

```bash
SITE_URL=http://127.0.0.1:3000 pnpm --filter @ags/website dev
pnpm --filter @ags/website typecheck
pnpm --filter @ags/website lint:check
pnpm --filter @ags/website format:check
SITE_URL=http://127.0.0.1:4321 pnpm --filter @ags/website build
pnpm --filter @ags/website serve:export
pnpm --filter @ags/website test:cov
pnpm --filter @ags/website test:e2e
pnpm --filter @ags/website performance
```

`SITE_URL` is a required explicit origin for build and dev: use the actual Next dev origin (default `http://127.0.0.1:3000`) for `dev`, and `http://127.0.0.1:4321` for the exported static site. Production builds require an owner-approved HTTPS origin; no production domain is embedded here. `serve:export` serves `website/out` for static routes and strict-404 checks; it does **not** enforce `website/public/_headers`.

Indexing is separate from `SITE_URL`: local builds use the default `DEPLOYMENT_ENV=local` and remain noindex; reviewed previews explicitly set `DEPLOYMENT_ENV=preview` and remain noindex even if their canonical origin matches production; only owner-approved production builds set `DEPLOYMENT_ENV=production` and `APPROVED_SITE_URL` to the same approved HTTPS origin as `SITE_URL`. The foundation's `shouldIndex` predicate requires that exact match.

For website-local licensed font and image generation, first provision the pinned Python asset tooling with `pnpm --filter @ags/website assets:setup`. Regenerate font subsets with `pnpm --filter @ags/website fonts:generate` and the social image/favicon with `pnpm --filter @ags/website assets:generate` only when their reviewed local source inputs change. Font sources and OFL notices are kept under `website/src/fonts`; generator inputs are website-owned. Ordinary install/build does not require regenerating these committed outputs. Preserve the complete OFL notices when distributing the font sources.

The Lighthouse script writes the complete three-run JSON receipt to ignored `website/test-results/lighthouse-summary.json`; failures and incomplete runs are recorded and fail closed. It compares unrounded medians against the score/LCP/CLS thresholds. This is lab evidence only, not a field INP measurement. The script does not claim that audits were run or passed merely because it exists. Lighthouse requires a separately served, verified export and a recorded actual Chrome executable/version; Playwright manages its own server and must not share a manually started listener.

## Final local verification checkpoint — 2026-10-09

The settled website source passed scoped typecheck, lint, format check, and Next.js static export/CSP generation. Unit tests passed 12/12 across three files, including the motion-observer disposal regression (actual RED: stale callback changed `idle` to `complete`; unchanged test GREEN after the disposed-effect guard). The complete Playwright run passed 63/63 cases: 21 consumer cases across Chromium desktop, mobile, and tablet presets, with retries disabled, in 39.1 seconds. Coverage is diagnostic only; these results do not establish full-page coverage or substitute for root recursive CI.

The browser run exercised finite entrance/Replay/capacity/offscreen/reduced-motion behavior; clipboard granted, denied, absent, and retry paths; menu and FAQ keyboard/focus behavior; responsive widths/reflow; no-JavaScript access; axe with zero serious/critical violations; and a real 404. Four capacity scenarios used explicit 1440×4000 DOM-only geometry; ordinary device presets and separate responsive checks remained unchanged. Raster capture was disabled. The hidden-document case is simulated, not proof of OS/background-tab behavior; no non-Chromium or physical-device coverage is claimed. A targeted independent review approved the final source/specification; it is not whole-branch or human/release approval.

An isolated no-JavaScript Chrome 134 smoke with browser-context JavaScript disabled verified native Tab focus on the init command `<pre>` at 320px and 375px widths, a 16px font and visible 3px focus outline/offset, native ArrowRight scrolling (0→5.5px and 0→30px), and no root/body overflow. Replay was absent without JavaScript. The 375×800 viewport was visually inspected; the focus ring was visible and unclipped. A native CLI no-JavaScript attempt timed out, so a standalone version-matched Playwright run was used; no product behavior or exact driver root cause is inferred.

The pre-publication three-run mobile Lighthouse receipt is timestamped 2026-10-09T13:51:23.447Z. Median performance score was 98, LCP 2,308.9413 ms, and CLS 0.0004520026343649764; all three runs completed without errors and passed thresholds of score ≥90, LCP ≤2,500 ms, and CLS ≤0.1. Runs used Node 22.14.0, Lighthouse 12.3.0, Chromium 134, 375×667 at DPR 2, 150 ms RTT, 1,638.4 Kbps down, 750 Kbps up, and 4× CPU throttling with full-page raster disabled. This is local lab evidence only—not field INP, public-edge validation, or launch authorization.

The publication checkout uses Node 20-compatible Vitest 4.1.11 (native workers, no Tinypool), patched Playwright 1.55.1, and a narrow `get-uri@6>basic-ftp` 6.2.1 security override. Node 20.20.2 recursive coverage passed again (CLI 1,254, MCP 181, website 12); server reports no tests found under its existing `--passWithNoTests`. All 63 unchanged browser cases passed without retries on real Chromium 140.0.7339.186 in 41.6 seconds. A fresh quiet Lighthouse 12.3.0 receipt at 2026-10-09T16:30:28.173Z, on Node 22.14.0 / Chromium 140 with the same mobile/throttling settings, completed all three runs (100/99/99): median score 99, LCP 1,804.4483 ms, CLS 0.0004523810058988496. Production dependency audit reported no known vulnerabilities; the broader development audit still has findings and is not security clearance.

The website's local checks are separate from root-recursive Node 20 consumer/CI gates and from public activation. The release owner must still obtain the account, domain, privacy/analytics, DNS, recovery, preview, social-share, field, human UAT, and deployment approvals listed in [docs/deployment.md](./docs/deployment.md). No public origin, Cloudflare deployment, or launch approval is implied by these local results.

## Directory structure

```text
website/
├── docs/deployment.md           # Activation gates, Cloudflare operations, and rollback
├── public/                      # Headers, fonts, favicon, social card
├── scripts/performance.mjs      # Full-receipt three-run mobile Lighthouse audit
├── src/app/                     # Static route, metadata, global styles
├── src/fonts/                   # Licensed local font files and manifest
├── src/landing/                 # Reviewed copy, page sections, client interactions
├── tests/e2e/landing.spec.ts    # Browser consumer and static-export checks
├── tests/unit/                  # RTL tests and shared setup
├── playwright.config.ts         # Local static-origin browser configuration
└── vitest.config.ts             # Unit test configuration
```

For hosting activation, DNS, CSP, release gates, and rollback prerequisites, see [docs/deployment.md](./docs/deployment.md). The runbook is not authorization to provision accounts, domains, billing, analytics, or production deployment.
