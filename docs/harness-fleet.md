# Global Harness Fleet Integration & Discovery

This document details the architecture, configuration, security model, and CLI commands for the global Paseo harness integration in `agent-skills-standard`.

## 1. Architectural Overview & Boundaries

The global harness integration provides a **one-time, per-user / per-host** machine-level configuration and read-only project and host inventory discovery across Paseo instances.

### Key Architectural Tenets

- **One-time user/machine setup**: Configured once per machine, eliminating repetitive per-repository `.skillsrc` setup or project-level pollution.
- **Strictly read-only discovery**: Discovers available projects and registered hosts across reachable Paseo targets.
- **Explicit daily runtime boundary**: This integration provides configuration management and inventory discovery **only**. It does **NOT** install an OMP extension, configure agent providers, or execute Harness² baseline/candidate experiments. Daily experiment dispatch, model execution, and runtime evaluation remain external daily runtime boundaries governed by separate human approval and external runner policies.
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
|            (REMOTE_ROUTING_UNAVAILABLE for remote projects via CLI)     |
+-------------------------------------------------------------------------+
       │
       ▼ (Read-only discovery output: complete:false when remotes present)
{ "schemaVersion": 1, "complete": true|false, "hosts": [ ... ] }
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
#### Zero Runtime / Runner Scope
Global harness configuration manages only the host connection parameters for Paseo and read-only inventory discovery. It does not install an agent daemon, run an OMP extension, or execute baseline/candidate experiment workflows.

---

## 3. CLI Command Reference

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
- When inventory discovery is partial (e.g., an enumerated remote host is unsupported or offline), outputs all reachable data with `complete: false` and exits with code `1`. Remote hosts report `status: "unsupported"` with `error: "REMOTE_ROUTING_UNAVAILABLE"` or `status: "unreachable"` with `error: "HOST_OFFLINE"`.

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

> **Note on Fleet Coverage**: When remote hosts are registered, the discovery output marks them as `unsupported` (`REMOTE_ROUTING_UNAVAILABLE`) and returns `complete: false` (exit code `1`). Full cross-host project enumeration requires an authenticated SDK connection route not exposed in the current Paseo CLI. Full fleet coverage across remote machines is pending and NOT claimed as complete.

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

## 4. Truthful Remote Compatibility & Isolation

1. **Bounded Subprocess Invocation**: Paseo CLI subprocesses are executed via direct `execFile` (argument arrays), never through an ambient shell. Processes run with bounded timeout (10s per host, 60s aggregate) and bounded buffer (4MiB). This bounds execution parameters and prevents shell injection, but is not OS-level containerization or process sandboxing.
2. **Environment Filtering**: Child processes execute with a sanitized, minimal environment (`PATH`, `HOME`, and standard system variables). Cwd `.env` and application secret files are never forwarded.
3. **No Credential Propagation**: Origin and remote host values are validated against credential injection. Any URI containing embedded user/password components (`user:pass@host`) is rejected immediately.
4. **Honest Remote Statuses & Evidence Limits**: Remote targets that are unreachable, unsupported, or disabled are reported truthfully with explicit status tags (`unreachable`, `unsupported`, `HOST_DISABLED`) and cause `complete: false`.
   - **Paseo Protocol Verification**: The pinned [`HostSummary` protocol](https://github.com/getpaseo/paseo/blob/72e3316f4f5dfe775c77dbf998968c92e2de9019/packages/protocol/src/hosts.ts) and [CLI handler](https://github.com/getpaseo/paseo/blob/72e3316f4f5dfe775c77dbf998968c92e2de9019/packages/cli/src/commands/host/index.ts) expose registrationId, nullable serverId, label and status, but no connection routing endpoint.
   - **Current Implementation Boundary**: The current bounded CLI enumerates origin projects and discovers registered remote host summaries. Because remote project lists cannot be queried via the CLI without an SDK connection route, remote hosts report `unsupported` with error `REMOTE_ROUTING_UNAVAILABLE`. The all-machine cross-host fleet goal remains active and pending; it is not claimed as complete.
5. **No Automatic Project Enrollment**: Discovering a project in the inventory does **NOT** authorize model execution, data export, or experiment dispatch. Project boundaries and client domains remain isolated.
