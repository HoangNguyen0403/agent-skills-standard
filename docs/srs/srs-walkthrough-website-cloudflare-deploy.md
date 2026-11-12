# Design And Delivery Walkthrough: Website Cloudflare Deployment, Tag CI/CD, and Task Commands

Date: 2026-11-11
Slug: `website-cloudflare-deploy`
`operator_profile`: `technical`; `lane`: `direction`; `snc_tier`: `high`; `delivery_mode`: `extended`
Base commit: `d769484cf01d357fb7dd0139c444951b6581e8f0` (uncommitted working tree; no Cloudflare account provisioning, secret creation, or live deployment executed)

## Scope & Authority

- [BRD](../brd/brd-website-cloudflare-deploy.md) (SHA-256 `2dd45f295e96c97c253975724af276ab35848542f25ca93c330b81d4bf1fea58`) — `approved(requesting maintainer, 2026-11-11)`
- [PRD](../prd/prd-website-cloudflare-deploy.md) (SHA-256 `649824a0f1962a69dff187feebf77342596ef9b96d93d471d773fe7b7f9429fd`) — `approved(requesting maintainer, 2026-11-11)`
- [SRS](../srs/srs-website-cloudflare-deploy.md) (SHA-256 `b4fb0f087be0d4c0f4a8dc49f2a1d050ffb2bcf73cef6c749f322743f786b2ba`) — `approved(requesting maintainer, 2026-11-11)`
- Implementation run record: [20261111T144900Z-implement-feature.json](../../artifacts/runs/website-cloudflare-deploy/20261111T144900Z-implement-feature.json)

## Checks Run (Lanes)

| Lane | Result | Evidence |
| --- | --- | --- |
| YAML / JSON syntax | PASS | `js-yaml` parse of `.github/workflows/deploy-website.yml`; `JSON.parse` of `package.json` and `paseo.json` |
| Release tag parity | PASS | `rtk pnpm verify:release-tags`: 27 categories and 1 release reachable from `publish.yml` |
| Release CLI unit + CLI tests | PASS (RED -> GREEN) | `rtk pnpm test:release`: 18/18 passed (`scripts/release/release-website.test.ts` 7/7 RED before implementation -> 7/7 GREEN after) |
| Release CLI dry-run smoke | PASS | `rtk pnpm website:release -- --dry-run --version 0.1.1 --no-changelog`: exit `0`, printed `website-v0.1.1`, `website/package.json` unchanged |
| Workflow precondition guard matrix (negative + positive) | PASS (5/5) | Extracted `Determine Target & Validate Inputs` bash script from `.github/workflows/deploy-website.yml`: missing token exit `1`, HTTP prod exit `1`, mismatched `APPROVED_SITE_URL` exit `1`, preview forces `DEPLOYMENT_ENV=preview` + clears `APPROVED_SITE_URL`, prod happy path outputs `production` + `main` |
| Website typecheck, lint, format, unit | PASS | `website:typecheck` (`tsc --noEmit`), `website:lint` (`eslint .`), `format:check` (`prettier --check`), `website:test` (`vitest run`: 7 files / 80 tests) |
| Isolated preview & production export integrity | PASS | Clean builds with `SITE_URL=https://preview.example.invalid DEPLOYMENT_ENV=preview` (`Disallow: /`) and `SITE_URL=https://approved.example.invalid DEPLOYMENT_ENV=production APPROVED_SITE_URL=https://approved.example.invalid` (`Allow: /`); verified `index.html` canonical, `404.html`, `_headers` (4352 B), `robots.txt` |
| Local `verify`-job E2E (`http://127.0.0.1:4321`) | PASS (87/87) | `SITE_URL=http://127.0.0.1:4321 DEPLOYMENT_ENV=local rtk pnpm --filter @ags/website build && CI=true rtk pnpm website:e2e`: 87/87 passed across desktop/mobile/tablet Chromium (2.3m) |
| Workspace lint, CLI build, trace, SDLC | PASS | `rtk pnpm lint:check`, `rtk pnpm build`, `rtk pnpm audit:trace --slug website-cloudflare-deploy --required`, `rtk pnpm audit:sdlc` |
| Independent review (`Slice C` / `tier=high`) | **BLOCKED / NOT ASSESSED** | `Personal · Analysis & Review` (`omp/openai-codex/gpt-6.1-sol`, agents `4edd3fba` & `2b680df8`) errored with `code=usage_limit_reached` |
| Live Cloudflare Pages deploy & smoke (`AC-007`) | **BLOCKED / NOT ASSESSED** | External Cloudflare Pages project (`CF_PAGES_PROJECT`), canonical HTTPS `SITE_URL`/`APPROVED_SITE_URL`, and GitHub Environment secrets (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`) unprovisioned |

## Acceptance Criteria Trace

| Criterion | Status | Proof / Evidence |
| --- | --- | --- |
| `AC-001` (`REQ-001`, `SRS-001`) | PASS (repository content) | `website/docs/deployment.md:14-21` documents why Dashboard Workers Builds (`pnpm run build` -> `./cli`, `npx wrangler deploy`) must stay disconnected; `website/docs/deployment.md:114-139` documents `.github/workflows/deploy-website.yml`. |
| `AC-002` (`REQ-002`, `SRS-002`) | PASS (local `verify` parity) | `.github/workflows/deploy-website.yml:6-70` triggers only on `website-v*` / `workflow_dispatch`; `verify` flow executed locally (`typecheck`, `lint:check`, `test` 80/80, `build`, Playwright E2E 87/87). |
| `AC-003` (`REQ-002`, `SRS-002`) | PASS | `rtk pnpm verify:release-tags` passed (27 categories, 1 release); `.github/workflows/website.yml` untouched. |
| `AC-004` (`REQ-003`, `SRS-003`) | PASS (script-level proof) | Exact bash guard extracted from `.github/workflows/deploy-website.yml:81-135` exited `1` on missing `CLOUDFLARE_API_TOKEN`, non-HTTPS prod `SITE_URL`, and mismatched `APPROVED_SITE_URL`. |
| `AC-005` (`REQ-003`, `SRS-003`) | PASS | Preview guard forced `DEPLOYMENT_ENV=preview` + empty `APPROVED_SITE_URL` (`Disallow: /`); production build emitted matching HTTPS canonical + `Allow: /`. |
| `AC-006` (`REQ-004`, `SRS-004`) | PASS (workflow contract & local export check) | `.github/workflows/deploy-website.yml:159-220` verifies `index.html`, `404.html`, `_headers`, `robots.txt` and invokes pinned `pnpm dlx wrangler@4.148.0 pages deploy website/out`; live GitHub Actions runner upload unexecuted until Secrets exist. |
| `AC-007` (`REQ-004`, `SRS-004`) | **BLOCKED (external provisioning)** | `.github/workflows/deploy-website.yml:221-261` implements retry `GET /` `200`, header assertions, and `404` check; live Cloudflare Pages execution blocked on `CF_PAGES_PROJECT`, `SITE_URL`/`APPROVED_SITE_URL`, and `CLOUDFLARE_*` secrets. |
| `AC-008` (`REQ-005`, `SRS-005`) | PASS | `scripts/release-website.ts` `--dry-run --version 0.1.1 --no-changelog` exited `0` and left `website/package.json` unchanged (verified by `release-website.test.ts` and CLI run). |
| `AC-009` (`REQ-005`, `SRS-005`) | PASS (unit + explicit staging proof; live push not executed) | `release-website.test.ts` verified `parseSemver`, `buildWebsiteVersionChoices`, `buildWebsiteTagName`, `resolveFilesToStage` (no `git add .`), and `buildWebsiteReleasePlan` (18/18 `test:release` pass). |
| `AC-010` (`REQ-006`, `SRS-006`) | PASS | `package.json`, `paseo.json`, and `website/README.md` validated via `JSON.parse`, `pnpm website:*` execution, and content inspection. |

## Negative Testing Proof

- Workflow guard tests `T1`–`T3` verified non-zero fail-closed exits on missing `CLOUDFLARE_API_TOKEN`, HTTP `SITE_URL` in production, and `APPROVED_SITE_URL !== SITE_URL`.
- Preview guard test `T4` verified `APPROVED_SITE_URL` is cleared even if set in preview environment inputs.
- `scripts/release/release-website.test.ts` verified `parseSemver` and CLI `--version` reject invalid semver (`v1.0.0`, `1.2`, `abc`, `1.2.3-beta`) non-zero without mutating `website/package.json`.

## Evidence & Residual Risks

- `driver: playwright-test (@playwright/test 1.64.1, local Chromium 1248); evidence_dir: website/test-results (gitignored)`
- **Residual blocker 1 (Independent Review):** `Personal · Analysis & Review` hit `usage_limit_reached`; independent code/security review must pass before merging `tier=high` changes.
- **Residual blocker 2 (Live Activation):** Cloudflare Pages project, custom domain/origin, and GitHub `preview`/`production` Environment secrets remain unprovisioned.
- **Evidence lanes:** Technical repository checks `PASS` (partial; live deploy/edge smoke `BLOCKED`); Independent review `not assessed (profile exhausted)`; Business acceptance `not assessed`; Release `not assessed`.

## Next Workflow

`verify-work` complete with verdict **BLOCKED** (`feature_status` remains `implemented`) until: (1) independent Slice C review completes once `Personal · Analysis & Review` quota recovers, and (2) maintainer provisions Cloudflare Pages + GitHub Environments for `AC-007` live smoke / `uat-signoff` / `deploy-release`.
