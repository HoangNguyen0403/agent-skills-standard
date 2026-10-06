# Task 4 — CI root causes

**Status: IMPLEMENTED_PENDING_VERIFICATION**

## Changed files

- `package.json`: consolidated the duplicate root `pnpm.overrides` objects. Kept both sets of prior overrides, retained the effective `fast-uri >=3.1.8` rather than the superseded `3.1.7`, added exact patched pins for `proxy-addr`, `fast-copy`, and `source-map-js`, and updated the scoped `brace-expansion` 1.x/2.x overrides to major-compatible patched versions.
- `pnpm-lock.yaml`: regenerated entries and dependency snapshots for the corrected `brace-expansion` backports and patched `proxy-addr`, `fast-copy`, and `source-map-js`.
- `.github/workflows/ci.yml`: passed the workflow's existing read-only `GITHUB_TOKEN` to the real remote E2E step.
- `scripts/test-e2e.ts`: unchanged; it already runs the real `sync --yes` path and inherits the CLI process environment.

## Advisory and dependency evidence

- [GHSA-jqcg-44mw-7w3h](https://github.com/advisories/GHSA-jqcg-44mw-7w3h), GitHub-reviewed advisory: `proxy-addr` versions `>=1.1.0, <2.0.8` are affected; `2.0.8` is patched. Lockfile path: `express@5.2.1 -> proxy-addr`. Resolved to `proxy-addr@2.0.8`.
- [GHSA-jggr-w7fw-pc2j](https://github.com/advisories/GHSA-jggr-w7fw-pc2j), GitHub-reviewed advisory: patched versions are `2.2.0`, `3.1.0`, and `4.1.0` for their respective major lines. Lockfile path: production `pino-pretty@13.1.3 -> fast-copy`. Resolved to `fast-copy@4.1.0`, the compatible patch on the existing 4.x line.
- No unrelated direct dependency ranges or broad upgrades were changed.

## Credential contract

`cli/src/services/RegistryService.ts` constructs `GithubService` with `process.env.GITHUB_TOKEN`; sync services also use that variable. `GithubService` sends the supplied token as the GitHub API `Authorization` header. The E2E subprocess inherits its parent environment. The E2E step now sets `GITHUB_TOKEN: ${{ github.token }}`; workflow-wide permissions remain `contents: read`. No token is printed or copied into a file. The actual remote sync remains enabled.

## Commands run

- `rtk pnpm why --prod proxy-addr fast-copy` — returned no output; dependency-chain evidence was read directly from `pnpm-lock.yaml`.
- `rtk pnpm install --lockfile-only --ignore-scripts` — completed and updated the lockfile. It reported one deprecated transitive dependency, `glob@10.5.0`; this is unrelated to the reported advisories.

No audit, frozen install, E2E, tests, build, lint, or formatter was run by this worker. Parent-reported check results are recorded below and are not represented as commands run here. No publication or Actions run was initiated.

## Proposed verification

1. `rtk pnpm install --frozen-lockfile`
2. `rtk pnpm audit --prod`
3. With existing eligible credentials, `rtk pnpm build` then `rtk pnpm test:e2e` to exercise the live GitHub sync.
4. After separately approved publication, inspect the Actions run for the production audit and authenticated remote-sync E2E; check any downstream failures newly exposed by those corrected prerequisites.

## Limitations

Parent reports that frozen install and production audit passed after the brace-expansion correction and that local authenticated E2E passed. Remote Actions evidence and verification of the newly wired eval-script CI step remain pending; publication requires separate approval.

### Follow-up: brace-expansion override correction

Parent-reported verification on the earlier lockfile: a fresh frozen install passed in 2.10s; `rtk pnpm audit --prod` failed in 1.22s with three `brace-expansion` findings. The reported chain was `mcp -> minimatch@10.2.6 -> brace-expansion@5.0.9`. The cause was the restored scoped override `minimatch@10>brace-expansion: 5.0.9`, which took precedence over the generic `brace-expansion >=5.0.12` floor.

Changed the scoped override to `5.0.12`, the parent-reported compatible patched version. This satisfies the reported fixed floors for [GHSA-qhr7-859c-m2p7](https://github.com/advisories/GHSA-qhr7-859c-m2p7) (>=5.0.11), [GHSA-6j4f-fj2g-mc7p](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p) (>=5.0.10), and [GHSA-q2hr-2g5m-vwhr](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr) (>=5.0.12). Regenerated only the lockfile using `rtk pnpm install --lockfile-only --ignore-scripts`; lockfile now resolves `brace-expansion@5.0.12` for the minimatch@10 path.

Parent subsequently reported frozen install and production audit passing (2.00s) for the corrected lockfile. This supersedes the earlier audit failure above. The worker did not rerun these checks; the new eval-script CI wiring and remote Actions remain unverified.

### Parent-reported verification and CI coverage follow-up

Parent reports that frozen install and production audit now pass (2.00s), and local authenticated E2E passes in 25.24s with real Flutter/workflow sync and validation reporting 324 valid, 0 failed. This is local evidence only, not proof of a remote Actions run.

CI coverage gap: `unit-tests` previously ran workspace coverage and outcome/trace scripts but omitted `scripts/evals/*.test.ts`. Updated the existing script-test step to run `pnpm test:evals && pnpm test:outcome && pnpm test:trace`; no other workflow gates or Node 20 settings changed. Regressions in scripts/evals are now wired into that job. This workflow edit has not been run or observed in Actions; delta review remains required.

### R4-1 follow-up: patched legacy major overrides

Read the linked primary GitHub advisories: [GHSA-6j4f-fj2g-mc7p](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p) patches `brace-expansion` 1.x at `1.1.19` and 2.x at `2.1.5`; [GHSA-qhr7-859c-m2p7](https://github.com/advisories/GHSA-qhr7-859c-m2p7) patches 1.x at `1.1.20` and 2.x at `2.1.6`; [GHSA-q2hr-2g5m-vwhr](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr) patches 1.x at `1.1.21` and 2.x at `2.1.7`. Set scoped overrides to the highest major-compatible patched releases, `minimatch@3>brace-expansion: 1.1.21` and `minimatch@9>brace-expansion: 2.1.7`. Retained `minimatch@10>brace-expansion: 5.0.12`, the generic `brace-expansion >=5.0.12` floor, and the other existing override keys. No 5.x version was forced onto minimatch 3 or 9.

Resolver: `rtk pnpm install --lockfile-only --ignore-scripts` completed in 4.74s. It reported the existing deprecated transitive dependency `glob@10.5.0`. The regenerated lockfile contains all three scoped pins and snapshots resolve `minimatch@3.1.5 -> brace-expansion@1.1.21`, `minimatch@9.0.9 -> brace-expansion@2.1.7`, and `minimatch@10.2.6 -> brace-expansion@5.0.12`.

No tests, build, lint, formatting, frozen install, or audit were run for this round. Parent owns frozen-install, full-audit, and affected consumer/full-suite verification.

### Parent-reported full-audit follow-up: source-map-js and braces

Parent reports the **full** `pnpm audit` (not `pnpm audit --prod`) returned two High findings after the legacy `brace-expansion` backports:

- [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q): `source-map-js@1.2.1`, patched in `1.2.2`. Added exact root override `source-map-js: 1.2.2`. `rtk pnpm install --lockfile-only --ignore-scripts` completed in 8.50s; it reported the existing deprecated `glob@10.5.0`. The lock now resolves `source-map-js@1.2.2` in both direct transitive paths: `magicast@0.5.4 -> source-map-js` and `postcss@8.5.23 -> source-map-js`.
- [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm): `braces@3.0.3`, advisory reports no patched version. Read-only `rtk pnpm why --recursive braces source-map-js` mapped its consumer to the server dev-tool chain `@types/jest@30.0.0 -> expect@30.2.0 -> jest-message-util@30.2.0 -> micromatch@4.0.8 -> braces@3.0.3`. Primary advisory says affected through `3.0.3`, patched versions `None`; npm's current `latest` tag is `3.0.3`, and the upstream releases feed contains no later release. No replacement or `braces` implementation change was made; resolving this unpatched advisory needs a parent decision.

### Baseline exposure comparison

Compared current lock paths with baseline commit `fbb30b5`. `braces@3.0.3` was already present through `micromatch@4.0.8` in baseline and remains unchanged; this PR did not introduce that finding. `source-map-js@1.2.1` was also present in baseline through `magicast@0.5.4` and PostCSS (baseline `postcss@8.5.28`; current pinned `postcss@8.5.23`); the vulnerable version predates this PR. The `source-map-js` pin above corrects its current lock resolution to `1.2.2`.

`pnpm why` and resolver output are the only commands run by this worker in this follow-up. No audit, frozen install, tests, build, lint, or formatter was run. Parent retains full-audit, frozen-install, and consumer/full-suite verification. The `braces` finding remains unresolved pending parent direction; no audit suppression was added.