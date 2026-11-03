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

## Landing discoverability & metadata verification — 2026-11-03

Minimal SEO and discoverability fixes, boundary contracts, and technical verification implemented under Task 2 (PRD Discoverability Readiness) on base revision `8f356928d7edd0bdb1fe224414efbd6b9e8192ac`:

1. **Metadata & Canonical Contracts (AC-002, AC-003, AC-006)**: `layout.tsx` generates `metadataBase` anchored strictly to `getSiteConfig().siteUrl`. Canonical resolves to `/` without accidental localhost/preview leaks in production artifacts. Social share images map to `/og/agent-skills-standard.png` (OpenGraph PNG 1200x630 status 200).
2. **Indexing Decision Table (AC-004)**: `site.ts` contains the 5-case indexing decision table; this task **verified existing predicate behavior** rather than adding a new decision rule. Local and preview environments remain strictly non-indexable (`noindex, nofollow`, robots disallow root), even if `APPROVED_SITE_URL` is configured. Only an explicit production HTTPS build matching `APPROVED_SITE_URL` sets `shouldIndex: true`.
3. **Robots & Sitemap Verification (AC-004, AC-005)**: `robots.ts` serves `Disallow: /` for non-indexing builds and `Allow: /` for approved production, referencing `${siteUrl}/sitemap.xml`. `sitemap.ts` omits unsupported `lastModified` to avoid inventing freshness or pinning guessed dates.
4. **Questions & Support Paths (AC-020, AC-021)**: Direct questions/feedback route in `content.ts` and `Footer.tsx` points to GitHub issues (`https://github.com/HoangNguyen0403/agent-skills-standard/issues`, reader resolved). Contribution route points directly to `CONTRIBUTING.md`. Route existence confirmed without assuming response SLA or active posting (logged-out Discussions inspection noted client category/filter loading limits).
5. **Technical Verification, Tests & Lab Evidence**:
   - **Unit Tests**: PASS 50 tests across 6 files (`rtk pnpm --filter @ags/website test`). Tests cover pure site configuration logic (`site.ts`: 5 indexing decision cases, robots allow/disallow rules, sitemap shape). Unit tests do **not** cover Next.js `layout.tsx` metadata (layout metadata is verified in browser/E2E static export head tags).
   - **Typecheck & Lint**: PASS `rtk pnpm website:typecheck` and `rtk pnpm website:lint` after test corrections.
   - **Static Build & Local Serve Limits**: PASS `SITE_URL=http://127.0.0.1:4321 DEPLOYMENT_ENV=local rtk pnpm website:build` (Next.js static export / CSP generation). Local served HTTP (`serve:export` at `127.0.0.1:4321`) does **not** enforce `website/public/_headers`; no edge or CSP enforcement is claimed.
   - **Browser E2E**: **Current post-F1/post-generation run PASS 78/78**, retries 0, exit 0 at `2026-11-03T03:52:18.772Z` (`evidence/browser-post-f1.json`, `evidence/runner-browser-post-f1.log`, source hashes recorded). Historical runs are retained as before-correction context only: the pre-F1 78/78 pass, and the earlier 72 pass/6 fail (canonical slash equivalence, footer duplicate locator) and 75 pass/3 fail (robots field-name case) runs, resolved by fixing protocol/landmark assertions without altering production code or skipping tests.
   - **Browser Smoke**: Smoke verified with JavaScript disabled, 375px and 1440px viewports; root returns 200, unknown path returns 404; title and description observed; meta noindex and robots disallow confirmed; canonical root resolves; sitemap contains no lastModified; OpenGraph PNG 1200x630 status 200. Chromium only; not native mobile device proof.
   - **Mobile Lighthouse Lab Audit**: **Current** post-F1/post-generation 3-run mobile Lighthouse 13.6.0 audit **PASS**: median score 100, LCP 1055.0604 ms, CLS 0.0004523810058988496, 3/3 runs complete with consistency true (`evidence/lighthouse-summary-post-f1.json`, timestamp `2026-11-03T03:54:47.081Z`; 375×667 DPR 2, 150 ms RTT, 1638.4 Kbps down, 750 Kbps up, 4× CPU, Node v26.0.0; lab data only, no field Core Web Vitals or INP). Historical runs are retained without cherry-picking: the earlier median 100 / LCP 1054.4064 ms / CLS 0 and the original 100 / 1054.5582 ms / 0.0004523810058988496 receipt, whose raw summary was cleared during Playwright test directory cleanup.
   - **Isolated Build Indexing Cases (AC-004)**: PASS. All 6 isolated static build cases completed and verified against actual head, robots, sitemap, and build logs: preview, prod HTTP, missing approved URL, and mismatched approved URL strictly emit `noindex, nofollow` and `Disallow: /`; matching approved production HTTPS emits `index, follow` and `Allow: /`; missing `SITE_URL` exits 1 with expected required error. Local isolated artifact proof only; strictly separate from unapproved deployed state (no public origin claim).
6. **Production Deployed State (AC-011, AC-023)**: **EXPLICITLY UNVERIFIED**. No public production domain has been provisioned, deployed, or submitted for search indexing. Local and preview verification passes do not constitute production indexing proof.
7. **Claim Integrity (AC-013, review finding F1)**: **PASS — claim/render closure complete (independent closure completed in the original 43-file package)**. `website/src/landing/content.ts` and `EvidenceSection.tsx` describe baseline/with-skill **transcript-assertion pass rates**, state that this is “not executable task verification or guaranteed rule adherence”, and drop the unsupported isolated claim. The rendered card was verified at 375px and 1440px with no horizontal overflow (`evidence/evidence-card-smoke.json`, `evidence-card-375.png`, `evidence-card-1440.png`); the immutable evals-report pin `73422bdeff746281177d55ccb7d2169471eb475a` resolved. Fresh post-generation typecheck, lint, unit (50 tests / 6 files) and static build passed, the full post-F1 E2E run passed 78/78 with retries 0 at `2026-11-03T03:52:18.772Z`, and the post-F1 3-run mobile Lighthouse passed at median 100 / LCP 1055.0604 ms / CLS 0.0004523810058988496.
8. **Repository Metadata Observations and Recommendations (AC-022)**:
   - **Observed GitHub State (2026-11-03)**:
     - About: "A collection of Agent Skills Standard and Best Practice for Programming Languages, Frameworks that help our AI Agent follow best practies on frameworks and programming laguages"
     - Homepage: `https://www.npmjs.com/package/agent-skills-standard`
     - Topics: `agent-,agentic-ai,android,angular,best-practices,coding-standards,cursor-rules,flutter,golang,ios,kotlin,laravel,nestjs,nextjs,react,react-native,reactjs,spring-boot,typescript`
   - **Concrete Recommendations**:
     - Proposed About: "Portable coding standards and SDLC workflows for AI coding agents. Sync native guidance with a CLI; optionally serve skills through MCP."
     - Proposed Homepage: Keep existing npm package URL until an owner-approved public landing origin is deployed and verified; do not set an unapproved or placeholder origin.
     - Proposed Topics: `agent-skills,ai-agents,developer-tools,coding-standards,mcp`, retaining genuinely relevant existing framework topics and removing the malformed `agent-` tag.
     - Boundary: Recommendations only; no repository settings or GitHub account mutations performed.

## Landing page interaction polish and coverage clarity — 2026-11-02

The landing page features refined interaction dynamics and comprehensive coverage transparency across five bounded capability slices:

1. **Section Navigation (AC-LP-01, AC-LP-07)**: Header, mobile menu, and call-to-action links retain native anchor behavior with an 80px section offset. Scrolling and button interactions provide visible, layout-stable focus and active press feedback.
2. **Interactive Walkthrough Transitions (AC-LP-02, AC-LP-07)**: Selecting TypeScript (`checkout.ts`), React (`Button.tsx`), or Go (`checkout_test.go`) directly triggers a bounded transition without requiring manual Replay. Selection updates the trigger file, matching pattern, category index, skill name/path, rule excerpt, and GitHub source link coherently. Rapid selection changes cancel in-flight animations and settle reliably on the latest selection without stale content or accumulating RAF callbacks.
3. **Streamlined Setup & Progressive Typewriter (AC-LP-03, AC-LP-04, AC-LP-07)**: Quick Start recommends global CLI installation (`npm install -g agent-skills-standard@latest`) and alias execution (`ags init`, `ags sync`), backed by secondary zero-install `npx` alternatives. Commands use a bounded, one-shot typewriter reveal upon entering the viewport with reserved geometry. Semantic full command strings are accessible in the DOM before hydration and with JavaScript disabled; copy actions immediately copy complete command strings regardless of animation state.
4. **Supported Coverage Catalog (AC-LP-05, AC-LP-06, AC-LP-07)**: `CoverageSection` is mounted at `#skills`, presenting canonical registry coverage categorized into languages, frameworks, specialist agents, product management (distinguishing default BRD/PRD foundation from optional capabilities), and quality engineering. The section articulates architectural distinctions between rule-based guidance skills, host-native specialist subagents, and multi-phase SDLC workflows, providing direct source links to each catalog without unverified headline claims. The specimen section is preserved at `#specimen`.
5. **Accessibility & Responsive Resilience**: Immediate static fallbacks for reduced-motion visitors (`prefers-reduced-motion`), full keyboard operability with high-contrast outlines, readable long commands with internal horizontal scrolling, and zero horizontal viewport overflow across 320px–1440px viewports.

Verified locally on 2026-11-02: TypeScript, ESLint, static export/CSP generation, and all 20 unit tests passed. Browser evidence covers all 72 desktop/mobile/tablet cases: 66 unchanged cases passed in the full run, and all 6 affected navigation/responsive cases passed the final focused retest. Coverage passed Axe's serious/critical checks; clipboard recovery, copying during typing, real animation capacity/cancellation, no-JavaScript behavior, and 320px–1440px overflow scenarios remain covered. A separate browser smoke verified direct anchor positioning, Back navigation, smooth scrolling, and immediate reduced-motion command readability. Independent source/test review closed all findings. Human acceptance and production activation remain separate and are not implied.

## Interactive hero and setup handoff — 2026-10-25

The hero offers curated TypeScript (`checkout.ts`), React (`Button.tsx`), and Go (`checkout_test.go`) examples. Each selection displays its file trigger, category index, matching skill, source excerpt, and GitHub source link. This is an illustrative walkthrough, not live agent execution. Update `src/landing/hero-examples.data.ts` against the canonical skill files when changing examples.

Headline and CTA entrances share one observed motion boundary, completing within 520ms; the existing finite routing highlight and Replay lifecycle remain intact. Overlaid, accessibility-hidden sizing layers reserve the complete example geometry so switching does not resize the panel. Reduced-motion visitors receive immediate states. Without JavaScript, the default explanation and source link remain readable, selectors are disabled, and Replay is absent.

Quick start presents prerequisites and setup documentation before two numbered steps: initialize repository configuration, then sync standards. Copy feedback does not imply that either command has executed.

Local verification passed typecheck, lint, formatting, static export/CSP generation, 14 unit tests, and all 63 existing Chromium browser cases across desktop/mobile/tablet. The installed lockfile's jsdom/Undici stack failed to initialize under the host Node 22.14 runtime; the same unit suite passed under an isolated Node 24.22.1 runtime, without dependency or configuration changes. The Vite native-config migration warning remains.

A separate production-export browser smoke verified keyboard selection, source-link alignment, setup navigation, reduced motion, no-JavaScript content, and no horizontal page overflow. Panel heights stayed identical through all example switches at 320px, 375px, 768px, and 1440px. Independent source review found no remaining substantive findings after motion ownership and sizing fixes. These are local implementation receipts, not measured conversion uplift, a new Lighthouse result, human usability sign-off, or deployment approval.

The specimen no longer displays its source-revision badge; its pinned **View source** link remains. Hero sample filenames now use a 480ms stepped typewriter reveal on routing entry and Replay, without timers, looping cursors, or changing layout width. Reduced-motion and no-JavaScript states show the complete filename.

After this refinement, typecheck, lint, static export/CSP generation, 14 unit tests (isolated Node 24), and all 63 Chromium browser cases passed. A targeted real-animation smoke measured clip progression from 100% hidden through 54.5455% to fully revealed, with the filename width unchanged at 92.40625px. It also verified no page overflow at 320px/375px/768px, reduced-motion/static no-JavaScript fallbacks, retained source links, and no browser page errors. Independent source review reported no substantive findings; mobile visual inspection confirmed removal of the badge.

## Final local verification checkpoint — 2026-10-09

The settled website source passed scoped typecheck, lint, format check, and Next.js static export/CSP generation. Unit tests passed 12/12 across three files, including the motion-observer disposal regression (actual RED: stale callback changed `idle` to `complete`; unchanged test GREEN after the disposed-effect guard). The complete Playwright run passed 63/63 cases: 21 consumer cases across Chromium desktop, mobile, and tablet presets, with retries disabled, in 39.1 seconds. Coverage is diagnostic only; these results do not establish full-page coverage or substitute for root recursive CI.

The browser run exercised finite entrance/Replay/capacity/offscreen/reduced-motion behavior; clipboard granted, denied, absent, and retry paths; menu and FAQ keyboard/focus behavior; responsive widths/reflow; no-JavaScript access; axe with zero serious/critical violations; and a real 404. Four capacity scenarios used explicit 1440×4000 DOM-only geometry; ordinary device presets and separate responsive checks remained unchanged. Raster capture was disabled. The hidden-document case is simulated, not proof of OS/background-tab behavior; no non-Chromium or physical-device coverage is claimed. A targeted independent review approved the final source/specification; it is not whole-branch or human/release approval.

An isolated no-JavaScript Chrome 134 smoke with browser-context JavaScript disabled verified native Tab focus on the init command `<pre>` at 320px and 375px widths, a 16px font and visible 3px focus outline/offset, native ArrowRight scrolling (0→5.5px and 0→30px), and no root/body overflow. Replay was absent without JavaScript. The 375×800 viewport was visually inspected; the focus ring was visible and unclipped. A native CLI no-JavaScript attempt timed out, so a standalone version-matched Playwright run was used; no product behavior or exact driver root cause is inferred.

The pre-publication three-run mobile Lighthouse receipt is timestamped 2026-10-09T13:51:23.447Z. Median performance score was 98, LCP 2,308.9413 ms, and CLS 0.0004520026343649764; all three runs completed without errors and passed thresholds of score ≥90, LCP ≤2,500 ms, and CLS ≤0.1. Runs used Node 22.14.0, Lighthouse 12.3.0, Chromium 134, 375×667 at DPR 2, 150 ms RTT, 1,638.4 Kbps down, 750 Kbps up, and 4× CPU throttling with full-page raster disabled. This is local lab evidence only—not field INP, public-edge validation, or launch authorization.

The publication checkout uses Node 20-compatible Vitest 4.1.11 (native workers, no Tinypool), patched Playwright 1.55.1, and narrow security overrides for `get-uri@6>basic-ftp` 6.2.1, `serve@14>compression` 1.8.2 and `serve-handler@6>minimatch` 3.1.4. Node 20.20.2 recursive coverage passed (CLI 1,254, MCP 181, website 12); server reports no tests found under its existing `--passWithNoTests`. A browser run exposed a supplementary CSS-event timestamp assertion failure even though the exact original animations' cancellation outcomes and real capacity checks passed. The duplicate event-name/timestamp assertions were removed; exact `Animation.finished` rejection, ownership, admission, and finite-completion checks remain mandatory. The full 63-case browser suite then passed without retries on real Chromium 140.0.7339.186 in 42.4 seconds; page source is unchanged.

A final quiet Lighthouse 12.3.0 receipt at 2026-10-09T17:28:57.773Z, on Node 22.14.0 / Chromium 140 with the same mobile/throttling settings, completed all three runs (99/99/98): median score 99, LCP 1,806.5733 ms, CLS 0.0004523810058988496. Real compressed requests through the patched preview server returned gzip/root 200 and gzip/unknown-path 404. Production dependency audit reported no known vulnerabilities; the full development audit still reports 8 findings (2 critical, 3 high, 3 moderate) and is not security clearance. These are local receipts, not hosted verification or launch approval.

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
