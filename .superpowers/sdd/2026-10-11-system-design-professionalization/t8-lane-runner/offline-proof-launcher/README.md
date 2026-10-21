# Offline proof launcher

This launcher stages a bounded offline proof lifecycle; it does not authorize operator, vendor, model, qualification, or production execution.

## Host commands

Policy display does not start a VM:

```sh
python3 -I -S -B launch.py show-policy
```

The VM-start subcommand is `launch.py start`. It requires all of the following options:

- `--kind` (exactly one of `preparation`, `fixture`, or `inspection`)
- `--case-id CASE_ID`
- `--run-id RUN_ID`
- `--manifest MANIFEST_PATH`
- `--controller-release RELEASE_PATH`
- `--release-sha256 RELEASE_SHA256`
- `--confirm CONFIRMATION`
- `--source-run-id SOURCE_RUN_ID` only for inspection runs

These arguments describe the CLI contract; this README intentionally provides no runnable `start` invocation or fabricated IDs, paths, digests, or confirmation values. A start requires a separately approved controller release and independently verified source-map, runtime-view, and lineage pins. Those approvals are not present in this source change. Do not start a VM from this candidate.

## Exit status

`launch.py start` returns zero only for the phase-specific captured result retained after lifecycle evidence is written. A missing, failed, unexpected, or wrong-phase result returns nonzero; this status does not replace or erase the retained evidence.

## Fixture runtime input

The read-only composite's first partition contains only the GPT-validated prepared root partition extent, not the whole prepared disk. The launcher binds its source offset, length, and digest to the retained preparation export; the guest checks the composite partition length, read-only state, and root-extent digest before consuming the separately framed target-view partition.

## Existing caps

- Preparation: one lifecycle, at most 900 seconds.
- Fixtures: at most eight 300-second starts; no retry.
- Inspection: at most two 300-second starts; no retry.
- The external host watchdog is the sole hard whole-VM deadline and includes startup. Host isolation, termination, and independent stop-event recording remain required.

The guest performs cooperative cleanup against its operation deadline. The serial writer owns one nonblocking serial FD and shares a monotonic deadline across data, EOF, control, and terminal frames. It polls writable state with bounded progress. A complete writer outcome means the complete frame was accepted by the guest FD, not that the host received it. The host scanner's observed complete frames are authoritative.

A partial frame poisons the writer; no later frame is appended. A terminal send is skipped after deadline expiry. Host-observed valid frame prefixes remain retained, while a truncated/corrupt stream or missing terminal record remains incomplete/fail-closed. The host watchdog journal does not depend on guest terminal output.

Regular-file writes, `fsync`, and preparation `os.sync` are synchronous and are not claimed guest-deadline-bounded. If the host watchdog kills the VM before durable synchronization or terminal delivery, affected artifacts/records are `UNKNOWN`/`INCOMPLETE`; they never establish PASS.

## Release state

This is a candidate launcher correction and contract amendment, not an activation or release. Independent amendment and source review, external approved source-map/runtime/lineage/controller-release pins, and host-controlled release gates remain required. Production QF5 RC3 remains `HOLD`; T8/T9 remain incomplete; QF5b remains unstarted. No VM start is authorized by this README.
