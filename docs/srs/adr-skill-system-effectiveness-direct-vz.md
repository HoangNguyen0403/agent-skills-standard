# ADR: Direct Apple VZ confinement backend

Status: accepted for design/source amendment by requesting maintainer through explicit selection **Minimal direct Apple VZ runner**. Source/API and live qualification acceptance remain pending. Supersedes only the proposed stock Lima/VZ backend in SRS revision 3; canonical contract is [SRS revision 4](srs-skill-system-effectiveness.md). Requirement trace: SRS-002 runtime containment and SRS-006 truthful qualification boundary.

## Problem and evidence

Independent confinement analysis found no established stock Lima configuration meeting the approved disabled-network/SSH/control and read-only offline collection boundary. [Lima v2.2.1 VZ source](https://github.com/lima-vm/lima/blob/v2.2.1/pkg/driver/vz/vm_darwin.go) attaches default networking and vsock; empty `networks` is not no NIC. [User networking documentation](https://lima-vm.io/docs/config/network/user/) states host-loopback restrictions do not disable external outbound access or shell connectivity. An arbitrary command returning an expected isolation string does not establish effective confinement. An already-open SSH-vsock channel remains a live control channel even if never reopened.

## Decision

Use a minimal direct Apple Virtualization.framework runner. Explicit empty [network devices](https://developer.apple.com/documentation/virtualization/vzvirtualmachineconfiguration/networkdevices), [socket devices](https://developer.apple.com/documentation/virtualization/vzvirtualmachineconfiguration/socketdevices) and directory sharing. No SSH/control/credential path to exposed guests. Pre-stage frozen schedules, controller, drivers and stubs; run autonomously inside the fresh disposable guest. Host retains lifecycle/resource authority, not interactive guest commands.

Host force-stops the guest and retains original raw disk. A fresh equally offline collector receives a host-created copy using [read-only raw disk attachment](https://developer.apple.com/documentation/virtualization/vzdiskimagestoragedeviceattachment). Guest filesystem parsing occurs only inside that collector. Use output-only serial transport with enforced aggregate byte/frame/queue and deadline limits; a serial log file alone is not a hard bound. Schema-valid output remains untrusted, and suspected guest compromise invalidates guest-origin oracle integrity.

Deliver concrete Swift runner, guest controller/collector applications and packaging inputs as D2 source, not assumed missing executables. D3 fault/oracle requirements remain unchanged. D4 integrates accepted APIs and must not implement missing runtime behavior.

## Alternatives

- Pinned offline Lima/VZ extension: feasible source direction but requires maintaining removal of networking/vsock/SSH readiness plus bounded output and read-only evidence attachment. Not selected.
- Stock Lima plus generic firewall attestation/persistent SSH: not established as satisfying the approved boundary. Rejected; no safety downgrade.

## Authority and verification

This approval authorizes source/design amendment only. No installation, entitlement signing, image acquisition/provisioning, host-policy mutation, VM activation, candidate/model execution, release or commit. Those remain separately gated. Bounded device/lifecycle/interface design delta needs independent review; source smoke/type checks are not live containment proof. D5 must demonstrate no NIC/vsock/shared-link escape, bounded output/resources, host stop, read-only collection/custody and failure cleanup on the accepted signed runner/image versions before live readiness.

Evidence provenance: Personal Analysis review notificatione0f9fc91-5210-4da1-9caf-4d17c2b31b40; user chose recommended direct-VZ option; follow-up reviewer acknowledgement356ca4ef-432e-4c35-a8ad-fead8a176fc2. No premium consultation used.
