# Global Harness Fleet Integration & Discovery

This document details the architecture, configuration, security model, and CLI commands for the global Paseo harness integration in `agent-skills-standard`.

## 1. Architectural Overview & Boundaries

The global harness integration provides a **one-time, per-user / per-host** machine-level configuration and read-only project and host inventory discovery across Paseo instances.

### Key Architectural Tenets

- **One-time user/machine setup**: Configured once per machine, eliminating repetitive per-repository `.skillsrc` setup or project-level pollution.
- **Strictly read-only discovery**: Discovers available projects and registered hosts across reachable Paseo targets.
- **Tiered Runtime Boundary**: The base `ags harness` commands (`setup`, `status`, `discover`, `uninstall`) manage machine configuration and read-only inventory discovery. Advanced multi-machine orchestration, sandboxed execution, heldout evaluation, signed release management, and global OMP launch integration are governed under `ags harness fleet` (Section 5) with strict CAS safety, no candidate/doctor/model probes in normal sessions (one read-only approved-context lookup per session and project scope), and external human release approvals.
- **Zero project-level side effects**: `ags harness` commands never inspect, create, or alter project-level `.skillsrc` files.
- **Environment isolation**: Cwd `.env` files are ignored on `ags harness` invocations to prevent workspace environment variables from poisoning global harness home, Paseo endpoints, or credentials.

```
+-------------------------------------------------------------------------+
|                              Host Machine                               |
|                                                                         |
|  ~/.config/agent-skills-standard/harness/                               |
|  ├── config.json  (0600, schemaVersion: 1, absolute paseoCommand)       |
|  └── receipt.json (0600, sha256 digest, owner verification)             |
|                                                                         |
|  ags harness setup | status | discover | uninstall                      |
|       │                                                                 |
|       ▼                                                                 |
|  Paseo CLI subprocess (direct execFile, argv array, minimal env, no sh) |
|       ├──> Origin project enumeration (project ls --json)               |
|       └──> Remote host summaries (host ls --json)                       |
|            (legacy diagnostic path only; not SDK fleet execution)        |
+-------------------------------------------------------------------------+
       │
       ▼ (Legacy discovery output; its remote-routing limit is not the fleet runtime)
{ "schemaVersion": 1, "complete": true|false, "hosts": [ ... ] } (legacy discovery format)
```

---

## 2. Security & State Storage Model

Global harness state is isolated in user configuration rather than repository checkouts.

### State Directory & File Permissions
- **Default path**: `~/.config/agent-skills-standard/harness/config.json`.
- **Environment override**: An absolute path specified in `AGS_HARNESS_HOME` or via `--state-dir` CLI option.
- **Permissions**: Newly created state directories are initialized with mode `0700` (`drwx------`); files are written with mode `0600` (`-rw-------`).
- **Existing-state permission refusal**: If an existing state directory already exists on POSIX systems, `ags` inspects its permission bits before receipt verification. If group or other mode bits are open (`(mode & 0o077) !== 0`), `ags` fails closed with error code `STATE_PERMISSIONS` and rejects the operation without mutating or chmod'ing the directory.
- **No automatic repair**: `ags` never automatically repairs or modifies the permissions of pre-existing or externally provided directories. There is no claim that arbitrary provided shared directories are made private by `ags`; operators must ensure custom state directories are private, or allow `ags` to create the owned directory.
- **Symlink denial**: The state directory and configuration files must be regular files and directories. State directories that resolve through symlinks, contain symlinked ancestors, or point to the filesystem root (`/`) or user home root directly are rejected to prevent directory traversal.

### Digest-Based Ownership Receipt & Idempotency
- When `ags harness setup` runs, it writes `config.json` and a companion digest-based ownership receipt (`receipt.json`).
- `receipt.json` records:
  ```json
  {
    "schemaVersion": 1,
    "owner": "agent-skills-standard/harness",
    "configSha256": "<SHA-256 hex digest of exact config.json bytes>"
  }
  ```
- **Bookkeeping Purpose & Boundaries**: The receipt provides local digest-based ownership bookkeeping to track files managed by `ags` and prevent accidental clobbering of edited or differing configurations. It is not an authenticated digital signature, human release approval, or a tamper-resistance boundary against a same-user local attacker. Filesystem permissions (`0700` directory, `0600` files) strictly form the access control boundary.
- Re-running setup with identical configuration is idempotent and returns `{ "created": false, "configPath": "..." }` with exit code `0`.
- If an existing configuration file has been modified outside `ags`, setup refuses silent overwrite and fails closed.
- `uninstall` removes only verified owned configuration and receipt files matching the stored SHA-256 digest; it never removes the state directory recursively or deletes unrelated user files.

### Concurrency, Stale Lock Recovery & Integrity Distinctions

#### Exclusive Locking
- State mutations (`setup`, `uninstall`) acquire an exclusive lock file (`.lock`) in the state directory to serialize concurrent invocations.
- To prevent race conditions or partial updates, automatic lock stealing and PID heuristics are strictly prohibited.

#### Precise Stale Lock Recovery
If an operation is interrupted (e.g. abrupt power failure or SIGKILL) leaving a persistent `.lock` file:
1. **Stop harness operations**: Ensure all `ags harness` operations are stopped across all terminal sessions and background jobs.
2. **Verify no running processes**: Confirm no active process holds or references the lock file. Do not guess or rely on PID assumptions.
3. **Remove only the lock file**: Delete only the stale `.lock` file located in the state directory (e.g., `rm ~/.config/agent-skills-standard/harness/.lock`). Never delete the state directory or other files.
4. **Verify integrity before mutations**: Run `ags harness status` immediately to verify configuration and receipt integrity before attempting any new setup or uninstall mutations.

#### Distinguishing Stale Locks from State Corruption / Mismatches
- **Stale Lock (`LOCK_TIMEOUT`)**: Indicates a temporary lock contention or unreleased lock file from an interrupted run. Remediated via the precise manual lock removal sequence above.
- **Partial or Corrupted State (`STATE_CORRUPT`)**: Occurs when `receipt.json` exists without `config.json`, or when files contain malformed non-JSON data.
- **Tampered State (`CONFIG_TAMPERED`)**: Occurs when `config.json` has been modified manually or corrupted such that its SHA-256 digest no longer matches `receipt.json`.
- **Integrity Rule**: When `ags harness` fails closed on `STATE_CORRUPT` or `CONFIG_TAMPERED`, operators must investigate the discrepancy. **Never delete valid, customized, or user-edited state files merely to bypass integrity verification.**

- **Insecure Permissions (`STATE_PERMISSIONS`)**: Occurs when an existing state directory or configuration file has group or world access bits set on POSIX. Operations fail closed without modifying directory permissions.
#### Base Discovery Scope vs Fleet Orchestration
Base `ags harness` commands manage host connection parameters and read-only inventory discovery. Automated experiment orchestration, sandboxed candidate runs, and OMP launch integration are isolated in the `ags harness fleet` command suite.

---

## 3. CLI Command Reference — Historical Inventory Subset

> **Scope:** The discovery behavior in Sections 3–4 documents the original read-only `ags harness` inventory subset. It is not the current remote-execution boundary. The full machine-global OMP/fleet implementation and its verification limits are in Section 5; the legacy discovery backend remains diagnostic and grants neither SDK-authoritative workspace association nor authorization.

All `ags harness` commands produce machine-readable JSON on stdout. Non-zero exit codes are returned for malformed arguments, unconfigured status, partial discovery, or operational errors.

### 3.1 `ags harness setup`

Configures the one-time global harness settings.

```bash
ags harness setup --paseo-command <absolute-path> [--origin <target>] [--state-dir <path>]
```

- `--paseo-command <path>` (**Required**): Absolute path to the Paseo binary (e.g. `/usr/local/bin/paseo`). Relative paths, PATH lookups, leading hyphens, and paths containing NUL characters are rejected to prevent PATH hijacking.
- `--origin <target>` (Optional): Default host or origin alias for Paseo. Must not contain credentials or control characters.
- `--state-dir <path>` (Optional): Custom absolute state directory overriding default user config.

**Output on success (Exit 0):**
```json
{
  "created": true,
  "configPath": "/Users/alice/.config/agent-skills-standard/harness/config.json"
}
```
When already configured with identical settings (idempotent, Exit 0):
```json
{
  "created": false,
  "configPath": "/Users/alice/.config/agent-skills-standard/harness/config.json"
}
```

**Output on error (Exit 1):**
```json
{
  "error": "Required option --paseo-command <path> missing"
}
```

### 3.2 `ags harness status`

Checks the global configuration status without modifying the filesystem.

```bash
ags harness status [--state-dir <path>]
```

**Output when configured (Exit 0):**
```json
{
  "configured": true,
  "configPath": "/Users/alice/.config/agent-skills-standard/harness/config.json",
  "config": {
    "schemaVersion": 1,
    "paseoCommand": "/usr/local/bin/paseo",
    "origin": "local"
  }
}
```

**Output when unconfigured (Exit 1):**
```json
{
  "configured": false,
  "configPath": "/Users/alice/.config/agent-skills-standard/harness/config.json"
}
```

### 3.3 `ags harness discover`

Executes read-only fleet inventory discovery across local and reachable Paseo daemon targets.

```bash
ags harness discover [--state-dir <path>]
```

- When harness is not configured, exits with code `1` and emits an unconfigured error.
- When inventory discovery is complete across all enumerated hosts, exits with code `0`.
- For the legacy `ags harness discover` inventory path only, partial discovery reports unsupported/offline hosts with `complete: false` and exits with code `1`. This diagnostic behavior does not describe the SDK-routed fleet runtime in Section 5.

**Output when unconfigured (Exit 1):**
```json
{
  "schemaVersion": 1,
  "complete": false,
  "hosts": [],
  "error": "Harness is not configured. Run `ags harness setup --paseo-command <path>` first."
}
```

**Output when complete (Exit 0):**
```json
{
  "schemaVersion": 1,
  "complete": true,
  "hosts": [
    {
      "hostKey": "local",
      "status": "reachable",
      "projects": [
        {
          "projectId": "prj_01",
          "name": "project-alpha",
          "path": "/Users/alice/projects/project-alpha",
          "kind": "git"
        }
      ]
    }
  ]
}
```

**Output on partial discovery (Exit 1):**
```json
{
  "schemaVersion": 1,
  "complete": false,
  "hosts": [
    {
      "hostKey": "local",
      "status": "reachable",
      "projects": [
        {
          "projectId": "prj_01",
          "name": "project-alpha",
          "path": "/Users/alice/projects/project-alpha",
          "kind": "git"
        }
      ]
    },
    {
      "hostKey": "remote-machine-2",
      "status": "unsupported",
      "projects": [],
      "error": "REMOTE_ROUTING_UNAVAILABLE"
    }
  ]
}
```

> **Historical fleet-coverage note:** At the initial inventory-only checkpoint, the legacy discovery subprocess reported registered remote host summaries as `unsupported` (`REMOTE_ROUTING_UNAVAILABLE`) and `complete: false` (exit code `1`), because `HostSummary` did not expose a route. The approved full fleet implementation later added SDK-routed worker paths; the legacy backend remains diagnostic only and does not supply SDK-authoritative workspace associations or authorization.

### 3.4 `ags harness uninstall`

Removes the owned configuration and receipt files.

```bash
ags harness uninstall [--state-dir <path>]
```

**Output when removed (Exit 0):**
```json
{
  "removed": true,
  "configPath": "/Users/alice/.config/agent-skills-standard/harness/config.json"
}
```

**Output when unconfigured or already removed (Exit 1):**
```json
{
  "removed": false,
  "configPath": "/Users/alice/.config/agent-skills-standard/harness/config.json"
}
```

---

## 4. Historical Diagnostic Discovery Boundaries

1. **Bounded Subprocess Invocation**: Paseo CLI subprocesses are executed via direct `execFile` (argument arrays), never through an ambient shell. Processes run with bounded timeout (10s per host, 60s aggregate) and bounded buffer (4MiB). This bounds execution parameters and prevents shell injection, but is not OS-level containerization or process sandboxing.
2. **Environment Filtering**: Child processes execute with a sanitized, minimal environment (`PATH`, `HOME`, and standard system variables). Cwd `.env` and application secret files are never forwarded.
3. **No Credential Propagation**: Origin and remote host values are validated against credential injection. Any URI containing embedded user/password components (`user:pass@host`) is rejected immediately.
4. **Diagnostic remote statuses and evidence limits**: The legacy inventory backend may report unreachable, unsupported, or disabled targets with explicit statuses and incomplete coverage. These statuses describe discovery only; they do not make remote fleet execution unsupported or authorized.
   - **Historical Paseo protocol evidence**: The pinned [`HostSummary` protocol](https://github.com/getpaseo/paseo/blob/72e3316f4f5dfe775c77dbf998968c92e2de9019/packages/protocol/src/hosts.ts) and [CLI handler](https://github.com/getpaseo/paseo/blob/72e3316f4f5dfe775c77dbf998968c92e2de9019/packages/cli/src/commands/host/index.ts) exposed registrationId, nullable serverId, label and status, but no connection routing endpoint. This historical CLI evidence does not constrain the separate typed SDK routes used by the full fleet runtime.
   - **Legacy backend boundary**: The legacy bounded CLI enumerates origin projects and registered host summaries. It remains diagnostic; current SDK workspace associations and signed worker routing are provided by the fleet runtime in Section 5. No path inferred from Git metadata, project discovery, or diagnostic output grants authorization.
5. **No Automatic Project Enrollment**: Discovering a project in the inventory does **NOT** authorize model execution, data export, or experiment dispatch. Project boundaries and client domains remain isolated.

## 5. Fleet Orchestration & Global OMP Integration

The `ags harness fleet` command family implements the machine-global orchestration and runtime integration layers defined in `docs/prd/prd-fleet-harness-improvement.md`. It provides centralized policy configuration, zero-model health diagnostics, bounded task execution, frozen heldout evaluation, cryptographically signed release management, and compare-and-swap (CAS) OMP launch integration.

### 5.1 Architecture & Component Ownership

```
----------------------------------------------------------------------------------------------------+
|                                    Global Fleet Architecture                                       |
|                                                                                                    |
|  ~/.config/agent-skills-standard/harness/                                                          |
|  ├── config.json          (0600, schemaVersion: 1, base setup receipt)                             |
|  ├── fleet-policy.json    (0600, FleetConfig: domains, accounts, rules, limits, hosts, approvers)   |
|  ├── fleet-ledger.json    (0600, Attempt reservations, tokens, tokens, budget epochs)             |
|  ├── fleet-pins.json      (0600, Approved release pins, nonces, canaries, history)                 |
|  ├── integration-receipt.json (0600, CAS pointer ownership, digests, pinned launcher identity)     |
|  ├── integration-journal.json (0600, transient write-ahead state for crash recovery)               |
|  ├── integration.lock     (0600, exclusive mutation owner; stale locks need manual removal)        |
|  ├── integration/                                                                                  |
|  │   ├── omp-wrapper-<digest8>.sh (0700, one POSIX exec launcher per resolved OMP target)          |
|  │   └── omp-harness-loader.mjs   (0600, Trusted OMP ESM extension, injects approved guidance)     |
|  └── backups/             (0700 dir, 0600 private backups of Paseo config.json)                    |
----------------------------------------------------------------------------------------------------+
```



### 5.2 Compare-and-Swap (CAS) Integration Model

The integration service configures Paseo once globally so that all future Oh My Pi sessions automatically load approved, compatible fleet guidance without per-repository configuration or probes during normal development tasks.

#### Lifecycle and Safety Guarantees

1. **Pinned Paseo v0.13 Schema Types**: `ags harness fleet integration plan` inspects Paseo's `config.json` (at `~/.paseo/config.json` or `$PASEO_HOME/config.json`) and validates the touched configuration families before and after the planned edit:
   - `/daemon/terminalProfiles/<index>/command` stays a `string`; the profile's separate `args:string[]` is never modified.
   - `/agents/providers/<id>/command` stays a non-empty `string[]` command prefix, for the base `omp` provider and every alias whose `extends === 'omp'`.
   - A provider command that is not a non-empty string array, or a terminal `command`/`args` of the wrong type, fails with `INVALID_PASEO_CONFIG` before anything is written.
2. **Preserved Launch Prefixes**: Each distinct originally configured executable gets its own owned wrapper (`omp-wrapper-<digest8>.sh`, `0700`). Provider entries become `[wrapperPath, ...originalArgs]`, so the original binary and its arguments (for example `['/opt/other/omp','--profile','work']`) are preserved instead of collapsing onto one shared default. Terminal entries become the wrapper string with their own `args` untouched. A derived provider that omits `command` keeps inheriting its ancestor's already-wrapped binary and prefix arguments: the alias command stays absent and is listed in `coverage.inheritedProviders` instead of receiving a substituted default. Binary identity accepts a canonical package-declared `omp` bin target (the normal npm/Bun `bin/omp -> package/dist/cli.js` layout) as well as an `omp`-named executable; an unresolvable binary, a relative path, a non-executable file, or a path merely ending in `/omp` refuses (`OMP_BINARY_NOT_FOUND` / `UNKNOWN_CUSTOM_COMMAND`); no top-level provider namespace is guessed.
3. **Actual Runtime Version Binding**: Install establishes the OMP version shipped by each configured launch target at explicit plan/install time. `--omp-version` is an expectation checked against every actual target (`OMP_VERSION_MISMATCH`), never an unverified override. Conflicting versions refuse (`OMP_VERSION_AMBIGUOUS`), an unidentifiable binary refuses (`OMP_VERSION_UNRESOLVED`), and reinstall drift refuses (`OMP_VERSION_DRIFT`). The verified version, target binaries, and state are pinned in the receipt and loader; at launch the loader re-checks every pinned target's actual `--version` and simply injects no guidance on a mismatch, so an upgraded binary never receives old-version guidance and ordinary OMP launch is never blocked.
4. **Trusted Loader Identity**: The loader is generated from an explicit built CLI entrypoint (`.js`/`.cjs`/`.mjs`), an explicit runtime executable, the owning state directory, the platform, and the verified OMP version. Source execution refuses with `TRUSTED_CLI_NOT_FOUND`; there is no cwd-relative `ags` lookup, no arbitrary `process.argv[1]` fallback, and no ancestor-`dist` search. Explicit `--cli-path`, `--node-command`, `--omp-binary`, and `--omp-version` overrides are operator assertions and are validated before use.
5. **Compare-and-Swap at the Commit Boundary**: `install --apply` reads the live configuration, compares the whole-file SHA-256 digest and every pointer's previous value, then stages owned bytes and a private timestamped backup in `<stateDir>/backups/` (`0600`). The configuration digest is revalidated immediately before the atomic rename, and files plus directories are fsynced. Concurrent modification aborts with `CAS_MISMATCH`.
6. **Exclusive Mutation Owner and Recovery**: A dedicated `integration.lock` serializes install/uninstall. A durable `integration-journal.json` is written before the authoritative rename; after a crash the next install/uninstall reconciles only exact before/after config bytes, completing or rolling back the transition, otherwise it refuses with `RECOVERY_REQUIRED`. Locks are never auto-stolen.
7. **Ownership Verification on Reinstall and Uninstall**: Receipts and journals are strictly parsed, must be private `0600` regular files, and must reference mapped paths inside the owned state directories. A preexisting artifact is adopted only when its bytes and exact private mode match; otherwise install refuses rather than chmod-ing or claiming unsafe files. Every owned loader, wrapper, and backup must remain a regular, non-symlinked file with its recorded SHA-256 and private mode; otherwise install refuses (`OWNERSHIP_DRIFT`, `USER_EDITS_DETECTED`, `STATE_CORRUPT`). Repeating an identical install is idempotent and preserves the original backup and restoration provenance instead of overwriting it. Changing the pinned CLI entrypoint, runtime, launch-binary set, or OMP version is an explicit uninstall-then-install transition; in-place upgrade refuses (`OWNERSHIP_DRIFT` / `OMP_VERSION_DRIFT`).
8. **User-Edit Preservation on Uninstall**: The default `uninstall` is a read-only inspection: it never acquires the mutation lock, writes or recovers a journal, or deletes an artifact, and it reports `pendingRecovery` if a journaled transition is waiting. `uninstall --apply` requires current pointer values to equal the recorded `installedValue`, requires the whole config digest to match the installed state, verifies the backup digest before deleting it, and restores only owned pointers so unrelated user fields survive. Any pointer, artifact, or backup edit refuses with `USER_EDITS_DETECTED`; partial success is not reported.
9. **Stream and Signal Preservation**: The generated `omp-wrapper-<digest8>.sh` performs a static `exec '<pinned target>' -e '<loader>' "$@"` with single-quote-escaped literals. It reads no target override from the environment, carries no inherited recursion flag, and relies on `exec` to replace the process image, so argv, stdin, stdout, stderr, exit status, and signals pass through unchanged.
10. **Session-Stable Guidance**: The loader registers `pi.on('before_agent_start', async (event, ctx) => ...)`, uses the supported `ctx.sessionManager.getSessionId()` identity, and keys its cache by actual session plus canonical project identity. Every fresh preparation reapplies the frozen guidance segment; a nested cwd or symlink spelling of the same project reuses the cached outcome without reading pins, and a real project transition resolves its own scope via a metadata-only `fleet context --scope-only` lookup that never reads release pins. Changed pins, rollbacks, and withdrawals apply to new sessions only. Active cached sessions are never evicted wholesale; admission is bounded and `session_shutdown` releases a session's frozen state. Missing session identity or unknown scope injects nothing.
11. **Saved vs Applied**: A successful install reports `saved: true` and `daemonReloadRequired: true`. Saving prepares future daemon launches; an already-running Paseo daemon must be reloaded or restarted through its supported lifecycle command before new OMP sessions pick up the change.
12. **Local-Origin Context Boundary**: Context resolution accepts only the default local Paseo origin. It uses a fresh inventory and requires the matched origin record to be reachable, error-free, and identified by an authoritative server ID; an offline remote host does not block a complete local origin. It canonicalizes local project roots (`realpath`), rejects equal-length matches, and validates domain policy plus trusted logical identity before any release lookup. A configured remote origin, partial/failed origin inventory, missing identity, or ambiguous match returns `null` rather than transferring guidance derived from a remote path.
13. **SDK-Registered Checkout Scope**: Local session context may match a registered project's primary root or an SDK-reported workspace checkout joined to that project. The selected checkout is canonicalized on the local host; the registered host/project/logical identity is retained, while global domain/account/stack policy is evaluated against the selected physical root and the same root is passed to release lookup. Discovery establishes association only, not permission. Git common-directory inference, primary-root permission inheritance, and per-repository setup do not authorize a checkout.
14. **Isolated Auxiliary Metadata Processes**: The loader pins the selected Node/Bun runtime kind and executable directory, the canonical OS-user home, the canonical home of the validated Paseo configuration, the private state directory, and any additional Node/Bun interpreter required by a simple OMP `env node`/`env bun` shebang. Shebangs with interpreter arguments that cannot be represented safely fail closed. When the selected auxiliary runtime or installer process runtime cannot satisfy that shebang, the operator may provide `--omp-runtime-command <absolute-path>`; it is clean-probed and its canonical executable and runtime kind are pinned. OMP version checks invoke the verified interpreter directly for each env-shebang target (Bun targets receive `--no-install --no-env-file` before the unchanged target and `--version` arguments), not by relying on a basename alias in `PATH`. Context subprocesses run from the private state directory with a closed allowlisted environment and pinned runtime directories plus fixed system directories in `PATH`; Bun context launches use the same isolation flags. They do not inherit workspace dotenv or parent environment options. The POSIX OMP wrapper remains an unchanged `exec` boundary and preserves the caller's environment and arguments. Receipt/journal schema v3 records the selected and supplemental interpreter identities; the loader digest binds the per-target interpreter mapping. Older receipts fail closed rather than being reinterpreted. The generated loader bounds active sessions to 256, never evicts a frozen session, and releases its cache only on `session_shutdown`.
15. **Bounded Owned State Serialization**: The integration receipt and write-ahead journal each have a separate 4 MiB UTF-8 serialized-byte limit matching their bounded readers. Before install staging or authoritative writes, install reserves the two-byte growth from the `install` journal phase to the later `uninstall` phase; uninstall still checks its actual journal before the first commit. Configurations that fit the separate Paseo config limit can still produce larger ownership metadata and are refused with `INTEGRATION_STATE_TOO_LARGE` without changing the existing config or owned state.


### 5.2.1 Final Local Verification Checkpoint — parent-reported, 2026-10-25

The following results were reported by the parent integration run; they are not checks performed by this documentation pass:

- **Focused suites:** integration/CLI `98/98`; FleetCoordinator/FleetRemoteDispatcher/remoteWorkerProtocol `91/91`; runtime runner `55/55`; ReleaseService `30/30`. The final CLI suite passed `1808/1808` tests across 84 files. `validate:all` passed `333/333` with 55 skill-description warnings; `docs:capabilities:check` passed.
- **Build and static gates:** CLI production build passed for 93 main-bundle modules and 138 worker modules. Final Prettier check and scoped ESLint passed. Full TypeScript checking still exits 2 with 19 exact inherited diagnostics and zero introduced diagnostics; it is not a clean typecheck. Vite's native-loader ESM/CommonJS configuration warning and `inlineDynamicImports` deprecation warning remain unsuppressed.
- **Built runtime smokes:** generated-loader checks passed for Node-auxiliary/Bun-target and Bun-auxiliary/Node-target layouts, including dotenv startup-option isolation and preservation of ordinary wrapper environment and arguments. The packaged **OMP SDK 18.12.6** health smoke used Bun 1.3.14, one synthetic `sandbox_exec`, and zero model tokens; this is distinct from the Paseo client 0.13 used for routing. Built integration plan/dry-run, install/reinstall/uninstall restoration, and setup acceptance cases passed in temporary state. The status smoke confirmed exact sums for completed usage and `null` totals for unresolved accounting.
- **Limits of those checks:** fake Docker version probes and a synthetic image do not prove Docker-engine containment. No real OMP session, live Paseo membership query, global user configuration install, daemon reload, two-host execution, model-backed fleet evaluation, or human release activation was performed. AC-023 and complete AC-001–030 acceptance remain open. Live Paseo membership lookup was explicitly denied and was not retried or bypassed.
- **Remaining qualification:** corrective remote GitHub CI has not run. The expanded deterministic OSS delta scan covered 60 public changed files: Semgrep scanned 46 TypeScript files with zero findings/errors (exit 0); Gitleaks returned one finding (exit 1), manually triaged as an unchanged educational-placeholder entry in historical changelog text, with no confirmed credential in the scanned findings. The raw Gitleaks exit remains 1; no suppression or allowlist was added. `pnpm audit --prod` remains **FAIL: 2 HIGH** for baseline `body-parser@2.3.0` and `multer@2.4.0` at `7fe39ca4`; no dependency remediation or overall security pass is claimed. The unrelated product-evidence suite remains `84/85`, with one expected-exit mismatch (actual exit 2); its cause is unproven and it was not rerun.

These local results establish the exercised implementation paths only, not production activation, containment, multi-machine acceptance, paid experiment efficacy, or human approval.



### 5.3 CLI Reference: `ags harness fleet`

All fleet commands produce structured JSON on stdout and exit with code `0` on success or non-zero on failure.

#### `ags harness fleet configure`
Configures global fleet policy from a JSON file. Generation must strictly increase.

```bash
ags harness fleet configure --file <config.json> [--state-dir <path>]
```

#### `ags harness fleet doctor`
Performs zero-model health checks across Paseo inventory, installed runtime manifest, Docker sandbox container backend, and policy state.

```bash
ags harness fleet doctor [--state-dir <path>]
```

#### `ags harness fleet status`
Displays active attempt counts, reserved tool call budgets, active budget epochs, and reconciled attempt summaries.

```bash
ags harness fleet status [--state-dir <path>]
```

#### `ags harness fleet run`
Plans or executes a bounded task. Without `--execute`, it runs in dry-run plan mode.

```bash
# Dry-run plan (default)
ags harness fleet run --file <task.json> [--state-dir <path>]

# Execute task with bounded budget and isolation
ags harness fleet run --file <task.json> --execute [--state-dir <path>]

# Execute a heldout task against a candidate release; the attempt pair is internal
ags harness fleet run --file <task.json> --execute --release-digest <digest> [--state-dir <path>]
```

`--release-digest` selects the candidate release for a heldout task. Caller-chosen attempt UUIDs are never required: the baseline/candidate pair is allocated internally and frozen in one plan before any admission.

#### `ags harness fleet cancel`
Cancels an active execution attempt using owned generation proof.

```bash
ags harness fleet cancel --attempt-id <attemptId> [--state-dir <path>]
```

#### `ags harness fleet reconcile`
Reconciles running attempts against local container states and authenticated remote worker receipts.

```bash
ags harness fleet reconcile [--state-dir <path>]
```

#### `ags harness fleet evaluate`
Previews, executes, resumes, or aggregates a heldout evaluation from an input file or a frozen plan digest.

```bash
# Read-only draft preview of a multi-task input (no plan, budget, or model work)
ags harness fleet evaluate --file <input.json> [--state-dir <path>]

# Execute or resume that exact persisted plan
ags harness fleet evaluate --file <input.json> --execute [--state-dir <path>]

# Aggregate or resume an already frozen plan digest
ags harness fleet evaluate --plan-digest <digest> [--state-dir <path>]
ags harness fleet evaluate --plan-digest <digest> --execute [--state-dir <path>]
```

`--file` and `--plan-digest` are mutually exclusive and exactly one is required. Input envelope: `{schemaVersion:1,id,tasks:[FleetTask...],releaseDigest,runId?,budgetId?}`. A file preview is a read-only draft: it carries `draftDigest` rather than `planDigest`, may omit `caseId`, and never publishes attempt UUIDs. Frozen plans carry authoritative case/attempt IDs. Exit status is non-zero for an ineligible evaluation or unresolved/blocked attempt sides; `recovered` is terminal. Output includes only the draft or plan digest, sanitized case metadata, authoritative IDs for frozen plans, and sanitized evaluation fields.

#### `ags harness fleet release`
Manages candidate harness bundles and externally signed promotion approvals.

```bash
# Propose a new candidate bundle
ags harness fleet release propose --file <bundle.json> [--state-dir <path>]

# Activate an approved release (requires signed approval with rollout field)
ags harness fleet release activate --file <signed-approval.json> [--state-dir <path>]

# Roll back to a previous approved release
ags harness fleet release rollback --file <signed-approval.json> [--state-dir <path>]

# Withdraw an active release or canary
ags harness fleet release withdraw --file <signed-approval.json> [--state-dir <path>]

# Show release status, active pins, and canaries
ags harness fleet release status [--state-dir <path>]
```

#### `ags harness fleet integration`
Manages global OMP launcher integration and Paseo provider configuration with CAS safety.

```bash
# Dry-run plan of configuration changes (no writes, no directory creation)
ags harness fleet integration plan [--paseo-home <path>] [--state-dir <path>] \
  [--omp-binary <path>] [--cli-path <path>] [--node-command <path>] [--omp-runtime-command <absolute-path>] [--omp-version <x.y.z>]

# Install owned wrappers and loader (dry-run unless --apply is passed)
ags harness fleet integration install --apply [--paseo-home <path>] [--state-dir <path>] \
  [--omp-binary <path>] [--cli-path <path>] [--node-command <path>] [--omp-runtime-command <absolute-path>] [--omp-version <x.y.z>]

# Uninstall wrappers and restore owned pointers (dry-run unless --apply is passed)
ags harness fleet integration uninstall --apply [--state-dir <path>]
```

#### `ags harness fleet runtime pin`
Builds and stores the installed runtime closure manifest from an operator-selected runtime spec. The manifest path must remain inside the private machine-global fleet state directory.

```bash
# Metadata-only plan; no executable probes or writes
ags harness fleet runtime pin --file <runtime-spec.json> [--state-dir <path>]

# Probe the selected installed runtime and trusted shipped worker assets, then persist the manifest
ags harness fleet runtime pin --file <runtime-spec.json> --apply [--state-dir <path>]
```

The default plan reports the target manifest path and whether the operation would create or replace an owned manifest; it does not run binaries or derive hashes. `--apply` computes the real SDK and closure digests, returns the resolved runtime, and writes a private manifest using compare-and-swap. Existing manifests require an exact `expectedManifestDigest` to replace; drift or unsafe ownership refuses. This operator bootstrap is machine-global and does not add project-local configuration.


#### `ags harness fleet context`
Resolves approved release guidance for an OMP session based on working directory, platform, and OMP version.

```bash
# Approved guidance for a session scope
ags harness fleet context --omp-version <x.y.z> [--cwd <path>] [--platform <platform>] [--state-dir <path>]

# Metadata-only canonical scope identity (never reads release pins)
ags harness fleet context --cwd <path> --scope-only [--state-dir <path>]
```

`--omp-version` is required for guidance resolution and must match the version verified at install time; without a verified version the command resolves nothing. `--scope-only` is used by the loader on a project transition and performs fresh read-only inventory plus policy identity resolution only. At each wrapped OMP launch, the loader rechecks the pinned targets' actual versions; a mismatch suppresses guidance but does not block the ordinary OMP launch.

The local scope resolver may select a primary registered project root or an SDK-registered checkout associated with that project. It canonicalizes the selected physical root and requires the machine-global path policy to cover that root before release lookup. SDK registration establishes association, not authorization. Git metadata and inherited permissions from the primary root are not used; no repository-local setup is required.

#### `ags harness fleet worker`
Internal remote worker entry point used by Paseo terminal execution. Emits a signed receipt marker on stdout.

```bash
ags harness fleet worker --state-dir <path> (--request <base64> | --control <base64>)
```


### 5.4 Truthful Status of Runtime Acceptance

In accordance with Zero-Trust delivery principles:
  1. **Docker Isolation**: Local runner requires a running Docker daemon on the host. In environments without an active Docker daemon, container execution is reported as unsupported rather than faking containment.
  2. **Cross-Machine Multi-Host Execution**: Remote dispatch protocol is implemented via Paseo terminal commands and signed receipts. Full live multi-host validation requires registered destination hosts on the Paseo daemon.
  3. **Human Release Signatures**: Production release activation requires externally generated Ed25519 signatures from authorized approver public keys; no automated self-signing or private human key generation is included.
  4. **Global OMP Installation**: `integration install --apply` writes owned launchers and edits the machine-global Paseo configuration. Tests use temporary homes only; a real user-home installation, daemon reload, and resulting OMP session remain explicit operator acceptance steps. Installation results distinguish `saved: true` from `daemonReloadRequired: true`.
