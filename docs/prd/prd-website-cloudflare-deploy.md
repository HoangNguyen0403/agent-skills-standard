# Feature Plan: Website Cloudflare Deployment, Tag CI/CD, and Task Commands

Status: Approved (`approved(requesting maintainer, 2026-11-11)`, evidence: maintainer replied "ok" to PRD summary); Brief approval: `approved(requesting maintainer, 2026-11-11)` ([brd-website-cloudflare-deploy.md](../brd/brd-website-cloudflare-deploy.md), SHA-256 `2dd45f295e96c97c253975724af276ab35848542f25ca93c330b81d4bf1fea58`)
Slug: `website-cloudflare-deploy`
`operator_profile`: `technical`; `lane`: `direction`; `snc_tier`: `high` (`S=2 N=2 C=2 total=6`); `model_tier`: `strong`; `delivery_mode`: `extended`
Product / release / acceptance owner: requesting repository maintainer. Engineering owner: assigned implementer(s) after plan approval. QA / review owner: independent reviewer. Merge / Cloudflare provisioning / live activation authority: requesting repository maintainer only.

## Decision Brief

- **Changes since approved revision:** Elaborated approved Direction brief (Slice 1 + Slice 2) into canonical `REQ-001`..`REQ-006`, `AC-001`..`AC-010`, environment/indexing decision table, security/failure extension (`delivery_mode: extended`), and demonstrable vertical slices. No scope expansion beyond the approved brief.
- **Recommendation:** Implement `.github/workflows/deploy-website.yml` triggered on `website-v*` tags (plus gated `workflow_dispatch`) deploying `website/out` to **Cloudflare Pages** via `wrangler pages deploy`, reconcile `website/docs/deployment.md` (explicitly rejecting the screenshot's Dashboard Worker `pnpm run build` + `npx wrangler deploy` path), and add `scripts/release-website.ts` + `package.json` + `paseo.json` task/release commands.
- **Impact if wrong:** Using the screenshot's `pnpm run build` builds `./cli` instead of `@ags/website`; deploying without fail-closed `SITE_URL` / `APPROVED_SITE_URL` / Environment approval risks failed builds, leaked `*.pages.dev` indexing, or unintended public exposure.
- **Evidence and limitations:** Repo build, indexing predicate (`website/src/app/site.ts`), CSP header generator (`website/scripts/generate-headers.mjs`), existing CI (`website.yml`), and release patterns (`release-server.ts`, `deploy-server.yml`, `paseo.json`) are `confirmed(<path>)`. Cloudflare account, project name, secrets, and live Cloudflare Pages edge behavior remain `unknown` / unprovisioned. Deep-brief independent planner check was `not assessed` (`Personal · Analysis & Review` exhausted at `usage_limit_reached`).
- **Unresolved decision (activation-only, does not block design/implementation):** Exact Cloudflare Pages project name, preview/production `SITE_URL` & `APPROVED_SITE_URL`, and GitHub Environment secrets (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`) — owner: requesting maintainer — affected slice: live workflow execution in Slice A.
- **Approval sought:** Approve this PRD and delivery plan (`design-solution` next, or execution mode after design). Confers no implementation, Cloudflare account provisioning, secret creation, spend, merge, or deploy authority.
- **Independently ready slices:** Slice A (Tag CI/CD & runbook reconciliation) and Slice B (`release-website.ts`, `package.json`, `paseo.json` task commands) have clean file boundaries and can be designed/implemented concurrently once `design-solution` settles exact workflow/CLI contracts; Slice C (independent review) consumes both.

## Outcome And Guardrails

- **Outcome:** Maintainers can cut and push a `website-v*` release tag via a single workspace/package command, automatically verifying `@ags/website` (`website-gate` parity) and deploying `website/out` to Cloudflare Pages under strict origin, indexing, CSP, and human-environment approval controls.
- **Guardrails:**
  - Keep root CI compatible with Node `20.x` (`confirmed(website/docs/deployment.md:10)`); run `@ags/website` build/CI on Node `22.x`.
  - Preserve `website/src/app/site.ts` `SITE_URL`, `DEPLOYMENT_ENV`, and `APPROVED_SITE_URL` fail-closed/noindex logic (`confirmed(website/src/app/site.ts:12-92)`).
  - Preserve `website/scripts/generate-headers.mjs` CSP generation and strict HTTP `404` (`404.html`, no SPA fallback) (`confirmed(website/docs/deployment.md:63,75-80)`).
  - Keep GA4 live collection disabled by default (`confirmed(website/docs/analytics.md:5-10)`).
  - Do not connect Cloudflare Dashboard Worker auto-builds (`pnpm run build` -> `./cli`), and do not deploy on PRs or regular branch pushes (`confirmed(.github/workflows/website.yml:101)`).
  - Do not break `scripts/verify-release-tags.ts` (`skills/metadata.json` <-> `.github/workflows/publish.yml` parity check).

## Scope And Capability Inventory

- **Scope fence:** `@ags/website` static deployment automation, deployment/task documentation, and repo-level release/task commands (`scripts/`, `package.json`, `paseo.json`, `.github/workflows/`).

| Capability | Parent | Classification | Target Trace |
| --- | --- | --- | --- |
| Reconcile Cloudflare Pages runbook vs Worker dashboard UI | Hosting Governance | `in_scope` | `REQ-001` (`AC-001`) |
| Gate tag-triggered CI build & verification (`website-v*`) | Deployment CI/CD | `in_scope` | `REQ-002` (`AC-002`, `AC-003`) |
| Enforce fail-closed origin, indexing, and GitHub Environment secrets | Deployment Security | `in_scope` | `REQ-003` (`AC-004`, `AC-005`) |
| Deploy `website/out` to Cloudflare Pages and smoke-check `/` + `404` | Deployment CI/CD | `in_scope` | `REQ-004` (`AC-006`, `AC-007`) |
| Create `website-v*` release tags & changelog entries via CLI (`scripts/release-website.ts`) | Release Automation | `in_scope` | `REQ-005` (`AC-008`, `AC-009`) |
| Expose easy website build/verify/release task commands (`package.json`, `paseo.json`) | Developer Tasks | `in_scope` | `REQ-006` (`AC-010`) |
| Add `.vscode/tasks.json` | Developer Tasks | `deferred` | Explicit owner confirmation not requested; optional follow-up if needed |
| Provision Cloudflare account, DNS, API tokens, or enable GA4 | Live Operations | `excluded` | Out of repo code scope; owner-operated outside repo |
| Migrate `@ags/website` from `output: 'export'` to SSR Workers | Hosting Architecture | `excluded` | Explicit non-goal in approved brief |

## Requirements And Acceptance Criteria

| Req ID | Requirement | Owner | Priority | Status | Source |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Reconcile `website/docs/deployment.md` with the Cloudflare Dashboard Worker UI screenshot, documenting why Dashboard `pnpm run build` + `npx wrangler deploy` must not be used and specifying tag-triggered Cloudflare Pages deployment (`website-v*`). | CI/Release owner | P0 | Draft | BRD `AC-001` |
| REQ-002 | Provide `.github/workflows/deploy-website.yml` triggered on `push.tags: ['website-v*']` (and optional `workflow_dispatch` preview/production input) running Node `22.x`, `pnpm install --frozen-lockfile`, typecheck, lint, unit tests, static build, and Playwright E2E before any deploy step. | CI/Release owner | P0 | Draft | BRD `AC-002` |
| REQ-003 | Enforce fail-closed origin, indexing, and credential boundaries in `deploy-website.yml`: require explicit `SITE_URL`, keep `DEPLOYMENT_ENV=preview` (`noindex`) unless deploying `production` with owner-approved `APPROVED_SITE_URL` + GitHub Environment human approval, and fail closed when `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, or `CF_PAGES_PROJECT` are missing. | CI/Release owner | P0 | Draft | BRD `AC-003`, `AC-005` |
| REQ-004 | Deploy verified `website/out` (including generated `_headers` and `404.html`) to Cloudflare Pages via pinned `wrangler pages deploy` and run a post-deploy HTTP smoke check (`/` -> `200`, unknown path -> `404`, expected security headers present) against the returned deployment URL. | CI/Release owner | P0 | Draft | BRD `AC-004` |
| REQ-005 | Provide `scripts/release-website.ts` matching repo release CLI conventions (`scripts/release-server.ts`): inspect `website/package.json` version and git logs since previous `website-v*` tag, bump version, update `CHANGELOG.md`, support `--dry-run` / `--no-edit`, create commit + `website-v<version>` tag, and push only on interactive confirmation. | Tooling owner | P0 | Draft | BRD Slice 2 |
| REQ-006 | Configure root `package.json` (`website:release`, `website:test`, `website:e2e`, and verify existing `website:*` scripts) and `paseo.json` workspace tasks (`website:build`, `website:typecheck`, `website:lint`, `website:test`, `website:release`) and document usage in `website/README.md`. | Tooling owner | P1 | Draft | BRD Slice 2 |

| AC ID | Req ID | Given | When | Then | Owner | Verification lane |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | `website/docs/deployment.md` and `package.json` exist | A maintainer reads the Cloudflare setup guidance | The doc explicitly warns that root `pnpm run build` builds `./cli`, documents the Cloudflare Pages vs Workers Builds UI difference, and specifies `website-v*` tag CI/CD inputs/secrets without assuming provisioned accounts. | Independent reviewer | Doc & contract inspection |
| AC-002 | REQ-002 | A `website-v*` tag is pushed (or `workflow_dispatch` is run) | `.github/workflows/deploy-website.yml` triggers | It runs on Node `22.x` with `pnpm install --frozen-lockfile`, executes `typecheck`, `lint:check`, `test:cov`, `build`, and `test:e2e` before deploy, and does not trigger on PRs, branch pushes, or non-`website-v*` tags. | CI/Release owner | Workflow validation & dry-run check |
| AC-003 | REQ-002 | Existing root CI and `website-gate` workflows | `.github/workflows/deploy-website.yml` and `website/package.json` changes are tested | `pnpm verify:release-tags` passes and `.github/workflows/website.yml` continues to pass `website-gate` without deploying on PRs. | Independent reviewer | Existing CI check (`verify:release-tags`) |
| AC-004 | REQ-003 | Required Cloudflare secrets/vars (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CF_PAGES_PROJECT`, or `SITE_URL`) are absent | The deploy job evaluates preconditions | The workflow exits non-zero before invoking `wrangler pages deploy` and never falls back to a hardcoded or placeholder domain. | CI/Release owner | Workflow guard / unit test |
| AC-005 | REQ-003 | Target environment is `preview` vs `production` | The static build runs in CI | `preview` sets `DEPLOYMENT_ENV=preview` with `APPROVED_SITE_URL` unset (`shouldIndex === false`); `production` requires the `production` GitHub Environment gate and sets `DEPLOYMENT_ENV=production` + matching HTTPS `SITE_URL` & `APPROVED_SITE_URL`. | CI/Release owner | Build env matrix verification |
| AC-006 | REQ-004 | Pre-deploy verification passed and `website/out/_headers` + `website/out/404.html` exist | The deploy step runs `wrangler pages deploy website/out` | It uses the explicit project name and branch/tag metadata (`--branch` / `--commit-hash`), records the deployment URL, and exposes no secrets in logs. | CI/Release owner | Workflow contract / authorized live run |
| AC-007 | REQ-004 | A Cloudflare Pages deployment URL is returned by `wrangler` | The post-deploy smoke step checks the live URL | `GET /` returns HTTP `200` with CSP/security headers, and `GET /__nonexistent-check` returns HTTP `404` (`measure first` for live latency/timing). | QA / Release owner | Post-deploy smoke (`not assessed` until authorized run) |
| AC-008 | REQ-005 | Working tree and `website/package.json` exist | `pnpm website:release --dry-run` is executed | The CLI prints current/target version, `website-v<version>` tag, changelog preview, and planned git commands without modifying files, committing, tagging, or pushing. | Tooling owner | CLI automated / `--dry-run` smoke |
| AC-009 | REQ-005 | Confirmed interactive run of `scripts/release-website.ts` on clean/intended diff | Operator confirms release execution | `website/package.json` version and `CHANGELOG.md` are updated, committed as `chore(release): website-v<version>`, tagged `website-v<version>`, and pushed only after explicit confirmation (and fails safely if tag collision is declined). | Tooling owner | Unit test (release helper) + manual/isolated git test |
| AC-010 | REQ-006 | Updated `package.json`, `paseo.json`, and `website/README.md` | Maintainer runs `paseo.json` / `pnpm` scripts or `audit:sdlc` | `paseo.json` parses as valid JSON with `website:*` tasks (`website:build`, `website:typecheck`, `website:lint`, `website:test`, `website:release`), `pnpm website:*` scripts resolve cleanly, and `website/README.md` documents them accurately. | Independent reviewer | Config validation & command smoke |

## Decision Table: Environment, Origin, and Indexing Matrix (`REQ-003`)

| Trigger / Input | GitHub Environment | `DEPLOYMENT_ENV` | `SITE_URL` | `APPROVED_SITE_URL` | `shouldIndex` | Cloudflare Target |
| --- | --- | --- | --- | --- | --- | --- |
| `workflow_dispatch` (`target=preview`) | `preview` (optional review) | `preview` | Preview/canonical HTTPS URL (env/var) | Unset | `false` (`noindex`) | Pages preview branch deploy |
| `push` tag `website-v*` (or `workflow_dispatch` `target=production`) | `production` (required human reviewer) | `production` | Owner-approved HTTPS origin (required) | Same HTTPS origin as `SITE_URL` (required) | `true` (`index, follow`) | Pages production branch (`main`) |
| Missing `SITE_URL` or missing Cloudflare secrets/project | Any | N/A | Missing | N/A | N/A | **Fail closed** (exit 1 before build/deploy) |

## Security, Failure & Governance Extension (`delivery_mode: extended`)

- **Least-privilege credentials:** `CLOUDFLARE_API_TOKEN` scoped strictly to `Cloudflare Pages: Edit` on the target account (`CLOUDFLARE_ACCOUNT_ID`), stored in GitHub Environment secrets (`production` / `preview`), never in workflow files, `package.json`, or `website/out`.
- **GitHub Environment gate:** `production` environment configured with required human reviewers so even pushing a `website-v*` tag pauses before live production deployment until a maintainer approves the deployment run in GitHub Actions.
- **Permissions:** `deploy-website.yml` top-level `permissions: contents: read` (and `deployments: write` only if recording GitHub deployment status).
- **CSP & Header safety:** `deploy-website.yml` verifies `website/out/_headers` and `website/out/404.html` exist and non-empty before upload; live edge enforcement of `_headers` is checked post-deploy (`AC-007`) because local `serve:export` does not enforce `_headers`.
- **Rollback:** Rollback uses Cloudflare Pages deployment history (re-promoting a previously verified production deployment) or re-running `deploy-website.yml` on the prior verified `website-v*` tag; first launch has no prior production rollback target and requires owner-acknowledged recovery per `website/docs/deployment.md:24,131`.

## Open Consequential Decisions

| Decision | Owner | Affected slice | Required input |
| --- | --- | --- | --- |
| Provision Cloudflare Pages project, `CF_PAGES_PROJECT` name, canonical HTTPS `SITE_URL`/`APPROVED_SITE_URL`, and GitHub Environment secrets (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`) | Requesting maintainer | Slice A (live execution only; does not block `design-solution` or repo implementation) | Configured GitHub Environments (`production`, `preview`), vars, and secrets outside repo |
| Re-run independent planner/design review once analysis/review profile quota recovers | Requesting maintainer / QA | Slice C / `design-solution` | Available eligible analysis/review profile (`Personal · Analysis & Review`) |

## Status And Receipt

- `feature_status`: `requirements_ready` (inherited from approved brief `docs/brd/brd-website-cloudflare-deploy.md`, SHA-256 `2dd45f295e96c97c253975724af276ab35848542f25ca93c330b81d4bf1fea58`).
- Run record: not yet emitted (`artifacts/runs/` run-record creation is optional/downstream; no fake run ID fabricated).
- Completed: brief alignment, capability inventory, canonical `REQ-001`..`REQ-006` / `AC-001`..`AC-010`, environment decision table, security/failure extension, and vertical feature slicing.
- Missing: `design-solution` technical contract spec, plan/implementation-mode approval, implementation, verification runs, and owner-provisioned Cloudflare secrets/origin.

## References

- Approved brief: `docs/brd/brd-website-cloudflare-deploy.md` (SHA-256 `2dd45f295e96c97c253975724af276ab35848542f25ca93c330b81d4bf1fea58`)
- Hosting & security runbook: `website/docs/deployment.md`, `website/docs/analytics.md`, `website/README.md`
- Website source & build: `website/next.config.ts`, `website/src/app/site.ts`, `website/package.json`, `website/scripts/generate-headers.mjs`, `website/public/_headers`
- Existing CI & release scripts: `.github/workflows/website.yml`, `.github/workflows/deploy-server.yml`, `.github/workflows/publish.yml`, `scripts/release-server.ts`, `scripts/release-utils.ts`, `scripts/verify-release-tags.ts`, `package.json`, `paseo.json`

## Implementation Plan, Task Slices And Verification Plan

### Feature Slices

| Slice | Owner Role & Owned Files | Contract & Behavior | Dependencies | Size / Confidence | Routing Hint (`model_tier`) |
| --- | --- | --- | --- | --- | --- |
| **Slice A: Tag CI/CD & Runbook Reconciliation** | CI/Release Engineer: `.github/workflows/deploy-website.yml` (new), `website/docs/deployment.md` | `REQ-001`–`REQ-004` (`AC-001`–`AC-007`): tag-triggered `website-v*` + `workflow_dispatch` Cloudflare Pages deploy workflow with pre-deploy `website-gate` checks, fail-closed env/secret guards, `_headers`/`404.html` checks, smoke check, and reconciled Pages-vs-Worker runbook docs. | Approved `design-solution` & plan; independent of Slice B | M / high | `standard` (bounded workflow + doc edits after `design-solution` contract; human gate on sensitive secrets/workflow) |
| **Slice B: Release Tag CLI & Task Commands** | Tooling Engineer: `scripts/release-website.ts` (new), `scripts/release/release-website.test.ts` (or existing test location), `package.json`, `paseo.json`, `website/README.md` | `REQ-005`–`REQ-006` (`AC-008`–`AC-010`): interactive semver/changelog/commit/`website-v*` tag CLI (`--dry-run`, `--no-edit`), root `package.json` `website:*` scripts, `paseo.json` workspace tasks, and README docs. | Approved `design-solution` & plan; independent of Slice A | M / high | `fast` / `standard` (matches existing `release-server.ts` pattern; low novelty) |
| **Slice C: Independent Review & Verification** | Independent Reviewer (no implementation ownership) | Reviews combined Slice A + B diff against `AC-001`..`AC-010`, security boundaries, `verify:release-tags`, `website:typecheck`/`lint`/`test`/`build`, and `release-website --dry-run`. | Slice A + Slice B | S / high | `strong` (eligible analysis/review profile) |

### Planned Verification Commands (Not Yet Executed)

1. `rtk pnpm verify:release-tags` — confirm `website-v*` in `deploy-website.yml` does not break `publish.yml` tag-parity checks.
2. `rtk pnpm --filter @ags/website typecheck && rtk pnpm --filter @ags/website lint:check && rtk pnpm --filter @ags/website test` — verify website checks remain intact.
3. `SITE_URL=http://127.0.0.1:4321 DEPLOYMENT_ENV=local rtk pnpm --filter @ags/website build` — confirm `website/out/_headers` and `website/out/404.html` emit cleanly.
4. `rtk pnpm website:release -- --dry-run` (plus unit tests for version/tag/changelog helpers) — verify Slice B dry-run behavior without mutating git history.
5. `rtk pnpm lint:check && rtk pnpm build` — verify root TypeScript/ESLint compatibility with new `scripts/release-website.ts` and `paseo.json` JSON validity.
6. Live Cloudflare Pages smoke (`AC-007`): deferred until maintainer provisions Cloudflare Pages project, `SITE_URL`/`APPROVED_SITE_URL`, and GitHub Environment secrets, and approves the first tag release.

## Next Workflow

`design-solution` (recommended because `snc_tier: high` + `delivery_mode: extended` touches CI/CD secrets, GitHub Environment gates, Cloudflare Pages deploy interface, and `scripts/release-website.ts` CLI contracts before `implementation-readiness` and `implement-feature`).
