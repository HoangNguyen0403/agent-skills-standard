## Task 4: CI root causes
**Own:** `package.json`, `pnpm-lock.yaml`, `.github/workflows/ci.yml`; `scripts/test-e2e.ts` only if the established credential contract requires adjustment; dependency-specific tests only if needed.
- Use the already-observed audit failures (proxy-addr GHSA-jqcg-44mw-7w3h, fast-copy GHSA-jggr-w7fw-pc2j); inspect current advisory sources, resolved dependency chains, and compatible patched releases. Consolidate duplicate pnpm objects rather than silently discard pins.
- Add supported read-only GitHub token environment to the remote-sync E2E step; verify the CLI's exact credential variable. No token printing or secret copying changes, broad permission increase, mocks, skips, retries, or continue-on-error.
- Do not change unrelated gates; report downstream failures newly exposed by the corrected prerequisites.
**Acceptance:** Corrected lockfile installs frozen; production audit clean or precise unreachable upstream blocker; CI E2E uses supported authentication; real sync remains enabled.
**Verification:** `rtk pnpm install --frozen-lockfile`; `rtk pnpm audit --prod`; local build/E2E with existing eligible credentials if available; actual post-push Actions requires separate publication approval.
**Report:** `.agents/sdd/pr223-remediation/task-4-report.md`.

