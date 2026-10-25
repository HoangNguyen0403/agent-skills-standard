# Fleet harness implementation evidence

Date: 2026-10-25. Scope: one-time user-level configuration and read-only discovery in agent-skills-standard. This is partial implementation of the fleet PRD, not an activated Harness²/OMP experiment system.

## Observed local checkpoints

- Initial focused CLI/service suite: 74 passed, 2 failed (non-directory ancestor produced raw ENOTDIR; foreign-lock test hit runner timeout).
- First correction checkpoint: 75 passed, 1 failed (fake-timer lock test still timed out).
- Corrected checkpoint: 76 passed across three focused files; CLI build succeeded.
- Full CLI regression checkpoint: 67 files, 1346 tests passed. Vite emitted an existing CommonJS/ESM configLoader warning; it was not suppressed.
- Built CLI exercised with temporary state and two temporary working directories. First contained a hostile .env and deliberately invalid .skillsrc. Setup was reusable from the second directory; no per-project configuration was written. Actual local Paseo inventory contained registered workspace projects across representative checking targets. Edited config refused uninstall; restored unchanged config uninstalled successfully. Temporary smoke state was removed. Neither checking repository's source was opened or modified by the smoke.
- Changed-file ESLint checkpoint found two no-control-regex errors; validation was changed to equivalent explicit character checks. Final verification follows the settled correction.

## Remote compatibility correction

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
