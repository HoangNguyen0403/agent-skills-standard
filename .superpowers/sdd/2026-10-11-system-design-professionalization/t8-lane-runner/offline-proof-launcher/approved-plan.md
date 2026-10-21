## Recommendation

**Use vfkit 0.6.4 with a dedicated Debian 13 arm64 guest.** Install it privately—not through Homebrew, Docker or an existing VM manager—and expose no host directories or credentials to the guest.

This is a **prepared plan**, not an installation or runtime-verification claim. The next approval can cover implementation, acquisition, guest preparation and the bounded harmless-fixture campaign together. **It must exclude the operator run.**

Linux offline-proof semantics are already approved. Nothing here establishes Darwin runtime behavior.

## 1. Fixed software sources and identities

| Component | Selected identity | Acquisition/verification |
|---|---|---|
| VM substrate | **vfkit v0.6.4**, release asset `vfkit`, asset ID `469356258` | Official GitHub release asset; compare the externally recorded SHA-256 below before execution |
| Guest base | **Debian 13 generic arm64, build `20261017-2634`** | Official versioned image directory; verify compressed archive and extracted raw image against its `SHA512SUMS` |
| Guest kernel | `linux-image-6.12.113+deb13-arm64`, package `6.12.113-1` | Already listed in that image’s package inventory |
| Guest Python | `3.13.5-2+deb13u5` | Already included; use `/usr/bin/python3.13 -I -S -B` |
| Guest syscall library | `libseccomp2 2.6.0-2` | Already included |
| Supporting guest tools | e2fsprogs `1.47.2-3+b12`, cloud-init `25.1.4-1+deb13u1`, systemd `257.13-1~deb13u1` | Already included |

Sources: [vfkit release metadata](https://api.github.com/repos/crc-org/vfkit/releases/tags/v0.6.4), [Debian versioned directory](https://cloud.debian.org/images/cloud/trixie/20261017-2634/), [exact guest package inventory](https://cloud.debian.org/images/cloud/trixie/20261017-2634/debian-13-generic-arm64-20261017-2634.json).

**Exact download sources:**

- `https://github.com/crc-org/vfkit/releases/download/v0.6.4/vfkit`
- `https://cloud.debian.org/images/cloud/trixie/20261017-2634/debian-13-generic-arm64-20261017-2634.tar.xz`
- Corresponding metadata and [SHA512SUMS](https://cloud.debian.org/images/cloud/trixie/20261017-2634/SHA512SUMS).

Published expected hashes:

```text
vfkit — SHA-256
0ed83fc8ca7aa708598835480dba1362406aa7cd1dab3b27464eb76327d9652d

Debian archive — SHA-512
c133560624623d8b691945866790f718e210b33a8fb7902b4d5f019b3bfd25e5a5e7ba55bb4277b2be69106a06d839baac97fc586a2161b2896417b0c85d6709

Extracted Debian raw image — SHA-512
cef8d43df3b850235cdd477e248ab6af14cc706fd0869d7b9defd82ce82f70839c031459be884ef2d3647f8bcc4df142e083b6291f334c887e6efaee6c1f15d1
```

Verification must also check vfkit’s code-signature integrity and virtualization entitlement. **Do not re-sign an unsigned binary or disable Gatekeeper to make activation work.**

These are official HTTPS-published checksums, not invented detached signatures. Debian explicitly documents that its current cloud images use TLS/checksum verification rather than the signatures provided for its legacy images. Preserve that distinction in the acquisition receipt. [Debian verification guidance](https://cdimage.debian.org/images/cloud/)

## 2. Proposed host changes and resource allocation

**External storage location, proposed only:**

```text
/Users/Shared/ass-qf5-linux-v1/
  bin/
  cache/
  build/
  images/
  runs/<approved-run-id>/
```

Nothing there has been inspected or created.

- Create the top-level directory exclusively, owned by the invoking user, mode `0700`; refuse existing or symlinked paths.
- Install vfkit only under `bin/`; no global PATH changes, daemon registration or launch agents.
- Use the existing named host Python framework for the new controller only after recording its public runtime identity and hashes during the approved setup.
- **No host sudo is expected:** use disk-image files, never host block devices. Guest root privileges are required for guest mounts, namespace setup and cgroups.
- No host firewall, TCC, SIP, Gatekeeper or account configuration changes. A platform denial stops activation rather than triggering a bypass.
- Proposed VM allocation: **2 vCPUs, 4096 MiB RAM**.
- Proposed prepared runtime image: **8 GiB maximum**, sealed read-only afterward.
- Each proof/fixture gets one fresh **4 GiB writable image**.

**Planning estimates, not measurements of this host or suite:**

- Downloads: approximately **350–500 MiB**, including the published 66.4 MB vfkit asset and roughly 287 MB Debian archive.
- Sparse-image physical storage: approximately **15–25 GiB** for preparation and retained tests, but not guaranteed.
- Allow **up to 64 GiB campaign storage** for conservative retention of all bounded images and logs. Check capacity before allocation; never delete previous evidence to recover space.
- No cloud resources or paid model services are planned. Local bandwidth, storage and execution costs remain environment-dependent.

## 3. Provisioning sequence

### A. Acquire and verify

After explicit approval:

1. Create the private storage tree and acquisition receipt.
2. Fetch only the named official assets and metadata over HTTPS, without account tokens, existing credential files or inherited proxy credentials.
3. Verify vfkit’s fixed hash before execution.
4. Inspect the archive before extraction; reject escaping paths, links or unexpected payloads. Verify the extracted raw image’s fixed hash.
5. Preserve upstream metadata, seed inputs and acquisition/build logs. No `latest` URLs or automatic upgrades.

### B. Prepare one guest—without guest networking

Use vfkit’s documented EFI boot and local NoCloud seed support. NoCloud can configure a guest from local files without network access. **Do not reuse the upstream SSH-key example:** generate our own seed with no SSH keys or passwords, no package update/upgrade and no remote metadata source. [vfkit usage](https://github.com/crc-org/vfkit/blob/v0.6.4/doc/usage.md), [NoCloud documentation](https://docs.cloud-init.io/en/latest/reference/datasources/nocloud.html)

The preparation guest:

- Has **no NIC**, host-directory share, vsock share or forwarded agent/socket.
- Installs only our new controller files and staged project data from the local seed.
- Uses the already included Python, libseccomp and filesystem tools; no guest package downloads are planned.
- Verifies kernel support for cgroup v2/PID limits, seccomp filtering, namespaces, ext4 and the required virtual/USB storage drivers.
- Prepares the initrd for the final read-only-root configuration.
- Exports the matching uncompressed arm64 kernel, initrd, root filesystem UUID and build manifest through a bounded serial protocol.
- Shuts down cleanly before the host hashes and seals the resulting runtime/input image.

No kernel compilation or `linux-next` build is planned. If the selected packaged kernel cannot support the required boot/device configuration, stop and report that exact failure—do not silently substitute a writable root or another kernel.

### C. Final offline topology

The proof VM uses:

- Direct Linux kernel/initrd boot, avoiding a writable EFI variable store.
- The sealed runtime/input image attached as **`usb-mass-storage,...,readonly`**.
- One fresh fixed-capacity writable image attached as `virtio-blk`.
- Serial stdio and RNG devices.
- **No** virtio-net, virtio-fs, vsock, Rosetta or GPU devices.

Do not invent `virtio-blk,...,readonly`: that option is not documented for this pinned version. Read-only USB storage is documented. vfkit also documents that the VM terminates when its owning vfkit process exits. [Pinned device/lifetime contract](https://github.com/crc-org/vfkit/blob/v0.6.4/doc/usage.md)

For lifecycle control, use one **new host-private Unix socket** under the fresh run directory. It is not shared with the guest and exposes no TCP listener. The documented endpoints are `GET /vm/state`, `GET /vm/inspect` and `POST /vm/state`; the pinned implementation accepts `unix:///absolute/path`. Keep its path within the documented macOS socket-length limit. No existing daemon endpoint is involved. [Pinned implementation](https://github.com/crc-org/vfkit/blob/v0.6.4/pkg/rest/rest.go)

## 4. Enforcement inside the guest

**vfkit supplies the VM boundary; it does not supply the complete sandbox.**

| Requirement | Planned enforcement |
|---|---|
| Read-only inputs/runtime | Read-only virtual storage plus a minimal mount namespace containing only the declared runtime and input closure |
| No host secrets | No home, checkout-directory, credential or socket shares; inputs are copied data, not live mounts |
| Fresh writable paths | Output, scratch, synthetic HOME/CODEX_HOME and reserved external mapping all reside on the same 4 GiB filesystem |
| Aggregate storage bound | One fixed-capacity writable block device; no writable root overlay, extra COW layer, separate writable `/dev/shm` or unaccounted proof scratch |
| Main + two threads | Non-threaded cgroup-v2 domain with `pids.max=3`; trusted guest controller stays outside it and does not delegate cgroup control |
| No later process/exec | Trusted Python bootstrap starts first, then installs irreversible seccomp restrictions **before loading target code** |
| No network/signals | No guest NIC, plus syscall denial for socket creation and unapproved signal-generation paths |
| Whole-domain deadline | External host watchdog armed before vfkit launch, with guest cgroup termination and host VM hard-stop/owned-process termination |
| Raw output bounds | Separate proof stdout/stderr capture, **16 MiB each**; bounded serial transport to host records |

Linux documents that the PID controller counts TIDs, and that `cgroup.kill` kills the complete descendant cgroup tree. Organizational migration can exceed a PID limit, so the proof must not receive writable controller interfaces. [Kernel cgroup contract](https://github.com/torvalds/linux/blob/v6.12/Documentation/admin-guide/cgroup-v2.rst)

The bootstrap must:

- Run non-root, with capabilities dropped and `no_new_privs`.
- Check the AArch64 syscall architecture.
- Deny subsequent `execve`/`execveat`, process creation, tracing, namespace changes and bypass interfaces.
- Permit only the required thread-form `clone` flags.
- Reject `clone3` with `ENOSYS` rather than pretending BPF can inspect its pointed-to argument structure; verify the pinned libc’s thread fallback using harmless fixtures.
- Load the pinned libseccomp library directly, not through a subprocess-based library search.
- Abort on any policy-installation error.

Seccomp explicitly is **not a complete sandbox by itself** and cannot dereference syscall pointers. Filesystem isolation, privilege removal, cgroups and the VM boundary are required alongside it. [Kernel seccomp contract](https://github.com/torvalds/linux/blob/v6.12/Documentation/userspace-api/seccomp_filter.rst), [libseccomp loading API](https://github.com/seccomp/libseccomp/blob/v2.6.0/doc/man/man3/seccomp_load.3)

### Deadline and evidence semantics

- **300 seconds from VM launch**, including startup—not a fresh budget beginning at guest READY.
- Carry remaining duration into the guest without mixing absolute clock domains.
- At expiry, terminate the domain; kill only the controller-owned positive vfkit PID if needed, never PID/group zero.
- Record actual kill/reap times. Late or unconfirmed termination is failure, not PASS; this is not a hard-real-time scheduling claim.
- Preserve raw streams before `rtk` display compression.
- On overflow, preserve the bounded prefix, mark truncation and terminate.
- Reserve **64 MiB separately for trusted control/transport records**; distinguish them from the two raw proof streams.
- Preserve the complete bounded writable image and partial records after failure. Do not fabricate final result JSON.
- Never replay a journal into original evidence during inspection: ext4 can write during an ordinary read-only mount. Use replay-free inspection or an explicitly identified derived copy. [Kernel ext4 warning](https://www.kernel.org/doc/Documentation/filesystems/ext4.txt)

## 5. Source closure and implementation ownership

The staged closure must enumerate files—not mount the checkout:

- O, R, accepted review and assembler/adapter sources;
- contract, candidate and renewal artifacts;
- the two binding files, packet inventory and blind-arm map;
- exactly **114 package + 349 native packet paths** from the verified bindings;
- frozen grader index/protocol/files and the native manifest;
- the required interpreter/stdlib/native-library closure.

No real trust directory or Codex executable is included. Current O has only `smoke --output-dir`; the external mapping remains **reserved/not exercised** unless a later separately approved interface change uses it.

Proposed new files under `E/t8-lane-runner/offline-proof-launcher/`:

| Slice | Owned files / responsibility |
|---|---|
| **Host implementation owner** | `backend.lock.json`, `manifest.schema.json`, `prepare-manifest.py`, `provision.py`, `launch.py`, `protocol.py` |
| **Guest implementation owner** | `guest-supervisor.py`, `bootstrap.py`, `policy.json`, `harmless-fixture.py` |
| **Independent reviewer** | Reviews both slices and integrated pins/contracts; no implementation ownership |
| **Integration/controller owner** | Sole writer to external backend storage and sole owner of VM lifecycle actions |

Freeze the manifest and framing interfaces before parallel implementation. Frames carry run ID, sequence, channel, length and payload digest; target stdout/stderr are payloads, never control messages. The proof receives no serial-control descriptor.

O/R stay unchanged:

```text
O  2aa558bc5750b362a54a960c92ff23311153c6428c372203c2e5a0f37f8f16d1
R  28b92f8abb02feebb4adc07d7594ee9a25e146cc3ef13a7d9f5940ec318b982d
```

## 6. Bounded harmless verification campaign

Proposed approval envelope: **one preparation VM, at most eight harmless-fixture VM starts, and at most two read-only evidence-inspection starts**. Each named attempt runs once; no automatic retry.

| Case | Required actual evidence |
|---|---|
| Preflight, no VM required | Bad pins, existing/symlinked roots and malformed manifests refuse before activation |
| H1: positive + isolation | Allowed reads/writes succeed; denied sentinel access, socket creation, exec/process creation and signals hit intended controls; two threads work and excess tasks hit the kernel limit |
| H2: aggregate storage | Writes distributed across output/scratch/external mapping exhaust the single bounded filesystem |
| H3/H4: stdout/stderr overflow | Correct raw prefix, truncation, termination and retained failure records |
| H5: deadline | A harmless hang is terminated by the external watchdog; a shorter explicitly test-only deadline may exercise the same mechanism |
| H6: host interruption | VM termination leaves truthful partial logs/image; no success receipt |
| H7: guest/transport failure | Corrupt or missing control evidence fails closed without losing retained bytes |
| H8: claim race/replay | At most one activation; subsequent claim refused without deleting or adopting prior state |

Use pinned harmless executables for exec-denial tests so “file missing” cannot impersonate policy enforcement. Signal tests use only authorized disposable fixtures. Compare actual cgroup/device/parent observations, not authored counters.

Preparation may have a proposed **900-second** cap; all proof/fixture and inspection VMs retain the **300-second maximum**. These are proposed bounds, not measured fit estimates.

## 7. Approval boundary and remaining checks

**Current authority remains preparation only. Nothing has been installed, downloaded as software, activated, written or delegated.**

A subsequent explicit approval can authorize this complete **implementation/provisioning/harmless-verification bundle**, conditional on independent static review before fixture execution. That avoids requesting a new discovery approval at every normal setup step.

It would authorize only:

- The named assets, new repository files and private external storage.
- Their verification and dedicated guest preparation.
- Guest-local privileged setup.
- Calls to the newly created private vfkit control socket.
- The bounded harmless campaign and evidence inspection.

It would **not** authorize O execution. The later operator proof requires its own exact source/runtime/policy/manifest pins and one-invocation human approval.

The remaining checks are concrete acceptance work: native Virtualization.framework activation, packaged-kernel/USB boot compatibility, filter/thread behavior, quota behavior, deadline termination and evidence transport. If any fail, stop with retained evidence—no writable-root, unrestricted-policy, networking or alternate-backend fallback.

**Plan preparation complete; compliance audit reported no routing coverage gaps. Production QF5/RC3 remain HOLD, QF5b is unstarted, and T8/T9 remain incomplete.**

---

## User approval interpretation — appended after approval

The user explicitly approved the complete vfkit 0.6.4 / Debian 13 arm64 implementation, acquisition, preparation and bounded harmless-verification plan above. This addendum supersedes only the plan's historical preparation-only/pending-approval statements. The recommendation and all seven sections above are retained verbatim; their hashes, official sources, controls, limits and operator exclusion are unchanged.

The approved scope and gates are:

1. Implementation of the specified new launcher components, acquisition and verification of the named software assets, and activation of the dedicated preparation guest are allowed under the approved plan and its ownership boundaries.
2. Independent STATIC review of the launcher is REQUIRED BEFORE any harmless-fixture execution. A delivery claim or historical PASS does not satisfy that gate.
3. At most **1 preparation VM**, with a **900-second maximum**, is authorized.
4. At most **8 harmless-fixture VM starts**, each with a **300-second maximum**, are authorized.
5. At most **2 read-only evidence-inspection VM starts**, each with a **300-second maximum**, are authorized.
6. Each named attempt may run **ONCE**. There is **NO RETRY**, including no automatic retry. Failure requires retained truthful evidence and a stop; this approval does not authorize another attempt by renaming it.
7. **No operator, vendor, model or qualification execution is authorized.** Any later operator proof requires separate pin-specific human approval and is excluded from this bundle.
8. O and R remain untouched at the exact hashes recorded in section 5. Production QF5/RC3 remain HOLD, QF5b is unstarted, and T8/T9 remain incomplete.
9. This document-persistence assignment authorizes only creating this approved-plan artifact, appending this interpretation, hashing it and reporting the result. It authorizes no implementation, acquisition, provisioning, activation or runtime operation by the independent reviewer in this assignment. No delegation is authorized; the reviewer remains independent and is not an implementation owner.

This records the user's approval in this conversation. It is not an operator-start authorization, a generation/trust issuance, or a qualification receipt.
