# Deadline contract amendment

## Approval and scope

The user approved the exact recommended clarification by responding, “please do the next that you need to make the PR ready,” and then expressly bounded that approval to this clarification and implementation. This amendment is limited to the guest-local completion/deadline contract identified in §4 of `static-review-fix5.md` (SHA-256 `84fe33871fd62c903d6368b195f4086ada7d5cfdf65d9632996eac313118caff`). It supersedes only the claim that guest-local cleanup and all terminal delivery are hard-bounded by the guest deadline. It does not waive the host watchdog, alter the campaign caps, or authorize activation, acquisition, VM/operator execution, or any external authority pin.

The approved plan and `backend.lock.json` remain immutable. Any amended manifest/source-map/lineage/controller-release references are proposals for separate external review and approval, not candidate self-authority.

## Deadline and failure contract

- The external host watchdog is the sole hard whole-VM deadline. The existing host lifecycle limits remain unchanged: preparation is capped at 900 seconds; fixture campaigns allow at most eight starts of 300 seconds each; inspection allows at most two starts of 300 seconds each; retry remains prohibited. Host timing includes VM startup and existing isolation and termination controls remain in force.
- Guest cleanup is cooperative. It uses the existing operation budget as an absolute monotonic cutoff and does not reset or extend that cutoff. Guest code avoids beginning a serial send after its caller deadline. The guest deadline is not a substitute for the host watchdog.
- The guest serial FD is opened nonblocking and owned by one `SerialWriter`. `send(..., deadline=...)` uses remaining-budget writable polling and bounded write/poll steps. Its `SerialSendOutcome` distinguishes complete, partial, and unknown local transport outcomes and records accepted frame bytes. `complete` means only that the entire frame was accepted by the guest serial FD; it is not receiver acknowledgement. The host `SerialFrameScanner` is the authority for which complete frames it observed.
- A frame with a written prefix but no complete frame poisons the writer. It is never followed by another frame. Sequence advances only for a complete local frame. Host-observed complete prefixes remain retained if a later frame is partial; the host scanner reports an incomplete/corrupt stream and the host result remains fail-closed.
- A caller whose deadline has expired does not initiate the terminal serial transport. A missing or partial terminal record is `UNKNOWN`/`INCOMPLETE` from the receiver’s perspective and can never establish PASS. Sender-local `terminal_delivery` data is not a substitute for a host-observed terminal record.
- Regular-file `write`, `fsync`, and preparation `os.sync` remain synchronous calls and are not claimed bounded or preemptible by the guest deadline. If the host watchdog kills the VM before an artifact is durably synchronized, that artifact is `UNKNOWN`/`INCOMPLETE`, not complete. A guest-local clock check before a blocking syscall does not change this property.
- Host watchdog termination evidence and the host result journal remain independent of guest terminal output. Host kill, missing terminal frame, stream transport error, incomplete artifact, or unknown VM termination remain failures; no guest record may override them. No post-deadline grace, retry, or alternative success path is introduced.

## Proposed implementation interface

The source change uses one owned `SerialWriter` boundary shared by stream-prefix, EOF, control, preparation, inspection, and terminal frames:

```python
send(run_id, channel, payload, *, deadline) -> SerialSendOutcome
send_json(writer, run_id, channel, value, *, deadline) -> SerialSendOutcome
```

`SerialSendOutcome` exposes `status`, `started`, `sequence`, `frame_bytes`, `bytes_written`, and `receiver_observed="unknown"`. Fixture and rejection callers retain per-channel complete-frame payload counts and frame-byte counts; preparation and inspection stop on non-complete sends. Terminal send callers explicitly skip transport after expiry or writer poisoning. The wire framing format is unchanged.

This interface is a candidate source contract only. Independent amendment and source reviews, external map/runtime/lineage/controller release approvals, and host-controlled release gates remain mandatory before any VM start. No runtime or release authority is created by this amendment.
