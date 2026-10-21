# Draft pull request

## Title

Bound offline proof launcher serial delivery by cooperative deadline

## Summary

A deadline-expired guest could otherwise begin terminal serial transport after the caller budget, and blocking writes could be mistaken for a guest-enforced hard deadline. This change uses one owned nonblocking serial writer and explicit local outcomes across stream prefixes, EOF, control, and terminal records. It documents the user-approved contract: the external host watchdog is the sole hard whole-VM deadline; guest cleanup is cooperative; interrupted durability or terminal delivery remains `UNKNOWN`/`INCOMPLETE`, never PASS.

## Changes

- Route production serial sends through one `SerialWriter` with the same absolute operation deadline, remaining-budget writable polling, bounded chunk/progress steps, and partial-frame poisoning.
- Migrate fixture, pre-gate rejection, preparation, and inspection send callers. Expired terminal callers do not initiate transport. A sender-local complete frame is not a receiver acknowledgement.
- Preserve the existing host watchdog, host-observed frame authority, isolation, termination journal, caps, and no-retry behavior. The deadline-amendment correction changed the guest serial sender (`guest-supervisor.py`); the final F1–F4 correction additionally changed root-partition lineage/consumer checks, capacity reservation, H2 storage dispatch, CLI result handling, and their tests in `launch.py`, `guest-supervisor.py`, and `harmless-fixture.py`. No host result, lock, or policy was changed.
- Add focused host-offline synthetic serial and caller tests. Retain the approved plan unchanged; add the bounded deadline-contract amendment and usage/limits documentation.

## Evidence and review

- The exact 24-path package's source/test bytes passed the isolated host-offline synthetic suite: Python 3.13.0, `python3 -I -S -B -m unittest discover -s .superpowers/sdd/2026-10-11-system-design-professionalization/t8-lane-runner/offline-proof-launcher -p test_*.py`, exit 0, 48 tests in 0.396s. The two report-only documents were subsequently edited and their final bytes are not claimed as tested input. Exact command/stdout/stderr and all source/test pins are in `pr-readiness.md`.

The amendment-only review `deadline-amendment-review.md`, SHA-256 `fd0c75ae2762d04869ff13e34fd8bd571d5e156cf76d198824771c5b0be54c1a`, covers the deadline amendment only; it is not approval of the F1–F4 source changes.

Independent final scoped review: `final-pr-review-fix1.md`, SHA-256 `c6b84157a8219168eddfdee618ba54c6ac4631539c2718c7bc597a30d822e7f3`, reports F1–F4 `SpecCompliance: PASS` and scoped technical static `TaskQuality: PASS` at the 24 indexed file pins. Controller adjudication remains required for the disclosed delegation process violation and to bind the final scan receipt to a raw diff serialization. Runtime/activation remains `HOLD`.

### Full reviewed source and test hashes

| File | SHA-256 |
|---|---|
| `guest-supervisor.py` | `3a169eaecbd8cd15b96e0f416f84609d82ef65d22d77d78ab4ad7e51700f3c6d` |
| `launch.py` | `d7436e9369947910a30bdf6b77539fca58af52a90b059e9b83c9094c5a64f694` |
| `protocol.py` | `fed5cc04b546972325215f88a3b4bb7f8276e41524aec7e35a11e0ef45927bb9` |
| `bootstrap.py` | `9d5e0accb444a8336d9759ee7ee24add146e4cf2e904941758959e9a976fe0c1` |
| `harmless-fixture.py` | `bd9f80bc963cfb9b783f4f205fd55004e21d6dadabbe138caaade4901f555e62` |
| `prepare-manifest.py` | `906d3f09947b2392013176fcbe24d223c79cd4832005bdf5009cb3640f5480cb` |
| `provision.py` | `e3df6b370254b4248e1c03e87ef098dd9a9ad1af91c8d3431ac76662809ca5df` |
| `debian_contract.py` | `2d4cfad1c069b2af4d09cbe39d5e432b83ff046d9c74cd824dc0b91f9c2e8e8c` |
| `manifest.schema.json` | `dcdce61796d2047f32cd2f707b91a40588ad35e90e01332b9ac8df1184062910` |
| `policy.json` | `546c2dfa2e26c7b21d7a9c8f4d3cf898f4b07c96cb9dc29e0b3ec5ede082cdea` |
| `backend.lock.json` | `1a1370baa4540df2ea27885dd101eeacfe65f7e55c09c37446f109fa505471c1` |
| `test_serial_send_deadline.py` | `b0000583d236a30713be5569dd03e16fb8a0a219c97cff5f8606170969ceb1e4` |
| `test_guest_rejection_lifecycle.py` | `cce721bdf1f1a1bfbf59de8c69f380747791b03f91f6463f73d3569e18b2b671` |
| `test_target_view_policy.py` | `4239f15b7a03d4cf94b7775b37292984e764a7bd38b09348d6710f9ae7c566a6` |
| `test_source_map_closure.py` | `1d78abb845002563a40e72a421e950d8e30d128c50cf599effe186ddcabdcf4a` |
| `test_provision_metadata.py` | `d399038a2bed6b1960f7f24ad91d62d518ba82359281bbfe2806be3cf361c130` |
Final F1–F4 correction reviewed in `final-pr-review-fix1.md` (`c6b84157a8219168eddfdee618ba54c6ac4631539c2718c7bc597a30d822e7f3`), whose scoped static PASS applies to the exact source/test pins in this table and the exact 24-file index pins in `pr-readiness.md`. This report is a separate review artifact, not a staged package path.

- F1: `prepared_root_extent`, `target_view_device_image`, `build_vm_args`, guest command-line parsing and `read_target_view_device` now carry and verify the selected prepared root partition's start/length/device/hash while the composite uses only that extent. Synthetic test builds a partitioned disk with trailing bytes and traverses the real command/consumer interface.
- F2: H2 calls `storage` with the existing output root; its test dispatches actual H2 storage writes into output/scratch/home/reserved mapping and observes bounded synthetic ENOSPC only after four nonempty real file writes.
- F3: `fixture_capacity_reservation` includes full runtime input/map bytes and writable/evidence reservation before allocation; boundary coverage checks exact 64-GiB fit and over-limit rejection.
- F4: `main` returns success only for recorded phase-specific captured result; missing, failed, or unexpected results return nonzero after lifecycle evidence retention.

The tests use synthetic filesystems/maps and patched process/signal boundaries. No VM, real process spawn, signal, asset, external store, operator, vendor, model, or qualification execution occurred. The host watchdog remains the only hard VM deadline; guest cleanup and blocking file write/fsync are cooperative/unbounded, and interrupted durability/terminal delivery stays UNKNOWN/INCOMPLETE, never PASS.

Contract/provenance: approved plan SHA-256 `da2f39921fe5fde68452733b75406db716d824e625e03d686f82256084b7dffe`; user-approved `deadline-contract-amendment.md` SHA-256 `fe58b42c45aa6c9ee4e30573de9357f8f85f6bdfdeb46747aaf6171cc52fe403`; prior bounded fix5 review SHA-256 `84fe33871fd62c903d6368b195f4086ada7d5cfdf65d9632996eac313118caff`. The approved plan and amendment are unchanged. `backend.lock.json` is included byte-for-byte unchanged as source configuration required by `launch.load_lock`, launcher identity/digest, provisioning, and manifest closure; its inclusion changes neither its pin nor authority and it is not a credential, controller release binding, or actual source map. Source-map-like rows in tests are synthetic only, not externally approved authority.

## Limits and blockers

- No VM, guest, operator, vendor, model, qualification, acquisition, store access, runtime-root creation, asset download/inspection, or activation occurred. The failed acquisition is not resumed or retried.
- No independently approved source-map bytes/digest, runtime/target-view identity, accepted preparation lineage, or controller release binding is supplied by this PR. These remain activation blockers, not candidate self-authority.
- Current O/R are preserved and still conflict with the immutable approved pins: O current `2126edc18d5e107db5cc3f19bb6f95cfea6aaead85658efa7bc5a3f16ef3163e` vs approved `2aa558bc5750b362a54a960c92ff23311153c6428c372203c2e5a0f37f8f16d1`; R current `b6b0843beefef91b2ce322f7544aaf40cef1f9a6b2c6adefe2b6c45a3950f554` vs approved `28b92f8abb02feebb4adc07d7594ee9a25e146cc3ef13a7d9f5940ec318b982d`. Three separate operator-fork findings remain outside scope and need their own approval.
- The earlier Gitleaks 8.30.0 scan is stale and is not claimed for this final staged snapshot. Final configured offline Gitleaks scan is pending after the final document staging; CI's pinned 8.30.1/full-history scan remains unrun, with no scanner download.
- Production QF5 RC3 remains `HOLD`; T8/T9 remain incomplete; QF5b remains unstarted. This change is not containment proof or release acceptance.

## Changelog

The root `CHANGELOG.md` now has the scoped entry under `Unreleased` / `Changed`; no release version is assigned.

## Repository checks

The seven applicable local gates completed once: CLI validation (325 passed/0 failed, 47 warnings), skills audit, SDLC audit, 70% alignment, offline freshness audit (16 findings, zero high), and repository tests (1,519 passed/0 failed). The configured Vite build passed using a fresh temporary output directory to preserve pre-existing ignored `cli/dist/`; exact commands and outputs are in `pr-readiness.md`. Gitleaks 8.30.0 found no leaks in the 24-path staged draft; the two result-reporting docs were updated after that scan and were not rescanned. CI-only downloads/network/full-history scans, unrelated repository gates and all runtime/activation gates remain excluded.
