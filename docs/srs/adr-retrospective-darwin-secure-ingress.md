# ADR: Secure Darwin retrospective ingress

Status: **Gate A passed and independently clear; production Gate B approved, implementation pending**.

## Authority and evidence

The operator authorized native-bridge design and an isolated synthetic feasibility proof using existing compiler/Node headers, preserving the approved Paseo-linkage scope. After Gate A passed, the operator approved production C, source-interface/ingress migration, package assets and CI configuration for Darwin arm64/x64 and GNU/Linux glibc arm64/x64, with repository maintainers owning release artifacts. No dependency additions, downloads, remote CI execution, publication, commits, permission changes, private-data reads or real consent changes are authorized.

Trace: SRS-003/004, AC-003–006 in [the diagnostic-signals SRS](srs-retrospective-diagnostic-signals.md).

Observed on Darwin: the reader/consent gate had 5 failures and 24 passes; valid agent records were not read. An isolated synthetic diagnostic returned `ENOENT` for `/dev/fd/<fd>/<child>`. The current descriptor-path implementation is not functional on this platform. An ordinary-path fallback would reintroduce ancestor-swap races.

The MCP package requires Node >=20, currently has no native runtime dependency, builds CJS with `tsup --clean`, and packages `dist`. Its publish workflow builds on Ubuntu only. The existing cross-platform CI job tests CLI MCP configuration, not native ingress. These workflows cannot establish Darwin native-binary correctness without changes.

## Decision

Use a small repository-owned, read-only C Node-API addon. The isolated feasibility proof passed before production authorization. Use system libc and Node-API 8; no V8 or Node internal APIs. The approved matrix contains four targets, not every ABI-stable platform.

| Option | Runtime and distribution cost | Decision |
| --- | --- | --- |
| Owned Node-API addon | Small dedicated native surface; packaged binaries, native review and multi-platform release maintenance required; native defects can crash MCP | Approved for Gate B |
| Koffi/libc FFI | New general-purpose runtime dependency; platform-specific structures, symbols and ownership bindings | Not preferred: broader surface than the required operations |
| Owned helper process | Native executable plus bounded read-at RPC, framing, backpressure and crash handling | Alternative if crash isolation justifies protocol complexity; not inherently sandboxed |

No unsafe path fallback, runtime download, automatic compilation, approval-control change or install script is proposed.

## Capability boundary

Expose only these read-only operations:

1. Open a canonical consent-approved absolute root component-by-component from a trusted root descriptor using `openat`.
2. Open a single child component relative to an existing directory capability.
3. Enumerate a directory with `fdopendir`/`readdir` in bounded batches.
4. Transfer an opened, `fstat`-verified regular-file descriptor to its Node owner.
5. Explicitly close capabilities. Finalizers contain leaks; they are not the normal lifecycle.

Child names reject empty values, `.`, `..`, separators and NUL. Use platform header constants, including `O_NOFOLLOW`, `O_CLOEXEC`, directory flags and nonblocking file-open flags where applicable. Reject nonregular files before reading. Do not expose arbitrary flags, native symbols, writes, process-wide `chdir`, or raw pointers.

The consent-root path remains the authorization boundary. Enumeration and file opening must preserve the pinned parent chain; repeated `realpath` checks around absolute opens are not a substitute. No new hardlink prohibition is inferred from the SRS.

`fdopendir` takes ownership of its descriptor. Enumeration must use a separately owned descriptor when the directory capability remains live; never double-close a descriptor owned by `DIR*`.

## Node consumer contract

There is no documented public constructor for adopting a numeric descriptor as a Node `FileHandle`. Do not invent one or use Node internals.

Prefer one narrow borrowed read-source capability rather than adding another competing source transport:

- `stat()` returns the metadata needed for regular-file and size validation.
- `read(buffer, offset, length, position)` performs a bounded positional read.
- `close()` is asynchronous and idempotent.

Existing `FileHandle` sources can satisfy that capability structurally. A native descriptor wrapper uses documented `fs.fstat`, `fs.read` and `fs.close` APIs. Exact TypeScript compatibility must be proved before changing the exported internal interface. Preserve the existing path-backed branch for existing ingress; new host reads never reopen a pathname.

Ownership transfers exactly once: native code owns a file descriptor until successful transfer, then the run owns the wrapper. Header parsing, snapshot capture and aggregation borrow the same source from explicit offset zero. They never close it. The run closes it in `finally` after active reads settle, including already-prepared, error, cancellation and consent-revocation exits.

Preserve `expectedSessionId` validation in the aggregate pass over snapshot-digest-verified bytes. Discovery's earlier header check and retained inode do not establish immutable byte identity.

## Bounds, privacy and cancellation

Keep the approved record-byte, directory, record, total-entry, descendant and depth limits. Charge every consumed directory entry, including irrelevant and duplicate entries. Do not materialize a whole directory before applying its budget.

Keep JSON parsing and immediate four-field projection in TypeScript. Retain only `id`, `provider`, `sessionId` and nullable `parentAgentId`; support only the proven OMP provider mapping. Native enumeration exposes bounded names/type metadata, not arbitrary file contents.

Never persist raw record JSON, session bytes, native pointers or descriptors in receipts, manifests, logs or reports. Error messages remain fixed and exclude private paths.

Serialize operations on each cursor/source. Closing waits for in-flight operations; cancellation must not close a descriptor while an operation could access its recycled number. Native operations use asynchronous work and bounded batches. A running filesystem syscall may not be forcibly interruptible: do not promise a hard cancellation deadline without evidence.

## Packaging and release boundary

After Gate A, the dependency-minimal proposal is an explicit build driver using the system C compiler and an explicitly supplied existing Node SDK. No new JavaScript runtime or build dependency is proposed; `node-gyp`/a prebuild packager are alternatives, not prerequisites. The driver must not download headers or compile during install/startup. Existing PNPM build-approval controls remain unchanged.

Put source/build configuration below an MCP native subdirectory. Keep packaged binaries outside `dist`, because `tsup --clean` removes that directory. An explicit loader selects package-owned artifacts only. Missing, corrupt or incompatible binaries fail closed with a fixed actionable linkage error; other MCP functionality must remain loadable. This failure is not acceptance of linkage on an advertised platform.

Approved native targets are Darwin arm64/x64 and GNU/Linux glibc arm64/x64: four artifacts. Node 20's [primary platform table](https://github.com/nodejs/node/blob/v20.x/BUILDING.md#platform-list) lists those as Tier 1; deployment baselines include macOS 11 arm64, macOS 10.15 x64 and glibc 2.28, without endorsing vendor-EOL operating systems. No musl support is approved. Windows/other platforms retain existing MCP functionality but receive an explicit unavailable-linkage outcome, not a false complete tree. Repository maintainers own native release maintenance.

Gate B authorizes package and CI configuration changes, not remote execution or release. Native release work must test the packed npm artifact with install scripts disabled, not just workspace loading.

## Staged acceptance

### Gate A — passed local feasibility proof

Synthetic data only, under a disposable repository artifact directory:

- Open a root/child chain using real `openat`; enumerate through `fdopendir`.
- Transfer a regular-file descriptor and read it with documented Node positional APIs.
- Replace ancestor paths and verify that the approved inode remains the source.
- Reject intermediate/leaf symlinks and nonregular files; exercise bounds and deterministic cleanup.
- Prove the narrow read-source interface works with existing `FileHandle` inputs.

No dependency addition, production wiring, CI edit, runtime download, real consent or private-data read belongs to this gate unless separately approved. Record exact compiler/header requirements and outputs; unavailable prerequisites are blockers, not permission to alter controls.

### Gate B — production implementation approved

The operator approved the interface/ingress, native core, four-target packaging and CI configuration scope. Execute bounded ownership packets under [the frozen implementation contract](retrospective-native-ingress-implementation.md). Add adversarial tests for swaps, in-place session-identity rewriting, duplicate matches, cycles, entry/depth caps, abort/close races and consent revocation. Independently review native memory/resource safety and the TypeScript integration.

### Gate C — acceptance

Verify installed-artifact loading, every advertised binary target, no-leak failure paths, producer-to-consumer replay and actual local report/index rendering. Refresh documentation and generated exports. Do not mark AC-003/004/006 accepted from source review or a single-platform proof alone. Model efficacy remains separately unverified.

## Primary references

- [Apple openat declarations](https://github.com/apple-oss-distributions/xnu/blob/main/bsd/sys/fcntl.h)
- [Apple fdopendir declarations](https://github.com/apple-oss-distributions/Libc/blob/main/include/dirent.h)
- [POSIX openat](https://pubs.opengroup.org/onlinepubs/9799919799/functions/openat.html)
- [POSIX fdopendir ownership](https://pubs.opengroup.org/onlinepubs/9799919799/functions/fdopendir.html)
- [Node-API version/ABI contract](https://nodejs.org/docs/latest-v20.x/api/n-api.html)
- [Node public descriptor APIs](https://nodejs.org/docs/latest-v20.x/api/fs.html)
- [Koffi platform support](https://koffi.dev/)
- [Node child-process API](https://nodejs.org/docs/latest-v20.x/api/child_process.html)
- [Prebuildify distribution model](https://github.com/prebuild/prebuildify)

Parent execution passed on Darwin arm64/Node 26, followed by independent source-review clearance. Node 20, other targets, static type assignability, production cancellation and package loading remain unverified.

## Gate A receipt

Observed checks and source digests: `artifacts/runs/retrospective-diagnostic-signals/native-proof/parent-verification.json`. The generated addon was removed after the proof. The historical first failure is retained in the author receipt. Gate A alone establishes neither production linkage acceptance nor cross-platform verification; Gate B was separately approved afterward.

## Approved Gate B implementation boundary

The operator approved this scope; implementation and verification remain pending.

1. **Native capability core:** promote the reviewed primitives into a dedicated package-owned C Node-API-8 module. Root/child opens and bounded enumeration execute asynchronously, not as blocking main-thread copies of the proof. Retain strong references during native work; reject operations on closing capabilities. Coordinate close with in-flight work and release every native-owned descriptor on failure.
2. **Cursor contract:** each cursor owns an independent open-file description and `DIR*`. A duplicate descriptor alone shares its offset; use a fixed internal capability-relative directory reopen where needed. Public child components still reject dot components. Serialize each cursor's operations and test two cursors independently.
3. **Borrowed source adapter:** introduce the narrow stat/positional-read/close capability, prove structural compatibility with existing `FileHandle` callers, and migrate the existing borrowed-source branch rather than inventing a `FileHandle` adoption constructor or another competing transport. The numeric-fd owner waits for pending reads before idempotent close. Preserve the aggregate `expectedSessionId` and digest guards.
4. **Ingress cutover:** migrate both record and host-session enumeration/read paths to the approved native capability implementation on advertised targets. Remove obsolete descriptor-path traversal after callers migrate; do not retain an unsafe fallback. Four-field projection, consent revalidation, graph/source counts and budgets remain in TypeScript.
5. **Lazy loading and distribution:** resolve only package-owned binaries by platform/architecture. Missing/incompatible binaries must not prevent unrelated MCP tools from loading. Update package assets and explicit build scripts; add native artifact/test jobs and a publish-time completeness check, without executing a remote workflow or publishing. Each release artifact needs source revision, build flags, checksum and provenance.
6. **Verification and docs:** synthetic adversarial/lifecycle tests, installed-tarball loading with install scripts disabled, existing retrospective consumers and actual report/index browser proof. Document the exact advertised platform boundary, unavailable outcomes and no-runtime-build policy.

The capability API is deliberately read-only: asynchronous root open, single-component child directory/file open, cursor creation, bounded next-batch and explicit close. No caller-selected native flags, arbitrary symbols, raw pointers or process-wide working-directory changes are exposed.

Implementation ownership must remain disjoint: native core/build assets; TypeScript adapters/ingress/aggregate type migration; packaging/docs. Freeze the exact capability and source interfaces before parallel consumers write. The active engine recovery owns aggregate/ledger files until its handoff, so integration cannot edit them concurrently.

Gate B approval covers this scope and the four targets. Remote CI execution, release, dependency additions and any target expansion remain separately gated. A local Darwin pass must not be presented as execution on Linux, Intel macOS or Node 20.

### Gate B approval clarifications

- **Compatibility:** Node-API stabilizes the Node ABI, not libc or OS compatibility. Proposed Darwin builds set architecture-specific deployment targets and inspect Mach-O minimum-version/import metadata. Proposed Linux builds use a pinned, maintained glibc-2.28-compatible sysroot/builder, not the latest host libc; inspect imported symbol versions. Exact compiler/SDK/image identities and checksums must be resolved before build jobs are finalized. Test each advertised target; do not infer compatibility from a filename.
- **Completion ownership:** native work owns newly opened resources until successful JavaScript delivery. Cancellation, rejected delivery or N-API completion failure closes native-owned results. Worker execution performs no ordinary JavaScript/N-API value manipulation; completion performs transfer. Closing rejects new work, drains queued/running operations and closes once. Cancellation must not free live work or recycle a descriptor still in use.
- **Unavailable states:** distinguish unsupported target/runtime, missing advertised artifact and load/ABI failure with fixed errors. A missing advertised artifact is a broken installation, not an empty record scan. Linux selection must identify compatible glibc rather than loading a glibc binary on musl. No such state can produce complete-tree wording; unrelated MCP functions remain loadable.
- **Maintenance:** repository maintainers own long-term native artifact/release maintenance, explicitly accepted with Gate B approval. Bounded agent work does not establish ongoing release ownership.
- **Authority:** approval covers the four targets, production C, source-interface/ingress migration, package assets and CI configuration. It excludes remote CI execution, publication, dependency additions and automatic downloads/builds. Gate C execution/advertising remains separate.
