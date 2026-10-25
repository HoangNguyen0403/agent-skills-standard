# Fleet harness implementation evidence

Date: 2026-10-25. Scope: the approved full fleet implementation in `agent-skills-standard`, including one-time machine-global setup, global OMP launch integration, local and SDK-routed execution, evaluation, and release controls. This walkthrough records parent-reported evidence separately from production activation and acceptance; the initial setup/discovery checkpoints below are historical.

## Historical setup and discovery checkpoints

- Initial focused CLI/service suite: 74 passed, 2 failed (non-directory ancestor produced raw ENOTDIR; foreign-lock test hit runner timeout).
- First correction checkpoint: 75 passed, 1 failed (fake-timer lock test still timed out).
- Corrected checkpoint: 76 passed across three focused files; CLI build succeeded.
- Full CLI regression checkpoint: 67 files, 1346 tests passed. Vite emitted an existing CommonJS/ESM configLoader warning; it was not suppressed.
- Built CLI exercised with temporary state and two temporary working directories. First contained a hostile .env and deliberately invalid .skillsrc. Setup was reusable from the second directory; no per-project configuration was written. Actual local Paseo inventory contained registered workspace projects across representative checking targets. Edited config refused uninstall; restored unchanged config uninstalled successfully. Temporary smoke state was removed. Neither checking repository's source was opened or modified by the smoke.
- Changed-file ESLint checkpoint found two no-control-regex errors; validation was changed to equivalent explicit character checks. Final verification follows the settled correction.

## Historical remote compatibility correction

An initial implementation inferred a connection output field from host-add/update input flags. Authoritative public source disproved that inference. Source at Paseo revision 72e3316f4f5dfe775c77dbf998968c92e2de9019:

- https://github.com/getpaseo/paseo/blob/72e3316f4f5dfe775c77dbf998968c92e2de9019/packages/cli/src/commands/host/index.ts
- https://github.com/getpaseo/paseo/blob/72e3316f4f5dfe775c77dbf998968c92e2de9019/packages/protocol/src/hosts.ts

The CLI returns HostSummary[] with registrationId and nullable serverId, but no reusable connection endpoint. targetDescription is not an execution target. Destination routing uses Paseo's server-ID host route, not a guessed endpoint. Remote project coverage is therefore NOT established by local inventory or synthetic fixtures; remaining cross-host ACs stay unmet. The installed host directory contained no destinations, so no real second-machine test was possible.

## Independent review

- An independent review verified setup/discovery contracts and implementation separately from implementation owners. Findings included nonregular state-file checks, empty-origin validation, parser output handling, top-level dotenv detection, stale-lock recovery documentation, secret-free host identities, and remote identity deduplication. Corrective owners addressed those findings. No human release approval or deployment authority is inferred from agent review.

## Remaining PRD gates

REQ-001 through REQ-010 are not delivered by this command family: account-safe execution enrollment; isolated OMP runner; experiment budgets and cancellation/fencing; scoped learning and evaluator isolation; human-approved promotion/rollback; full fleet reporting. REQ-011 is partial until cross-host project discovery is implemented through an authenticated supported routing API and verified. AC-028 and the original two-machine AC-023 are not complete.

No OMP extension was installed, no provider or real user-home configuration was changed, no model-backed experiments were launched, and no remote CI was run at this checkpoint. The local digest receipt is ownership bookkeeping, not authenticated human approval or protection against a malicious same-user process.

## Initial local verification checkpoint

- After removing unsupported connection-based remote traversal, a full-suite checkpoint passed 1342 tests and failed one obsolete remote-timeout test. That test depended on the number of Date.now calls in the removed traversal and was deleted, not re-pinned; remote offline/disabled/unsupported coverage remains.
- Final `pnpm --filter ./cli test`: 67 files, 1342 tests passed.
- Final `pnpm --filter ./cli build`: passed.
- ESLint on all seven changed TypeScript implementation/test files: passed.
- Final built CLI smoke: passed, registered workspace projects discovered across representative checking targets, setup reusable across directories, project files unchanged, tampered-config removal refused, uninstall verified.
- Independent final source review found no material blocker in bounded setup/discovery. Remote routing remains unavailable and yields incomplete coverage explicitly. AC-028 is still pending.
- At this local pre-push verification checkpoint, corrective remote CI had not yet run; second-machine execution, global installation, and full Harness² runtime acceptance were not performed.

## PR-readiness verification checkpoint

- Review found setup changed permissions on a pre-existing directory before ownership checks. The correction creates the leaf exclusively, applies private permissions only to newly created directories, and rejects insecure existing POSIX directories with `STATE_PERMISSIONS` without changing their contents or mode.
- Independent re-review cleared that Major finding; no remaining Major/Blocker was identified for this bounded change.
- `pnpm --filter ./cli test`: 67 files, 1344 tests passed, including the new foreign-directory preservation cases.
- CLI build, ESLint and Prettier checks on all changed TypeScript files passed. An intermediate ESLint run caught an unused initializer; it was removed before this final covering gate.
- Built CLI smoke passed from two temporary working directories with a single temporary configuration. It verified JSON parser errors, no cwd dotenv influence, local checking-target discovery, unchanged project files, config-integrity refusal, safe uninstall, and preservation of an existing 0755 directory containing unrelated configuration.
- `pnpm validate:all`: 333 passed / 0 failed, with 55 skill-description warnings; redundancy and injection checks passed. Freshness audit reported 17 issues (0 high, 10 medium, 7 low) in untouched skill files.
- `pnpm audit:sdlc`, `pnpm check-alignment` and `pnpm docs:capabilities:check` passed. Alignment emitted three advisory below-90% warnings; all met the 70% gate.
- HEAD matched fetched `origin/develop` at this checkpoint; no rebase was required. No skill, workflow, capability-table or generated-mirror source changed, so skill version bumps and mirror generation were not applicable.
- Remote CI has not run. This is readiness evidence for global setup/origin discovery only; AC-028, AC-023 and the full experiment runtime remain unmet.
## Fleet orchestration and global integration verification checkpoint

- Implemented `IntegrationService.ts` providing compare-and-swap (CAS) plan, install, and uninstall lifecycles for global Paseo OMP launcher integration.
- Implemented `FleetCommand.ts` and registered `ags harness fleet` commands (`configure`, `doctor`, `status`, `run`, `cancel`, `reconcile`, `evaluate`, `release`, `integration`, `context`, `worker`).
- Integration behavior covered by `IntegrationService.spec.ts` using temporary state and a fake OMP executable:
  - Plan validates the touched Paseo v0.13 families (terminal `command:string` plus separate `args`; agent provider `command:string[]`) before and after the edit, and rejects wrong types with `INVALID_PASEO_CONFIG`.
  - Base `omp`, direct `extends === 'omp'` aliases, and transitive aliases whose chain reaches `omp` are planned; each distinct original executable gets its own `omp-wrapper-<digest8>.sh`, and provider prefix arguments survive as `[wrapper, ...originalArgs]`.
  - A derived alias that omits `command` keeps inheriting the already-wrapped ancestor prefix: its command stays absent and is reported in `coverage.inheritedProviders` rather than being replaced by a default.
  - A package-managed `omp` symlink onto a `package.json`-declared `omp` bin target is accepted; `--omp-version` is checked against each actual target (`OMP_VERSION_MISMATCH`), conflicted/unidentified targets refuse, and reinstall drift refuses (`OMP_VERSION_DRIFT`).
  - Existing artifacts are adopted only with matching bytes and exact private mode; receipt/journal metadata must be a private regular file.
  - Wrapper execution is exercised end-to-end through the generated script: argv order, stdout, stderr, exit status, stdin forwarding, and SIGTERM delivery.
  - Dry-run install performs no writes and creates no owned directories.
  - Active install stages content-addressed owned artifacts, stores a private `0600` backup, revalidates the config digest at the rename boundary, and writes the ownership receipt.
  - Repeat install is idempotent when owned bytes are unchanged; edited wrapper bytes, a corrupt receipt, or a foreign loader refuse instead of overwriting.
  - A journaled install whose config commit completed is recovered on the next install; a held lock refuses with an explicit manual-recovery message.
  - Uninstall dry run is strictly read-only: it acquires no lock, performs no journal recovery, deletes nothing, and reports `pendingRecovery`/`recoveryPhase` when a journaled transition is waiting; active uninstall restores only owned pointers, preserves unrelated fields, removes verified artifacts, and refuses edited pointers, edited backups, or unrelated config changes.
- Context behavior covered by `IntegrationService.spec.ts`:
  - Requires a reachable, error-free origin record with an authoritative server ID; missing identity, a failed/partial origin inventory, and equal-length canonical matches return `null`, while an offline unrelated remote host does not block the local origin.
  - Resolves a metadata-only canonical scope identity through the `--scope-only` protocol without reading release pins.
  - Rejects a FIFO configuration path without blocking, using a nonblocking descriptor type check before any read.
  - Rejects a configured nonlocal origin instead of canonicalizing remote roots on this machine.
  - Requires a verified OMP version; unknown or malformed versions resolve nothing.
  - Unauthorized policy or absent approved guidance returns `null`.
- Loader behavior covered by `IntegrationService.spec.ts` through a real child-process import of the generated ESM extension:
  - Registers supported `before_agent_start` and `session_shutdown` handlers; the prompt hook returns `systemPrompt:string[]`.
  - Caches by actual session plus canonical project identity: a nested cwd of the same project reuses the frozen guidance while the global pin changes, the exact cwd performs no lookup, and a real project switch resolves its own scope.
  - A new actual session resolves the new pin; shutdown releases the session so it re-admits; missing session identity fails closed without a lookup.
  - Reapplies the cached segment to each fresh prepared prompt and deduplicates only that exact segment.
  - Injects nothing when a pinned target binary reports a different version at launch, while the ordinary OMP launch is unaffected.
- CLI behavior covered by `FleetCommand.spec.ts`: bounded descriptor-based file input (missing/symlink/FIFO-shaped/oversized/invalid JSON), strict FleetConfig parsing, default dry-run vs `--execute`, worker argument XOR plus exactly one receipt marker, and integration plan/install dry-run output with explicit trusted sources.
- Heldout CLI routing covered by `FleetCommand.spec.ts` with injected coordinator doubles: `evaluate --file` preview preserves `draftDigest`, permits missing draft `caseId`, and omits attempt UUIDs while passing `{execute:false}`; `--file`/`--plan-digest` are mutually exclusive; both selectors reject ineligible, unresolved, and blocked outcomes while treating `recovered` attempts as terminal; `run --release-digest` passes the candidate into the coordinator and exits non-zero when `passed` is false; `doctor` gates on `supported`; `context --scope-only` resolves without an OMP version.
- Historical evidence limit at that source-test checkpoint: coordinator, remote worker, evaluation persistence, and runtime-manifest generation were still awaiting their owners' gates. The later integrated gates are recorded below; those local results still do not establish production acceptance.
- Auxiliary loader metadata subprocesses use a fixed allowlisted environment and the validated private state directory as cwd. The selected runtime kind/path and any separately required interpreter for a simple OMP `env node`/`env bun` shebang are recorded in receipt/journal schema v3; unsupported interpreter-argument forms fail closed. An optional absolute `--omp-runtime-command` is clean-probed when neither the selected runtime nor installer process runtime supplies the required kind. No ambient/project `PATH` search is used. Env-shebang version probes invoke the verified interpreter directly with the target and `--version` arguments; only verified Bun receives isolation flags. The generated loader digest binds each target's interpreter mapping. Bun context invocations disable package and env-file loading. The generated ordinary OMP wrapper continues to pass caller environment and argv unchanged. Generated-loader coverage includes a separate env-Bun target/Node auxiliary runtime and session shutdown cleanup; source bounds admission to 256 without eviction. At that correction checkpoint, parent verification remained pending; the final generated-loader smokes are recorded below.

### Earlier parent-observed gate facts — historical and superseded by the final checkpoint below

These exact local results were reported by the parent orchestration session for the core and SDK slices; they are recorded here as reported facts with their scope, not as evidence for this integration slice:

- **Core runtime gate**: 84/84 focused tests passed, with the stale `AsyncLocalStorage` descendant excluded and two committed mutations included; 12 concurrent commits were preserved, and an actual ancestor-symlink domain escape was denied with `DOMAIN_NOT_FOUND`. The independent core source review at `/tmp/ags-fleet-core-final-review.md` (dated addendum) records C1–C11 cleared.
- **SDK discovery**: the earlier 46/46 suite plus an actual origin inventory enumerating 10 projects.
- **Runner**: a reported 41-pass claim is contradicted by a parent-observed 40/41 with one timeout; runner correction work continues. No runner pass is claimed here.
- **Not claimed**: full-suite or current-build status, release/sandbox or two-host live acceptance, and completion of AC-001 through AC-030. The integration slice above remains source-behavior evidence only.

### Intermediate integration continuation — 2026-10-25 (historical)

- Source corrections address D1–D8 and review findings G1–G5: package-bin resolution, inherited provider commands, OMP-version verification, canonical-cwd and physical-scope session caching, complete JSON document parsing, JSON-safe absent command provenance, bounded FIFO-safe reads, read-only uninstall dry runs, ownership modes, and plan-result/manifest-size handling.
- The public bootstrap is `fleet runtime pin --file <runtime-spec> [--apply]`: dry-run performs metadata-only planning without probes or writes; apply derives actual SDK/manifest hashes from trusted shipped assets and performs private owned-file CAS.
- Evaluation CLI follows the coordinator's preview, frozen execute/resume, and persisted-plan aggregation contracts. File previews expose `draftDigest` (not `planDigest`), allow omitted draft case IDs, and omit attempt UUIDs; unresolved or blocked execution sides exit non-zero, while recovered sides are terminal.
- Registered checkout scope uses only SDK workspace associations joined to the registered project. The selected physical checkout root is canonicalized locally and must be covered by the machine-global path policy before release lookup; that same root is passed to release context. Discovery is association metadata, not authorization. No Git-common-directory inference, primary-root permission inheritance, or per-repository configuration.
- Verification boundary at that correction checkpoint: tests, build, lint, formatting, temporary-home runtime-pin smoke, FIFO subprocess smoke, and built-CLI pin/bootstrap checks were still pending. This historical status is superseded by the final parent-reported evidence below; its earlier test counts remain historical, not current. No complete AC-001–030 acceptance was claimed then or is claimed by the later local gates.

### Final integrated verification checkpoint — parent-reported, post-format, 2026-10-25

This section records results supplied by the parent integration run; this documentation pass did not rerun them.

- **Tests:** final CLI suite `1808/1808` across 84 files; focused Integration/CLI `98/98`; FleetCoordinator/FleetRemoteDispatcher/remoteWorkerProtocol `91/91`; runner `55/55`; ReleaseService `30/30`. `validate:all` passed `333/333` with 55 skill-description warnings; `docs:capabilities:check` passed. Workflow YAML/order and local source-CI review passed, but no GitHub CI run is claimed.
- **Build and quality gates:** main and standalone worker builds passed (93 and 138 modules). Final Prettier and scoped ESLint passed. TypeScript checking exits 2 with 19 diagnostics identical to baseline at `7fe39ca4`/TypeScript 6.0.3 and zero introduced diagnostics; this is not a clean typecheck. Vite's native-loader ESM/CommonJS warning and `inlineDynamicImports` deprecation remain visible.
- **Generated-loader and packaged CLI:** actual built loader passed Node-auxiliary/Bun-target and Bun-auxiliary/Node-target smokes, including real Bun-parent dotenv preload isolation, guidance resolution, frozen reuse, and unchanged ordinary wrapper environment/argv. Actual built CLI `2.6.6 --version` succeeded under Node and Bun. The fake OMP target and synthetic CLI were not a real OMP session or live SDK inventory.
- **Runtime and integration smoke:** the packaged **OMP SDK 18.12.6** health smoke used Bun 1.3.14, one synthetic `sandbox_exec`, and zero model tokens; the separate Paseo client 0.13 is used for routing. Manifest digest `835a0c30f7024d9d110d27f177164983792219941991cf63c80e0dce1cc8ff93`, SDK digest `12ad735d8978479589d467dfbeb79184409bf2e0b2bd075bda374d1757c7de3f`; dependency tampering and worker-byte drift were denied before import/probe. Fake Docker performed four `--version` probes only; synthetic image is not evidence of engine containment. Built integration plan/dry-run, prefix and wrapper forwarding, idempotent reinstall, exact uninstall restoration, setup acceptance cases, and current status aggregation passed in temporary state.
- **Remaining boundaries:** no live Paseo membership query was performed; it was explicitly denied and not retried or bypassed. No actual global user configuration install, daemon reload, OMP session, Docker-engine containment, registered two-host execution, paid fleet evaluation, measured candidate gain, or human activation/signature occurred. AC-023 and complete AC-001–030 acceptance remain open. The deterministic OSS delta scan is complete; corrective remote GitHub CI remains pending.
- **Open findings:** production dependency audit remains **FAIL: 2 HIGH** for baseline `body-parser@2.3.0` and `multer@2.4.0` at `7fe39ca4`; the triage identifies an active HTTP-parser path for body-parser but did not demonstrate multer's advisory-specific asynchronous upload-filter precondition. No remediation or overall security pass is claimed. The unrelated product-evidence suite is `84/85`, with an expected-exit mismatch (actual exit 2); its cause is unproven and no rerun is claimed.

These are local implementation gates, not production acceptance, security clearance, or evidence of paid model efficacy.

## Acceptance criteria coverage

- **AC-001** (REQ-001): Discovered unenrolled projects reject experiment dispatch.
- **AC-002** (REQ-001): Unreachable enrolled hosts preserve project inventory with unreachable status.
- **AC-003** (REQ-002): Multiple checkouts of one project reference the same logical project identity.
- **AC-004** (REQ-002): Completed attempts identify exact resolved inputs and revisions.
- **AC-005** (REQ-003): Candidate executions outside permitted workspace are denied.
- **AC-006** (REQ-003): Active ordinary sessions keep resolved harness unchanged when experiments start.
- **AC-007** (REQ-004): Ordinary tasks without experiment authorization spawn no candidate probes.
- **AC-008** (REQ-004): Tasks requiring live external side effects reject replay without isolated substitutes.
- **AC-009** (REQ-005): Ineligible provider/account combinations send no model requests.
- **AC-010** (REQ-005): Ineligible/unreservable budgets reject experiments before execution.
- **AC-011** (REQ-005): Local coordinator loss terminates bounded workloads upon deadline expiry.
- **AC-012** (REQ-006): Expired remote leases prevent duplicate attempts before reconciliation or fencing.
- **AC-013** (REQ-006): Missing completion evidence prevents reporting attempts as successful.
- **AC-014** (REQ-007): Central reports exclude fields outside the authorized export schema.
- **AC-015** (REQ-007): Project-specific lessons require explicit scoped promotion before cross-project resolution.
- **AC-016** (REQ-008): Inconclusive candidate comparisons keep baseline active.
- **AC-017** (REQ-008): Critical regressions on required projects reject promotion even with aggregate gains.
- **AC-018** (REQ-008): Frozen held-out evaluation isolates completed task feedback from candidate learning.
- **AC-019** (REQ-009): Evaluation success without human release approval leaves candidate inactive.
- **AC-020** (REQ-009): Incompatible host rollout keeps prior approved compatible version.
- **AC-021** (REQ-009): Approved rollback resolves previous approved version for new sessions.
- **AC-022** (REQ-009): Shared harness updates do not overwrite project-local policy.
- **AC-023** (REQ-010): Multi-host canary experiment reporting across enrolled machines.
- **AC-024** (REQ-005): Immutable control edits reject candidate admission under POL-003.
- **AC-025** (REQ-011): Harness setup creates config and receipt with private 0700/0600 permissions.
- **AC-026** (REQ-011): Re-run with identical config succeeds idempotently with created: false.
- **AC-027** (REQ-011): Unconfigured state status/discover emits non-zero exit without creating directories.
- **AC-028** (REQ-011): Configured discover performs read-only Paseo enumeration without cwd dotenv mutation.
- **AC-029** (REQ-011): Harness uninstall removes only owned config and receipt without recursive deletion.
- **AC-030** (REQ-011): Corrupted, tampered, or symlinked state fails closed with non-zero exit code.

