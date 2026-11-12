# Technical Design (SRS/FRS): Website Cloudflare Deployment, Tag CI/CD, and Task Commands

Status: approved technical design for implementation-readiness (`approved(requesting maintainer, 2026-11-11)`)
slug: website-cloudflare-deploy
operator_profile: technical
lane: direction
snc_tier: high (`S=2 N=2 C=2 total=6`)
model_tier: strong
delivery_mode: extended
brief_approval: approved(requesting maintainer, 2026-11-11)
design_approval: approved(requesting maintainer, 2026-11-11)
repository_status: design_artifacts_only
activation_status: not_required

## Decision Brief

- **Changes since approved PRD:** Specified a two-job CI/CD workflow in `.github/workflows/deploy-website.yml` (`verify` with `SITE_URL=http://127.0.0.1:4321` for Playwright E2E, followed by `deploy` performing a clean rebuild with target `SITE_URL` / `DEPLOYMENT_ENV` / `APPROVED_SITE_URL`), exact fail-closed secret/origin checks, `scripts/release-website.ts` testable pure helpers + CLI contract, `package.json` / `paseo.json` task schemas, and `website/docs/deployment.md` reconciliation. No product scope change.
- **Recommendation:** Separate `verify` (local-origin static export so `website/tests/e2e/landing.spec.ts` canonical/robots assertions pass unmodified) from `deploy` (clean rebuild for `preview` or `production` GitHub Environment, pre-upload `_headers`/`404.html`/`robots.txt` validation, pinned `wrangler pages deploy website/out`, and post-deploy HTTP `200`/`404`/header smoke). Keep `scripts/release-website.ts` parallel to `scripts/release-server.ts`, isolating pure version/plan/git-arg helpers so Slice B is unit-tested without touching live git or `inquirer` TTY prompts.
- **Impact if wrong:** Running `test:e2e` against a production `SITE_URL` build fails `landing.spec.ts` (`http://127.0.0.1:4321` canonical/sitemap checks); conversely, deploying the `verify` artifact uploads `http://127.0.0.1:4321` canonical URLs to Cloudflare Pages. Weak secret/environment guards risk unreviewed production pushes or `noindex` regressions.
- **Evidence and limitations:** Inspected `website/tests/e2e/landing.spec.ts:1708-1741` and `website/playwright.config.ts:21,60-65` (`confirmed`), confirming E2E hardcodes `http://127.0.0.1:4321` and `serve:export`. Inspected `scripts/release-server.ts`, `scripts/release-utils.ts`, `scripts/verify-release-tags.ts`, `paseo.json`, and `package.json` (`confirmed`). Live Cloudflare Pages deploy and edge `_headers` remain `unknown` / `not assessed` until owner provisions Cloudflare project and secrets.
- **Unresolved decision (live activation only; does not block implementation-readiness or repo coding):** Owner-provisioned `CF_PAGES_PROJECT`, `SITE_URL`, `APPROVED_SITE_URL`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and GitHub Environment (`production`, `preview`) configuration — owner: requesting maintainer — affected slice: live workflow execution in Slice A.
- **Approval sought:** Approve this SRS/FRS technical design (including ADR and verification plan) to advance to `implementation-readiness`. Grants no code implementation, Cloudflare provisioning, credential creation, or deployment authority.
- **Independently ready slices:** Slice A (`deploy-website.yml` + `website/docs/deployment.md`) and Slice B (`scripts/release-website.ts` + tests + `package.json` + `paseo.json` + `website/README.md`) have disjoint file ownership and can run concurrently after `implementation-readiness`; Slice C (independent review) runs after both.

## Trace Source

- Approved BRD: [brd-website-cloudflare-deploy.md](../brd/brd-website-cloudflare-deploy.md) (SHA-256 `2dd45f295e96c97c253975724af276ab35848542f25ca93c330b81d4bf1fea58`, `approved(requesting maintainer, 2026-11-11)`)
- Approved PRD: [prd-website-cloudflare-deploy.md](../prd/prd-website-cloudflare-deploy.md) (SHA-256 `649824a0f1962a69dff187feebf77342596ef9b96d93d471d773fe7b7f9429fd`, `approved(requesting maintainer, 2026-11-11)`)
- Scope owner: requesting repository maintainer.
- Traced IDs: `REQ-001`..`REQ-006`, `AC-001`..`AC-010`.

## Architecture And Contract Delta

Audience: CI/release implementer, tooling implementer, independent reviewer, and repository maintainer. Communication: GitHub Actions workflow YAML, `wrangler` CLI invocation, interactive Node/TSX CLI, and static `paseo.json`/`package.json` config. No database, backend API, or runtime Worker service.

| HLD | Requirements | Component / Owner | Contract & Dependency Direction | Failure Domain |
| --- | --- | --- | --- | --- |
| HLD-001 | `REQ-001` | `CMP-RUNBOOK` / CI/Release Implementer | `website/docs/deployment.md` documents Cloudflare Pages GHA workflow, Worker UI warning, and Environment inputs (`LLD-RUNBOOK`) | Misconfigured Cloudflare Dashboard Worker build building `./cli` |
| HLD-002 | `REQ-002`, `REQ-003`, `REQ-004` | `CMP-DEPLOY-WF` / CI/Release Implementer | `.github/workflows/deploy-website.yml`: `verify` (Node 22 + local E2E) -> `deploy` (GitHub Environment gate + fail-closed env check + clean rebuild + `wrangler pages deploy` + live smoke) (`LLD-WORKFLOW`) | Unverified artifact deployed, leaked `127.0.0.1` canonical, missing secrets, or failed edge 404/CSP |
| HLD-003 | `REQ-005` | `CMP-RELEASE-CLI` / Tooling Implementer | `scripts/release-website.ts` -> `scripts/release-utils.ts` -> `website/package.json` + `CHANGELOG.md` + `git tag website-v*` (`LLD-RELEASE-CLI`) | Dirty/destructive git state, `--dry-run` mutating repo, or bad tag format |
| HLD-004 | `REQ-006` | `CMP-TASKS` / Tooling Implementer | `package.json` + `paseo.json` + `website/README.md` (`LLD-TASKS`) | Invalid JSON, broken script forwarding, or stale docs |

### Exact Proposed Artifact Ownership

| File | Owner | Role |
| --- | --- | --- |
| `.github/workflows/deploy-website.yml` | Slice A (CI/Release Implementer) | New tag-triggered + `workflow_dispatch` Pages deploy workflow |
| `website/docs/deployment.md` | Slice A (CI/Release Implementer) | Reconcile Cloudflare Pages GHA vs Dashboard Worker UI, inputs, and tag flow |
| `scripts/release-website.ts` | Slice B (Tooling Implementer) | New interactive release CLI + exported pure helpers for `website-v*` tags |
| `scripts/release/release-website.test.ts` | Slice B (Tooling Implementer) | Unit tests for `release-website.ts` pure helpers and CLI `--dry-run` contract |
| `package.json` | Slice B (Tooling Implementer) | Add `website:release`, `website:test`, `website:e2e` scripts |
| `paseo.json` | Slice B (Tooling Implementer) | Add `website:build`, `website:typecheck`, `website:lint`, `website:test`, `website:release` tasks |
| `website/README.md` | Slice B (Tooling Implementer) | Document `pnpm website:release` and `paseo.json` tasks |

`publish.yml`, `website.yml`, `deploy-server.yml`, `website/next.config.ts`, `website/src/app/site.ts`, and `scripts/verify-release-tags.ts` remain **unchanged**.

## Technical Requirements (SRS)

### SRS-001: Deployment Runbook Reconciliation
- **Statement:** `website/docs/deployment.md` MUST explicitly document why the Cloudflare Dashboard Worker setup UI (`pnpm run build` + `npx wrangler deploy`) must not be connected to `main` (root `build` builds `./cli`, omits `SITE_URL`, bypasses tag gating), and MUST specify the `.github/workflows/deploy-website.yml` inputs, GitHub Environments (`preview`, `production`), secrets, and `website-v*` release tag workflow.
- **Priority:** Must; **Status:** Draft; **Source:** `REQ-001`, `AC-001`.
- **Behavior / failure:** Documentation-only update; preserves all existing activation prerequisites, noindex gates, GA4 block, and rollback rules.
- **NFR / security impact:** Prevents accidental CLI build or unapproved `*.pages.dev` / Worker exposure via Dashboard auto-builds.
- **Verification:** Independent review — diff inspection against `package.json:23` and `deploy-website.yml`.

### SRS-002: Tag-Triggered Verification & Isolation Gate
- **Statement:** `.github/workflows/deploy-website.yml` MUST trigger only on `push.tags: ['website-v*']` and `workflow_dispatch` (with `target` choice `preview | production`, default `preview`), and its `verify` job MUST run on Node `22.x` with `pnpm install --frozen-lockfile`, executing `typecheck`, `lint:check`, `test:cov`, `build` (`SITE_URL=http://127.0.0.1:4321`, `DEPLOYMENT_ENV=local`), and `test:e2e` before `deploy` can start.
- **Priority:** Must; **Status:** Draft; **Source:** `REQ-002`, `AC-002`, `AC-003`.
- **Behavior / failure:** Any failure in `verify` aborts the workflow (`needs: verify`); PRs, branch pushes, and non-`website-v*` tags never trigger `deploy-website.yml`; `pnpm verify:release-tags` remains green.
- **NFR / security impact:** Top-level `permissions: contents: read`; no deploy credentials exposed to the `verify` job.
- **Verification:** Static YAML validation + `rtk pnpm verify:release-tags` + existing `website` test suite.

### SRS-003: Fail-Closed Environment, Origin, Indexing & Secret Guards
- **Statement:** The `deploy` job MUST bind to GitHub Environment `production` on `website-v*` tags (or `workflow_dispatch` with `target=production`) and `preview` on `workflow_dispatch` with `target=preview`, and MUST fail closed (exit 1 before build/deploy) if `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CF_PAGES_PROJECT`, or `SITE_URL` is empty, or if `production` lacks matching HTTPS `APPROVED_SITE_URL`.
- **Priority:** Must; **Status:** Draft; **Source:** `REQ-003`, `AC-004`, `AC-005`.
- **Behavior / failure:**
  - `preview`: `DEPLOYMENT_ENV=preview`, `APPROVED_SITE_URL=""` (forcing `shouldIndex=false` per `website/src/app/site.ts:83-86`).
  - `production`: `DEPLOYMENT_ENV=production`, `SITE_URL` must start with `https://`, `APPROVED_SITE_URL` must equal `SITE_URL`.
  - Clean rebuild runs `pnpm --filter @ags/website build` into a fresh `website/out` (never reusing the `verify` job's `127.0.0.1:4321` build).
- **NFR / security impact:** Secrets live solely in GitHub Environment secrets (`production`/`preview`); GA4 env vars remain unset/disabled by default.
- **Verification:** Logic inspection + build-env matrix check (`AC-004`, `AC-005`) + independent security review.

### SRS-004: Static Artifact Pre-Check, Pinned Pages Deploy & Live Smoke
- **Statement:** Before uploading, `deploy` MUST verify `website/out/index.html`, `website/out/404.html`, `website/out/_headers`, and `website/out/robots.txt` exist and contain the expected target `SITE_URL` / robots rule; deploy `website/out` via pinned `wrangler` (`pnpm dlx wrangler@4.148.0 pages deploy website/out ...` or pinned `cloudflare/wrangler-action`), capture the deployment URL, and run an HTTP smoke check verifying `GET /` returns `200` with CSP/security headers and `GET /__nonexistent-check` returns `404`.
- **Priority:** Must; **Status:** Draft; **Source:** `REQ-004`, `AC-006`, `AC-007`.
- **Behavior / failure:** Non-zero exit if required export files are missing, canonical origin in `website/out/index.html` mismatches `SITE_URL`, `wrangler` fails, or smoke returns non-200 on `/` / 200 SPA fallback on unknown path.
- **NFR / security impact:** Preserves `website/docs/deployment.md:89` pinned Wrangler `4.148.0`; no secret echoed in stdout; rollback via Cloudflare Pages prior verified deployment or re-running `deploy-website.yml` on prior verified `website-v*` tag.
- **Verification:** Local pre-check script/build verification (`SITE_URL=http://127.0.0.1:4321` & HTTPS build check); live edge smoke (`AC-007`) `not assessed` until owner provisioning & release approval.

### SRS-005: Website Release Tag CLI (`scripts/release-website.ts`)
- **Statement:** `scripts/release-website.ts` MUST read `website/package.json` version, compute semver bump options (`patch`, `minor`, `major`, `custom`), gather git subjects scoped to `website/` since `website-v<currentVersion>` via `getGitLogs`, optionally update `CHANGELOG.md` via `updateChangelog`, honor `--dry-run` (zero file/git mutations) and `--no-edit`, update `website/package.json`, commit `chore(release): website-v<version>`, tag `website-v<version>` (prompting before `-f` overwrite if tag exists), and push branch + tag on confirmation.
- **Priority:** Must; **Status:** Draft; **Source:** `REQ-005`, `AC-008`, `AC-009`.
- **Behavior / failure:** Export pure helpers (`computeWebsiteVersionChoices`, `formatWebsiteTag`, `buildReleasePlan`, `validateSemver`) so unit tests verify bump/tag/plan logic without TTY prompts or git writes; fail non-zero with clear error if `website/package.json` is missing or git push/tag fails.
- **NFR / security impact:** Uses `execFileSync('git', [...])` (argument array, no shell interpolation); never runs `wrangler` or stores Cloudflare credentials locally.
- **Verification:** Unit tests (`node --import tsx --test scripts/release/release-website.test.ts`) + `rtk pnpm website:release -- --dry-run` smoke.

### SRS-006: Root Package Scripts & Paseo Workspace Tasks
- **Statement:** Root `package.json` MUST add `website:release` (`tsx scripts/release-website.ts`), `website:test` (`pnpm --filter @ags/website test`), and `website:e2e` (`pnpm --filter @ags/website test:e2e`); `paseo.json` MUST add `website:build`, `website:typecheck`, `website:lint`, `website:test`, and `website:release` script entries; and `website/README.md` MUST document these commands.
- **Priority:** Should; **Status:** Draft; **Source:** `REQ-006`, `AC-010`.
- **Behavior / failure:** Preserves all existing `package.json` and `paseo.json` entries (`validate`, `lint`, `build`, `test`); JSON syntax must remain valid.
- **NFR / security impact:** `paseo.json` exposes no production deploy secret or unguarded direct deploy command; deployment happens through tagged CI/CD (`website:release` -> `website-v*` -> `deploy-website.yml`).
- **Verification:** JSON parse + `rtk pnpm lint:check` + `rtk pnpm website:typecheck` + `rtk pnpm website:test` + `rtk pnpm website:release -- --dry-run`.

## Selected LLD Contracts

### LLD-WORKFLOW: `.github/workflows/deploy-website.yml`

1. **Triggers:**
   - `push.tags: ['website-v*']` -> resolves `target = production`
   - `workflow_dispatch.inputs.target`: `choice` (`['preview', 'production']`, default `'preview'`)
2. **Job 1 — `verify` (`runs-on: ubuntu-latest`):**
   - `actions/checkout@v7`, `actions/setup-node@v7` (`node-version: "22.x"`), `pnpm/action-setup@v6`, `pnpm install --frozen-lockfile`.
   - `pnpm --filter @ags/website typecheck`, `lint:check`, `test:cov`.
   - `SITE_URL: http://127.0.0.1:4321`, `DEPLOYMENT_ENV: local` -> `pnpm --filter @ags/website build`.
   - `pnpm --filter @ags/website exec playwright install --with-deps chromium` -> `CI=true pnpm --filter @ags/website test:e2e`.
   - Upload `website/test-results` on `failure()`.
3. **Job 2 — `deploy` (`needs: [verify]`, `runs-on: ubuntu-latest`):**
   - `environment: ${{ (github.event_name == 'push' || inputs.target == 'production') && 'production' || 'preview' }}`
   - `permissions: contents: read, deployments: write`
   - **Precondition guard step (runs before checkout/build):**
     - Determine `TARGET` (`production` vs `preview`).
     - Assert non-empty `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` (secrets), `CF_PAGES_PROJECT` (vars), and `SITE_URL` (vars).
     - If `TARGET == 'production'`: assert `SITE_URL` starts with `https://` and `APPROVED_SITE_URL == SITE_URL`.
     - If `TARGET == 'preview'`: force `DEPLOYMENT_ENV=preview` and unset `APPROVED_SITE_URL`.
   - **Clean build step:**
     - `rm -rf website/out` (if any), then `pnpm --filter @ags/website build` with resolved `SITE_URL`, `DEPLOYMENT_ENV`, and `APPROVED_SITE_URL` (`NEXT_PUBLIC_GA4_*` deliberately unset).
   - **Export integrity guard:**
     - Assert `website/out/index.html`, `website/out/404.html`, `website/out/_headers`, `website/out/robots.txt` exist and are non-empty.
     - Assert `website/out/index.html` contains the resolved `SITE_URL` canonical link (never `127.0.0.1:4321`) and `robots.txt` matches `TARGET == 'production'` (`Allow: /`) vs `preview` (`Disallow: /`).
   - **Deploy step:**
     - Run pinned `pnpm dlx wrangler@4.148.0 pages deploy website/out --project-name "$CF_PAGES_PROJECT" --branch "$PAGES_BRANCH" --commit-hash "$GITHUB_SHA"` where `PAGES_BRANCH` is `main` for `production` (ensuring Cloudflare Pages treats tag deploys as production) and `preview/${GITHUB_REF_NAME#refs/heads/}` (or `preview-${GITHUB_RUN_ID}`) for `preview`.
     - Capture the emitted `https://*.pages.dev` URL via regex/JSON output to `$GITHUB_OUTPUT`.
   - **Post-deploy smoke step:**
     - Wait/retry boundedly (e.g., max 5 attempts, 3s apart) for `GET <deploy_url>/` HTTP `200` and `X-Content-Type-Options: nosniff` + `Content-Security-Policy` headers, and `GET <deploy_url>/__ags-smoke-404-check` HTTP `404`.

### LLD-RELEASE-CLI: `scripts/release-website.ts`

- Mirrors `scripts/release-server.ts` (`inquirer`, `picocolors`, `fs-extra`, `execFileSync('git', ...)`).
- Exports pure functions for testing:
  - `parseSemver(version: string): [number, number, number]` (throws on non-`X.Y.Z`)
  - `buildWebsiteVersionChoices(currentVersion: string)` -> Patch, Minor, Major, Custom
  - `buildWebsiteTagName(version: string)` -> `website-v${version}`
  - `buildWebsiteReleasePlan({ currentVersion, nextVersion, notes, hasChangelog })`
- Guard `isDirectRun` (`path.resolve(process.argv[1]) === path.resolve(__filename)`) matching `scripts/verify-release-tags.ts:143-147` so importing helpers in unit tests never executes `main()`.
- Note on `git add`: unlike `release-server.ts` (`git add .`), stage ONLY `website/package.json` and `CHANGELOG.md` (when modified) so unrelated dirty files in a developer's worktree are never swept into a release commit!

## Extensions (`delivery_mode: extended`)

### Security Controls & Human Gates
1. **No ambient credentials in `verify`:** Only `deploy` accesses `environment` secrets (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`).
2. **Human deployment approval:** GitHub `production` Environment requires maintainer review before `deploy` executes even after a `website-v*` tag is pushed.
3. **No unapproved indexing:** `preview` always clears `APPROVED_SITE_URL` (`noindex`); `production` fails closed if `APPROVED_SITE_URL !== SITE_URL` or non-HTTPS.
4. **Input safety:** `scripts/release-website.ts` uses `execFileSync('git', [...])` without shell expansion and stages explicit release files only.

### Failure Mode & Rollback Analysis

| Failure Mode | Detection | Recovery / Rollback |
| --- | --- | --- |
| `verify` fails (typecheck/lint/unit/E2E) | `verify` job exits non-zero; `deploy` skipped | Fix on branch/PR, cut new patch tag |
| Missing `CLOUDFLARE_*` secret or `SITE_URL` | Precondition guard fails before build/deploy | Provision secret/var in GitHub Environment and re-run failed job |
| `wrangler pages deploy` fails mid-upload | Non-zero exit in `deploy` step | Inspect Wrangler log; re-run job (Pages deployment is atomic per upload) |
| Live smoke sees `200` on 404 path or missing CSP | Smoke step fails workflow | Roll back in Cloudflare Pages dashboard to previous verified production deployment, or re-run `deploy-website.yml` on prior `website-v*` tag |
| `release-website.ts` aborted or tag exists | Interactive confirmation `false` or tag check prompt | Clean exit without push; delete local tag if needed |

### Concise ADR: Tag-Gated GitHub Actions Pages Deploy vs Cloudflare Dashboard Worker Builds

- **Context:** The user's Cloudflare Dashboard screenshot defaults to Workers Builds (`pnpm run build` + `npx wrangler deploy`), while `website/docs/deployment.md` specifies Cloudflare Pages (`website/out`) with strict origin/noindex/CSP/E2E gates.
- **Decision:** Deploy `website/out` to **Cloudflare Pages** exclusively via **GitHub Actions** triggered on `website-v*` tags (and manual `workflow_dispatch` previews), keeping Cloudflare's Dashboard Git auto-build disabled.
- **Consequences:** Ensures `pnpm --filter @ags/website build` + Playwright E2E + `SITE_URL` / `APPROVED_SITE_URL` + human Environment review always precede upload; avoids building `./cli` by mistake; preserves `website/docs/deployment.md` hosting model. Reversible by swapping `wrangler pages deploy` for `wrangler deploy` + `website/wrangler.jsonc` if the owner later elects Workers Static Assets.

## Blockers And References

- No design-time code blockers (`requirements_ready` -> `design_ready` pending design approval).
- Live activation dependency (external, does not block `implementation-readiness` or repo implementation): `blocked(live-deploy, requesting-maintainer, CF_PAGES_PROJECT + SITE_URL + APPROVED_SITE_URL + CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID + GitHub Environments)`.

## Status And Receipt

- `feature_status`: `design_ready` (pending maintainer design approval).
- Run record: not emitted (`artifacts/runs/` not generated; no fabricated run ID).

## Outcome Report (Machine Handoff)

```json
{"schema_version":1,"run_id":null,"slug":"website-cloudflare-deploy","workflow":"design-solution","feature_status":"design_ready","started_at":null,"completed_at":null,"requirement_trace":{"brd_objectives":[],"requirements":["REQ-001","REQ-002","REQ-003","REQ-004","REQ-005","REQ-006"],"acceptance_criteria":["AC-001","AC-002","AC-003","AC-004","AC-005","AC-006","AC-007","AC-008","AC-009","AC-010"],"srs":["SRS-001","SRS-002","SRS-003","SRS-004","SRS-005","SRS-006"]},"completed_evidence":["docs/brd/brd-website-cloudflare-deploy.md","docs/prd/prd-website-cloudflare-deploy.md","website/playwright.config.ts","website/tests/e2e/landing.spec.ts:1708-1741","scripts/release-server.ts","scripts/release-utils.ts","scripts/verify-release-tags.ts","paseo.json","package.json"],"missing_evidence":["human-design-approval","implementation-readiness-check","cloudflare-account-vars-and-secrets(live-only)"],"decision_needed":["Approve SRS/FRS technical design and proceed to implementation-readiness"],"recommended_next_workflow":"implementation-readiness","cost":{"source":"unavailable"},"agent":{"identity":"orchestrator","model":"google-antigravity/gemini-3.8-flash"}}
```

## Next Workflow

`implementation-readiness` (after scoped design approval; remember `tier=high` + `ORCHESTRATION POLICY` execution gate before any implementation files are edited).

## Cost Report

Called `get_session_cost(workflow="design-solution", slug="website-cloudflare-deploy")` (MCP recorded 11 calls across session, 5 unique skills loaded ~8536 est. context tokens, 3 workflow bodies, elapsed 448s). Host token usage and monetary cost are unavailable (`cost.source: unavailable`); no numerical cost or savings claim is made.
