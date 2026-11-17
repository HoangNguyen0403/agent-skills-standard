# Retrospective native ingress — approved Gate B execution

The operator approved production Gate B for Darwin arm64/x64 and GNU/Linux glibc arm64/x64, repository-maintainer ownership of compiled release artifacts, and the existing Subagent-Driven approach. Native Gate A passed on Darwin arm64/Node 26 and independent review is clear. Authority: `docs/srs/adr-retrospective-darwin-secure-ingress.md`; SRS-003/004 and AC-003–006. Gate B is not release or cross-platform verification approval.

No dependency additions, automatic downloads/builds, remote CI execution, permission changes, publication, commits, private data reads or real consent changes. Build with existing system compiler and explicitly supplied Node headers. Missing prerequisites are blockers, not permission to install them. No Windows/musl native claim. Unrelated MCP tools remain usable when linkage is unavailable.

## Frozen component contract

- C Node-API 8; native module API version **1**. No V8, direct libuv, Node internals, FFI library or `FileHandle` adoption constructor.
- Source: `mcp/native/secure-ingress/secure_ingress.c`; driver: `mcp/native/secure-ingress/build.mjs`.
- Lazy TypeScript binding: `mcp/src/retrospective/native-ingress.ts`. It exports `loadNativeIngress()` and the types below. Native loading occurs only when called, never on unrelated tool registration.
- `loadNativeIngress(): Promise<NativeIngressLoadResult>` returns `{state:'available', api:NativeIngress}` or a fixed unavailable result. States/codes are `unsupported-target`/`NATIVE_UNSUPPORTED_TARGET`, `artifact-missing`/`NATIVE_ARTIFACT_MISSING`, and `load-failed`/`NATIVE_LOAD_FAILED`; messages are fixed and contain no paths/raw loader errors. The loader identifies glibc versus unsupported libc; Node-API stability is not libc compatibility.
- Directory/cursor capabilities are opaque and runtime-validated native objects, not numeric descriptors or pointers. `NativeEntry` has `name:string` and `kind:'file'|'directory'|'symlink'|'other'|'unknown'`.
- `NativeIngress` methods all return promises, including validation failures:
  - `openRoot(absoluteRoot:string): Promise<NativeDirectory>` — component walk from trusted root.
  - `openChildDirectory(parent:NativeDirectory, component:string): Promise<NativeDirectory>`.
  - `openRegularFile(parent:NativeDirectory, component:string): Promise<number>` — transfer validated read-only regular-file descriptor on successful delivery.
  - `openDirectoryStream(directory:NativeDirectory): Promise<NativeCursor>` — independent open-file description, not duplicate shared-offset cursors.
  - `readDirectoryBatch(cursor:NativeCursor, maxEntries:number): Promise<{entries:readonly NativeEntry[], visited:number, done:boolean}>` — finite integral 1–64; bound consumed entries, including filtered entries; `entries.length <= visited <= maxEntries`. Empty entries do not imply EOF unless `done`.
  - `closeDirectoryStream(cursor:NativeCursor): Promise<void>` and `closeDirectory(directory:NativeDirectory): Promise<void>` — idempotent, reject new work, drain active work and close once.
- Native operation errors have fixed codes/messages, never user paths/components. Native work retains ownership of newly opened resources until successful JS delivery. Cancellation/completion/delivery failure releases resources; live work is not freed early. Worker execution does no ordinary JS/N-API value manipulation.
- The source adapter exports `ReadSource` with `stat():Promise<Stats>`, `read(buffer:Buffer, offset:number, length:number, position:number):Promise<{bytesRead:number,buffer:Buffer}>`, and `close():Promise<void>`. Prove ordinary Node `FileHandle` structural compatibility. A numeric-fd adapter uses documented Node APIs and waits for pending reads before close. Parsers/snapshot/aggregate borrow and never close it.
- Preserve the existing mutually exclusive `SourceLocation` path/borrowed-handle branches, narrowing only the borrowed handle type to `ReadSource`; do not add another transport. Header parse and both passes use the same pinned source and aggregate `expectedSessionId`/digest checks.
- Explicit builder CLI: `node mcp/native/secure-ingress/build.mjs --target <target> --node-include <existing-sdk-dir>`. Targets: `darwin-arm64`, `darwin-x64`, `linux-arm64-gnu`, `linux-x64-gnu`. No header download/cross-toolchain installation. Reject incompatible host/toolchain rather than pretending to cross-build.
- Assets: `mcp/prebuilds/<target>/secure_ingress.node` plus per-target `manifest.json`. Manifest binds API/NAPI version, target, source/binary SHA-256, sanitized compiler/SDK version and compatibility baseline. Do not include absolute workspace/SDK paths or environment dumps.
- Manifest schema is fixed: `{schemaVersion:1,apiVersion:1,napiVersion:8,target,sourceSha256,binarySha256,compiler:{name,version},sdk:{name,version},compatibility:{minimumOsVersion,minimumGlibcVersion,minimumKernelVersion},buildFlags:string[]}`. All three compatibility fields are strings or null: Darwin uses `11.0`/`10.15` OS minima and null glibc/kernel; Linux uses null OS, `2.28` glibc and `4.18` kernel. Digests are lowercase SHA-256 hex. Compiler/SDK identifiers and flags are sanitized and contain no absolute paths. The loader/verifier reject mismatched target/API/NAPI and invalid metadata.
- Abort does not abandon an unresolved native-open promise. The integration owner awaits completion, adopts each delivered resource immediately, then closes it if cancellation occurred. No `Promise.race` that leaks a late descriptor.
- Mac deployment checks and Linux glibc-2.28 builder/symbol checks are mandatory. Pin actual CI builder identities before finalizing configuration. Missing advertised assets are broken installation, not ordinary empty record scans. Unsupported targets, missing artifacts and load failures stay distinguishable; none produces complete-tree wording.

## Task 1: Native capability core, loader and explicit builder

- **Owner:** native-core worker, exclusive C/loader/builder/test paths.
- **Scope:** Only the five native-core source/builder/loader/test files named below and the native-core receipt.
- **Real ingress:** Real native filesystem capabilities and the package loader, exercised with synthetic paths; no mocked replacement for containment.
- **Positive invariant:** Successful post-swap traversal remains rooted in the approved capability and transfers a regular descriptor once.
- **Negative invariant:** Symlinks, invalid components, wrong capabilities, invalid batch numbers and closed handles never yield a readable source.
- **Correction route:** One concrete parent AC-failure follow-up; a second quality failure or material design decision returns to parent, not self-delegation.
- **Owned paths:** `mcp/native/secure-ingress/secure_ingress.c`, `mcp/native/secure-ingress/build.mjs`, `mcp/native/secure-ingress/README.md`, `mcp/src/retrospective/native-ingress.ts`, `mcp/test/retrospective-native-ingress.spec.ts`; native-core receipt under artifacts.
- **Inputs:** ADR, frozen contract above, reviewed Gate-A artifacts and parent-verification.json. Read primary Node-API async/lifetime documentation. No project-specific C skill was matched; do not claim otherwise.
- **Outputs:** real async read-only capability API, bounded enumeration, independent cursors, exact ownership/close behavior, fixed errors, lazy trusted-package loader, explicit dependency-free builder and real native API tests.
- **Invariants:** no path fallback, cwd mutation, arbitrary flags/symbols, raw pointers or native-owned-resource leaks. Public child names reject empty/dot/dot-dot/separators/NUL. Validate finite integral batch bounds before narrowing. Preserve Node-API 8.
- **Positive/negative:** successful pinned traversal and post-swap opens; symlink/nonregular/malformed input rejection; concurrent close/in-flight completion; failed delivery cleanup; raw file descriptor ownership; unsupported/missing/load-failed outcomes; no effect on unrelated module imports.
- **Verification owner:** parent runs build plus focused native suite after freeze. No mid-flight build/test/lint/typecheck/formatter commands.
- **Handoff / freeze:** FINAL source-ready/frozen receipt with exact files, AC mapping, compiler/header prerequisites and one parent command. No passing claims for unexecuted targets.

## Task 2: Read-source adapter and consented ingress cutover

- **Owner:** integration worker, exclusive adapter/reader/discovery/run/aggregate/error consumers and focused tests. Wait for engine recovery handoff; never edit its files concurrently.
- **Scope:** Only the adapter and existing reader/discovery/run/aggregate/error paths plus focused tests listed below.
- **Inputs:** Frozen component contract, current engine-recovery handoff, approved SRS/ADR, existing consent v5 and focused synthetic fixtures.
- **Real ingress:** Native capabilities open consented record/session files; header, snapshot and aggregation borrow the same adopted source.
- **Positive invariant:** Matching provider/session identity and unchanged hashed bytes produce truthful descendants and current diagnostic reports.
- **Negative invariant:** Ancestor swaps, late aborts, mismatched identity and unavailable native installations cannot publish falsely complete linkage.
- **Verification owner:** Parent runs the frozen focused gate; worker runs no checks mid-flight.
- **Correction route:** One parent AC-failure follow-up; unresolved safety/interface decisions return to parent.
- **Owned paths:** new `mcp/src/retrospective/read-source.ts`; `agent-records.ts`, `discovery.ts`, `run.ts`, `aggregate.ts`, `errors.ts`; matching reader/discovery/run/aggregate and new read-source specs. No native-core, package/CI or consent/CLI changes without a parent grant.
- **Outputs:** one structural borrowed source, safe native record and host-session enumeration/read, exact four-field projection, same-source header/snapshot/aggregate, expected identity verification, closing on every exit. Remove obsolete descriptor-path traversal and unused stream-only interfaces after callers migrate.
- **Invariants:** v5 consent/root revalidation unchanged; no record-supplied path opens; provider `omp` only; graph/cycle/depth/source budgets and truthful counts preserved; all consumed entries charged; gaps/truncation remain explicit. Broken native installations differ from ordinary linkage gaps. Empty agent-root opt-out skips native loading.
- **Verification:** parent synthetic grandchild lineage, swaps, missing/unsupported inputs, caps, abort/cleanup, native installation failures, borrowed-handle and actual report/index publication. No private or real consent tests. No checks mid-flight.
- **Handoff / freeze:** FINAL frozen receipt with exact field/error deltas and parent gate. Preserve frozen v1 history and current decision/session measurement fixes.

## Task 3: Package assets, CI configuration and documentation parity

- **Owner:** packaging/docs worker; disjoint from native and integration source owners.
- **Scope:** Only package metadata, native asset verification, relevant CI configuration and previously owned documentation listed below.
- **Inputs:** Frozen native API/manifest/builder contract, approved ADR/SRS, current package and workflows, primary public compatibility metadata.
- **Real ingress:** Explicit packaged native artifacts and current-target tarball loading; future CI definitions do not count as execution.
- **Invariants:** No dependency or approval-control changes; no runtime download, install compilation, unsafe fallback or release.
- **Positive invariant:** Each declared artifact is bound to source/binary hashes, real compiler/SDK provenance and an enforced compatibility baseline.
- **Negative invariant:** Missing/wrong target assets and unverified platforms never count as complete package acceptance.
- **Verification owner:** Parent runs local asset/packed-package checks after freeze; no worker execution.
- **Correction route:** Return missing builder/packaging authority or one corrective failure to parent; never invent an image digest or execute remote work.
- **Owned paths:** `mcp/package.json`; new `mcp/native/secure-ingress/verify-assets.mjs`; `.github/workflows/ci.yml`, `.github/workflows/publish.yml` relevant native jobs only; previously owned retrospective docs/architecture/changelog and a packaging receipt.
- **Outputs:** package-owned native assets/source/build driver; explicit build and publish-completeness checks; four-target CI configuration and compatibility/provenance metadata; precise source-candidate docs. No automatic install/startup compilation or runtime downloads.
- **Invariants:** no new dependencies or permission grants. CI native build jobs are secretless/read-only; preserve existing publish authorization boundaries. Resolve and cite actual maintained compatible builder image digests/toolchains; never insert placeholders or latest-host assumptions. Configuration is not a CI execution result.
- **Verification:** parent local packed-package load with install scripts disabled and existing dependencies only; wrong/missing binary failures; unrelated MCP import usability. All advertised targets remain Gate-C-unverified until actual execution is authorized and observed.
- **Handoff / freeze:** FINAL frozen exact file/command/target checklist and remaining external-execution requirements. No remote workflow, release or registry publication.

## Task 4: Parent integrated verification and independent acceptance

- Execute narrow component gates after each owned source freeze, then the final real producer-to-consumer synthetic replay. Verify actual report/index through the separately authorized existing sandboxed headless browser; no denied DOM injection.
- Obtain independent native memory/resource/security review and integration/privacy review on pinned final snapshots. Author claims are not verification.
- Refresh affected docs/canonical exports; preserve failure evidence. Record Node 20/other target execution as NOT RUN until actually observed. Do not supply completion readiness while tasks or external gates are pending.
- No release/commit/private data/real consent/live efficacy run is implied. Gate C and publication require their own authorization.
