# Retrospective native ingress

This directory contains the read-only Node-API 8 capability module and an explicit local builder. The module is loaded only when `loadNativeIngress()` is called. Importing MCP code does not load a native binary. There is no install-time build, download, runtime fallback, or dependency addition.

## API

The addon exposes `apiVersion: 1` and Promise-returning methods:

- `openRoot(absoluteRoot)` opens a canonical absolute root by walking from `/` one component at a time with `openat` and `O_NOFOLLOW`.
- `openChildDirectory(directory, component)` opens exactly one validated child component.
- `openRegularFile(directory, component)` opens one child read-only, nonblocking, no-follow, and returns its numeric descriptor only after `fstat` confirms a regular file. The recipient owns and must close this descriptor.
- `openDirectoryStream(directory)` creates a new open-file description and transfers it to an owned `DIR*`; it does not `dup` the parent descriptor.
- `readDirectoryBatch(cursor, maxEntries)` serializes reads on that cursor, accepts integral limits from 1 through 64, and reports every consumed entry in `visited`.
- `closeDirectory(directory)` and `closeCursor(cursor)` are idempotent Promises. They reject new work, wait for accepted work to complete, then close once. Finalizers are leak protection only.

Capabilities are opaque Node objects tagged with Node-API 8 type tags. Worker execute callbacks perform POSIX work only. Promise settlement, capability transfer, and active-operation draining happen on the Node event loop. A close request does not occupy a worker waiting for work queued on the same pool.

Names and errors never include private paths or raw `errno` text. Fixed operation codes distinguish `NATIVE_NOT_FOUND`, `NATIVE_NOT_DIRECTORY`, access denial, symlink rejection, nonregular files, invalid components/capabilities, and generic filesystem errors. `NATIVE_NOT_FOUND` is the only absence signal. `NATIVE_NOT_DIRECTORY` is not an absence signal: with `O_NOFOLLOW | O_DIRECTORY`, a symlink may produce `ENOTDIR` on Darwin, so callers must preserve an unknown/gap rather than infer absence.

## Supported artifacts

The package selects only these native target names:

- `darwin-arm64`, minimum macOS 11.0
- `darwin-x64`, minimum macOS 10.15
- `linux-arm64-gnu`, glibc 2.28 and Linux kernel 4.18 runtime floors
- `linux-x64-gnu`, glibc 2.28 and Linux kernel 4.18 runtime floors

Linux loader and builder checks use the documented numeric `os.release()` major/minor floor. The kernel value in a manifest records the supported runtime contract; it is not extracted from or proven by the ELF file. Linux builds also require identifiable glibc >=2.28 and reject imported GLIBC symbols above 2.28 or `GLIBC_PRIVATE`. The builder must run natively for the selected target; it does not cross-compile or identify a container image. CI owns use of the approved pinned manylinux builders.

Unsupported targets, old or unparseable Linux kernel releases, musl, missing artifacts, malformed manifests, checksum mismatches, and load/ABI errors fail closed with fixed loader results. They never become a successful empty scan.

## Building an artifact

Pass an explicit existing Node SDK include directory. The builder checks for `node_api.h`, `js_native_api.h`, and `js_native_api_types.h`; it does not infer a directory from a compile-time `process.config` value or compare the header version to the active runtime. The caller/CI must verify the selected Node executable, version, and headers match before building.

From the repository root, substitute the real existing header directory:

```sh
NODE_INCLUDE=/absolute/path/to/existing/node/include/node
rtk node mcp/native/secure-ingress/build.mjs \\
  --target darwin-arm64 \\
  --node-include "$NODE_INCLUDE"
```

The build host must match the target architecture. Darwin uses `xcrun` clang and checks the built Mach-O CPU and `minos` deployment value. Linux uses `cc` plus `readelf` checks for ELF architecture and imported GLIBC versions. The subprocess environment is restricted to `PATH`, `LANG`, and `LC_ALL`; compiler/SDK overrides such as `CC`, `CFLAGS`, `SDKROOT`, and `DEVELOPER_DIR` are not passed through. Missing headers/toolchain utilities or a host below the declared floor are errors; do not install or download them as a fallback.

The driver writes `prebuilds/<target>/secure_ingress.node` and a schema-v1 manifest containing API/N-API versions, source and binary SHA-256, sanitized compiler/SDK labels, compatibility metadata, and path-free build flags. The runtime loader validates the selected package-owned binary and manifest before `require` loads the addon. Run the asset verifier after building the complete release target matrix:

```sh
pnpm --filter agent-skills-standard-mcp verify:native-assets
```

A successful local build proves only that target on that host. It does not establish Node 20 behavior, other architectures, kernel 4.18 runtime execution, packed-tarball loading, asynchronous cancellation, or release readiness.

## CI retry boundary

Native artifact assembly and publication support full-workflow retries only. In GitHub Actions, use **Re-run all jobs**. Re-running failed jobs or only publication/matrix jobs is unsupported and must fail closed: every attempt needs its complete four-target artifact set for the exact source SHA and run attempt. Consumers use current-run artifacts only; do not fall back to latest, another run, or a pull-request artifact. No automatic retry is supported.
