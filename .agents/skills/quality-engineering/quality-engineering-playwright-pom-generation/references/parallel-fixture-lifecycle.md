# Parallel Fixture Lifecycle & Data Isolation

Primary documentation:
- [Playwright: Parallelism & Sharding](https://playwright.dev/docs/test-parallel)
- [Playwright: Worker index & parallel index](https://playwright.dev/docs/test-parallel#worker-index-and-parallel-index)
- [Playwright: Authentication & Multi-account fixtures](https://playwright.dev/docs/auth#moderate-one-account-per-parallel-worker)
- [Playwright: API testing prerequisites](https://playwright.dev/docs/api-testing)

This reference defines worker account allocation, per-test mutable data lifecycle, failure evidence preservation, and cleanup boundaries while preserving the single `tests/fixtures.ts` entrypoint and the `tests/seed.spec.ts` prerequisite contract.

---

## 1. Isolation Layers: Context vs Worker vs Test

Parallel test execution requires distinguishing three layers:

| Layer | Lifecycle / Scope | What is Isolated | What is NOT Isolated | Required Hygiene |
| --- | --- | --- | --- | --- |
| **Browser Context** | Per test (`{ page, context }`) | Cookies, localStorage, sessionStorage, cache | Server-side database records, shared backend resources | Default Playwright behavior; context isolation does not isolate backend database mutations. |
| **Worker Account** | Per worker process (`scope: 'worker'`) | User account credentials / session allocated to that worker slot | Records mutated by other tests executed sequentially in the same worker slot | Account allocation is a concurrency optimization, NOT proof of test independence. Tests in the same worker run sequentially. |
| **Mutable Test Data** | Per test (`scope: 'test'`) | Entities, IDs, and database rows created during the test scenario | Resources created with unscoped names or shared identifiers | Every test mutating backend state must own uniquely namespaced data and tear down its records. |

---

## 2. Namespace & Identity Mechanics

### `parallelIndex` vs `workerIndex`
- `testInfo.parallelIndex`: Zero-based index for the concurrent worker slot (`0` to `workers - 1`). When a worker process fails and is replaced, the replacement worker reuses the same `parallelIndex`. It identifies the execution slot, not a globally unique run or worker process.
- `testInfo.workerIndex`: Monotonically increasing index for the physical worker process. When a worker process restarts, it receives a new `workerIndex`.

### Cross-Run / Project / Shard Namespace Formula
To prevent collisions across concurrent CI pipelines, multi-project runs, sharded execution, and worker replacements:
- **Worker Account Namespace**:
  ```ts
  // Resolve invocation run ID and sharding from explicit environment/config
  const runId = process.env.TEST_INVOCATION_RUN_ID;
  if (!runId) throw new Error('TEST_INVOCATION_RUN_ID is required to prevent cross-run collisions');
  // Sharding configuration from Playwright config/CLI (default 'unsharded')
  const shard = workerInfo.config.shard ? `${workerInfo.config.shard.current}-${workerInfo.config.shard.total}` : 'unsharded';
  const workerAccountKey = `${runId}:${workerInfo.project.name}:shard-${shard}:slot${workerInfo.parallelIndex}`;
  ```
- **Per-Test Resource Namespace**:
  ```ts
  const testNamespace = `${workerAccountKey}:w${testInfo.workerIndex}:t${testInfo.testId}:a${testInfo.retry}`;
  ```
- **Rules**:
  - Never use fixed fallbacks like `'local'` or `'dev'`: concurrent local or CI invocations will collide.
  - Never rely on `parallelIndex` alone for global database uniqueness: retried tests or sequential tests in the same slot share the same `parallelIndex`.
  - Include stable `testId` and `retry` attempt counter to prevent collision after worker restart or retry.

---

## 3. Seed Prerequisite Contract & Worker Allocation

- `tests/seed.spec.ts` defines baseline navigation and authentication prerequisites.
- Worker fixtures support the seed contract through the same `tests/fixtures.ts` entrypoint; declaring a worker fixture does not execute the seed per worker.
- Assertions remain in spec files (`*.spec.ts`), never in fixtures or page objects.

---

## 4. Single `tests/fixtures.ts` Composition Pattern

When parallel worker accounts and scenario data isolation are required, extend base Playwright test in `tests/fixtures.ts`. The adapter boundary to application-provided provisioning is explicit:

```ts
// tests/fixtures.ts
import { test as base } from '@playwright/test';
import { CheckoutPage } from './pages/checkout.page';
import { LoginPage } from './pages/login.page';

// 1. Application-provided adapter interfaces (external contracts, not invented frameworks)
export type AppAccountAdapter = {
  acquireWorkerAccount: (key: string) => Promise<{ username: string }>;
  releaseWorkerAccount: (key: string) => Promise<void>;
  captureFailureDiagnostics: (namespace: string) => Promise<void>;
  purgeTestNamespace: (namespace: string) => Promise<void>;
};

// Declared application adapter provided by the host environment or test setup
declare const appAdapter: AppAccountAdapter;

type WorkerFixtures = {
  workerAccount: { username: string; accountKey: string };
};

type TestFixtures = {
  pages: {
    checkout: CheckoutPage;
    login: LoginPage;
  };
  testScope: {
    namespace: string;
    registerCleanup: (teardown: () => Promise<void>) => void;
  };
};

export const test = base.extend<TestFixtures, WorkerFixtures>({
  // Worker-scoped fixture: acquires account via application adapter
  workerAccount: [
    async ({}, use, workerInfo) => {
      const runId = process.env.TEST_INVOCATION_RUN_ID;
      if (!runId) {
        throw new Error('TEST_INVOCATION_RUN_ID must be set for parallel test runs to ensure unique isolation');
      }
      const shard = workerInfo.config.shard
        ? `${workerInfo.config.shard.current}-${workerInfo.config.shard.total}`
        : 'unsharded';
      const accountKey = `${runId}:${workerInfo.project.name}:shard-${shard}:slot${workerInfo.parallelIndex}`;
      const account = await appAdapter.acquireWorkerAccount(accountKey);
      try {
        await use({ username: account.username, accountKey });
      } finally {
        await appAdapter.releaseWorkerAccount(accountKey);
      }
    },
    { scope: 'worker' },
  ],

  // Test-scoped fixture: manages isolated data lifecycle and safe teardown
  testScope: async ({ workerAccount, context }, use, testInfo) => {
    const namespace = `${workerAccount.accountKey}:w${testInfo.workerIndex}:t${testInfo.testId}:a${testInfo.retry}`;
    const cleanups: Array<() => Promise<void>> = [];

    try {
      await use({
        namespace,
        registerCleanup: (teardown) => cleanups.push(teardown),
      });
    } finally {
      const cleanupErrors: unknown[] = [];
      let evidenceGap: string | undefined;

      // 1. Explicit failure evidence preservation before mutation teardown
      if (testInfo.status !== testInfo.expectedStatus) {
        try {
          await appAdapter.captureFailureDiagnostics(namespace);
        } catch {
          // Required evidence is NOT secured. Record a redacted gap (no raw error, no secrets)
          // instead of implying a successful snapshot.
          evidenceGap = `failure diagnostics capture failed for owned namespace ${namespace}`;
        }
      }

      if (evidenceGap === undefined) {
        // 2. Aggregate cleanup execution: propagate errors so leaks are never green
        while (cleanups.length > 0) {
          const cleanup = cleanups.pop();
          if (cleanup) {
            try {
              await cleanup();
            } catch (err) {
              cleanupErrors.push(err);
            }
          }
        }

        // Also invoke application namespace purge
        try {
          await appAdapter.purgeTestNamespace(namespace);
        } catch (err) {
          cleanupErrors.push(err);
        }
      } else {
        // Destructive cleanup/purge is skipped: deleting owned records would destroy the only
        // remaining failure evidence. Retain ONLY this test's owned namespace and record it for
        // the bounded reconciliation boundary (Section 5.3) to reclaim after the gap is investigated.
        // Never widen the retained scope to another namespace, and never throw for the gap itself:
        // the original test fault must remain the reported failure.
        testInfo.annotations.push({ type: 'evidence-gap', description: evidenceGap });
      }

      if (cleanupErrors.length > 0) {
        // Redact raw error details to avoid secret leakage in logs; propagate failure
        throw new Error(`Teardown failed for namespace ${namespace}: ${cleanupErrors.length} cleanup operation(s) failed`);
      }
    }
  },

  // Existing POM pages fixture depends on testScope so data isolation and evidence-aware teardown always run
  pages: async ({ page, testScope }, use) => {
    await use({
      checkout: new CheckoutPage(page),
      login: new LoginPage(page),
    });
  },
});

export { expect } from '@playwright/test';
```

---

## 5. Teardown, Evidence Ordering & Orphan Reconciliation

1. **Ordering & Evidence First**:
   - Built-in Playwright artifacts (screenshots, traces, video) are finalized during context closure. Do not assume all browser artifacts are written before the fixture's `finally` block executes.
   - For backend mutations, explicitly capture failure evidence (backend transaction logs or state snapshots) *before* invoking resource teardown.
   - Run destructive test-scoped teardown only after required failure evidence is secured.
   - A successful `captureFailureDiagnostics` call is the adapter's guarantee that evidence exists; a resolved promise alone proves nothing about artifact contents.
   - If required evidence capture fails, skip registered destructive cleanup and namespace purge for that test, record a redacted evidence gap (e.g. a `testInfo` annotation) instead of claiming a successful snapshot, and let the original test fault remain the reported failure. Do not throw the raw capture error or any secret-bearing payload.
2. **Failure Propagation & Secret Hygiene**:
   - Never silently catch and swallow cleanup errors: uncollected cleanup errors hide backend resource leaks and produce false-green runs.
   - Aggregate cleanup failures and throw an aggregated error.
   - Never log raw error objects or database error payloads in test teardown: database connection strings, auth tokens, or payload secrets can leak into CI build logs.
3. **Orphan Reconciliation (TTL / Janitor Boundary)**:
   - A namespace retained because its failure evidence was not secured is reclaimed here, not by in-process teardown: reconcile only the exact owned namespace, within a bounded window, and never widen scope to other namespaces or blanket deletes.
   - In-process `finally` blocks cannot run if a test process is killed (`SIGKILL`), crashes on worker OOM, or CI times out.
   - Systems must define a reconciliation boundary: synthetic test entities must carry a creation timestamp or TTL tag (`expiresAt`). A background janitor or pre-run reconciliation sweep cleans orphaned resources matching expired run IDs.
   - Never execute blanket table wipes (`TRUNCATE TABLE`) or global drops from worker teardown: this destroys concurrent test state and breaks parallel isolation.

---

## 6. Authentication Proof vs Post-Login Reuse

- **Post-login speedup**: Reusing `storageState` (or pre-seeded session cookies) is valid and recommended for downstream feature tests (e.g. checkout, settings, reporting).
- **Dedicated login/session verification**: When testing login forms, MFA flows, session expiry, or CSRF governance, you **must** exercise real browser navigation, submission, and actual populated DOM state. Reusing `storageState` in a login test provides zero proof that the login mechanism works.
- **Secrecy & Artifact Protection**:
  - Never commit `storageState.json` or credential caches to git. Add `.auth/` and `*auth.json` to `.gitignore`.
  - Sanitize test logs and reports: never log bearer tokens, session cookies, or cleartext passwords.
