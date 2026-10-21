# Bounded launcher PR package readiness

## Candidate package

- Draft title: **Bound offline proof launcher serial delivery by cooperative deadline**
- Package path: `.superpowers/sdd/2026-10-11-system-design-professionalization/t8-lane-runner/offline-proof-launcher/` (`L`)
- Exact PR file list: `pr-files.txt` — 24 repository-relative, non-wildcard paths (SHA-256 `39d49e6354b2dbb391368ae20a8333d1da8291aadfe6e7c0b186c4b4d1772163`): the 23 launcher package paths plus root `CHANGELOG.md`; includes the three preparation documents and unchanged backend lock.
- **Readiness: READY FOR TECHNICAL REVIEW ONLY.** The exact 24-path clean-copy synthetic suite passed after the four review fixes (48 tests, exit 0); all seven previously run applicable repository checks remain evidence for their covered areas only. The final code edits are covered by the clean-copy suite, not by the earlier root repository checks. Final staged Gitleaks scan is still pending. Fresh Git checkout/CI integration remains `UNVERIFIED`; runtime/activation remains `HOLD`.
- Current action: the exact 24 `pr-files.txt` paths are staged. Nothing outside that allowlist is staged; no commit, push, PR creation, or publication occurred. Do not execute the allowlist automatically.
- No move/copy to a second production path. No reusable skill/package exports.

## Readiness matrix

| Area | Status | Evidence / boundary |
|---|---|---|
| Launcher source and caller integration | **SCOPED STATIC PASS, F1–F4** | `final-pr-review-fix1.md` SHA-256 `c6b84157a8219168eddfdee618ba54c6ac4631539c2718c7bc597a30d822e7f3` approves these source/test bytes. Controller adjudication remains for the disclosed process deviation and final raw-diff/scan receipt. Activation remains HOLD. |
| Focused synthetic behavior tests | **PASS for current source/test bytes, exact allowlist export** | Python 3.13.0 isolated run: 48 tests, exit 0. The two report-only docs were updated after the export and are not claimed byte-tested; no source/test bytes changed afterward. Exact output and fixture-failure correction provenance below. |
| Amendment and user documentation | **PASS, package drafted** | `deadline-contract-amendment.md`, existing `README.md`, and unchanged `approved-plan.md` are listed. The amendment supersedes only the guest-local hard-completion claim. |
| Changelog | **Applied, Unreleased** | Scoped entry added to root `CHANGELOG.md` under `Changed`; no version assigned. The exact root file is included in the 24-path `pr-files.txt`. |
| Ignore behavior / file scope | **Confirmed; exact 24-path list staged** | All 23 launcher paths are covered by `.superpowers/sdd/.gitignore:1:*`; root `CHANGELOG.md` is tracked. The staged names match `pr-files.txt` exactly; no tree/wildcard add and the ignore rule is unchanged. |
| Content / binaries / credentials | **Final scan receipt external to these staged docs** | The staged docs avoid embedding a self-invalidating final diff/scan digest. Final canonical raw diff identity and installed offline Gitleaks output will be returned together in the external completion receipt; CI 8.30.1/full-history remains unrun. |
| Repository PR checks | **Seven local checks completed once** | Exact invocations/results below. The root `pnpm build` wrapper was not invoked verbatim: existing ignored `cli/dist/` contains user artifacts, so the same configured Vite builder ran with a new temporary `outDir`. CI setup/downloads, network/service gates and runtime execution remain excluded. |
| Runtime / host security | **NOT RUN / HOLD** | No VM, guest, real child, real serial FD, signal, host-watchdog kill, acquisition, external store, image, runtime-root, operator, vendor, model, qualification, or production execution. Kernel confinement and Linux delivery behavior remain unverified. |

## Repository gate evidence

The seven root commands below ran before the current four launcher source corrections and are not represented as validation of those edits. They remain reported historical results, not rerun. Final launcher source/test verification is the isolated exact-allowlist run below.

| Gate | Command | Status and captured result |
|---|---|---|
| CLI validation | `rtk proxy pnpm --filter ./cli validate:all` | Exit 0; 325 passed, 0 failed, 47 warnings. |
| Skills audit | `rtk proxy pnpm audit:skills` | Exit 0; `No obvious redundancy found.` |
| SDLC audit | `rtk proxy pnpm audit:sdlc` | Exit 0; `SDLC audit passed.` |
| Alignment | `rtk proxy pnpm check-alignment` | Exit 0 at 70% threshold; all skills meet threshold. Warnings: `flutter/flutter-getx-navigation` 6/7 (86%) and `swift/swift-best-practices` 10/12 (83%). |
| Offline freshness audit | `rtk proxy pnpm freshness:audit` | Exit 0; 16 findings: high 0, medium 10, low 6, warn 0. No network check or report write. |
| Repository tests | `rtk proxy pnpm test` | Exit 0; 64 Vitest files / 1,254 tests passed, plus 265 Node tests across evals (80), freshness (62), outcome (23), trace (16), benchmark (8), metrics (44), release (8), and harness (24): 1,519 total, 0 failed. Vite emitted a config-loader warning; the test run completed successfully. |
| CLI Vite build | `rtk proxy pnpm --filter ./cli exec vite build --outDir /var/folders/bk/6qfpqsgs4vj31vdb4b0yq_f80000gp/T/ags-launcher-cli-build.VsrjDEDe1G` | Exit 0; Vite 8.3.3, 72 modules, 358.66 kB bundle / 709.09 kB source map, built in 26 ms. Safe `outDir` redirect preserves pre-existing ignored `cli/dist/`. This is the configured `vite build` binary, not a verbatim `pnpm build` wrapper run. |
| Secret scan | **Receipt supplied outside the index after final doc staging** | The prior `a18eb2…` writer digest came from an RTK-filtered `rtk git diff` pipeline and is not a raw binary-diff digest. Canonical raw serializations for the review snapshot were `afaa082…` (default abbreviated indexes) and `42d5f7…` (`--full-index`). The final post-edit scan result/digest is reported externally so the staged docs do not change after scanning. CI 8.30.1/full-history remains unrun. |

## Final staged manifest

- The index was empty before preparation. The staged path set now matches all 24 entries in `pr-files.txt` exactly (SHA-256 `39d49e6354b2dbb391368ae20a8333d1da8291aadfe6e7c0b186c4b4d1772163`); no unrelated path is staged.
- `rtk git diff --cached --check` exited 0 with no findings. Final staged stat: 24 files changed, 8,667 insertions; the only change to a pre-existing tracked file is the one-line owned `CHANGELOG.md` entry.
- Final filename/content pins are compared against `final-pr-review-fix1.md`'s direct `git show :<path>` table for all 24 allowlisted paths. `test_target_view_policy.py` is `4239f15b7a03d4cf94b7775b37292984e764a7bd38b09348d6710f9ae7c566a6` (64 hex); the earlier receipt's 63-character form omitted its final `6`. The reviewed index and this package's full pin table agree; no source/index drift was found.
### Raw diff digest reconciliation

- The prior writer receipt `a18eb2a6ef718029d5aee8dfaa1ba717d5c4ff119b6b946f87ec4b62a9ea1cb7` was generated using the `rtk git diff ... | rtk proxy shasum` pipeline. `rtk git` formatted/filtered the diff stream; it was not a raw Git serialization.
- Independently reproduced raw commands on the review snapshot: `rtk proxy git diff --cached --binary --no-ext-diff --no-color | rtk proxy shasum -a 256` → `afaa082b64ba1ffa0eb3272fa42005569c312e4f3a46ed4c2a69108a34b25537`; with `--full-index` added before `--no-ext-diff` → `42d5f7bf93622a8ab5a0418a454d4d4cd1baa0f8f1a19a4fffe76a1cd88ba81e`. The reviewer independently reports these same values. The difference is explained by the RTK-filtered receipt and full-index serialization; it is not evidence of staged content drift. These are historical identities for that review snapshot, not hashes of the later documentation-corrected index.
- The complete 24-path raw pin set in `final-pr-review-fix1.md` was crosschecked against the retained final package/export receipt and the reviewer-confirmed index identities. The source/test pins declared in `pr-description.md` match the reviewer table; later changes in this wave are confined to the two PR documentation files. `test_target_view_policy.py` uses the full 64-character hash above. This document does not self-reference the final diff digest; final snapshot and scan identity are delivered externally to avoid changing the scanned index.

### Final exact-allowlist clean-copy verification

- `pr-files.txt` SHA-256: `39d49e6354b2dbb391368ae20a8333d1da8291aadfe6e7c0b186c4b4d1772163`; the helper exported only these 24 explicit paths, preserving repository-relative layout, outside the checkout/protected store. It rejected missing/escaping/symlink/nonregular sources and verified every raw copied hash captured at export time. The two PR evidence documents were later updated; this run does not claim byte coverage of those final report-only versions.
- Exact command: `rtk proxy python3 -I -S -B .launcher-package-check.py`. The helper exported only the allowlist and ran `/Library/Frameworks/Python.framework/Versions/3.13/bin/python3 -I -S -B -m unittest discover -s .superpowers/sdd/2026-10-11-system-design-professionalization/t8-lane-runner/offline-proof-launcher -p test_*.py` from that independent copy. `TMPDIR=/private/tmp`; the generated `CHECK` root was automatically removed.
- Final exit: `0`. Captured stdout:
```text
{"grader_file_count": 21, "manifest_sha256": "d9a0138a66932c1d45562a67b9b0c95d64a4560a8ae1abd6e3ebbdd24af9bb6a", "operator_execution": "DENY", "output_dir": "/private/tmp/tmpt56aacm8/outputs/closure", "packet_file_count": 463, "source_file_count": 28}
```
- Final captured stderr:
```text
................................................
----------------------------------------------------------------------
Ran 48 tests in 0.396s

OK
```
- Copy hashes matched: `guest-supervisor.py` `3a169eaecbd8cd15b96e0f416f84609d82ef65d22d77d78ab4ad7e51700f3c6d`; `launch.py` `d7436e9369947910a30bdf6b77539fca58af52a90b059e9b83c9094c5a64f694`; `protocol.py` `fed5cc04b546972325215f88a3b4bb7f8276e41524aec7e35a11e0ef45927bb9`; `bootstrap.py` `9d5e0accb444a8336d9759ee7ee24add146e4cf2e904941758959e9a976fe0c1`; `harmless-fixture.py` `bd9f80bc963cfb9b783f4f205fd55004e21d6dadabbe138caaade4901f555e62`; `prepare-manifest.py` `906d3f09947b2392013176fcbe24d223c79cd4832005bdf5009cb3640f5480cb`; `provision.py` `e3df6b370254b4248e1c03e87ef098dd9a9ad1af91c8d3431ac76662809ca5df`; `debian_contract.py` `2d4cfad1c069b2af4d09cbe39d5e432b83ff046d9c74cd824dc0b91f9c2e8e8c`; `manifest.schema.json` `dcdce61796d2047f32cd2f707b91a40588ad35e90e01332b9ac8df1184062910`; `policy.json` `546c2dfa2e26c7b21d7a9c8f4d3cf898f4b07c96cb9dc29e0b3ec5ede082cdea`; `backend.lock.json` `1a1370baa4540df2ea27885dd101eeacfe65f7e55c09c37446f109fa505471c1`.
- The exported report-only bytes (superseded after this test run) were `pr-description.md` `0bd3c4424d3de6fd6d99d964731f69882b25a09b00ed71c434549c69f881dc90` and `pr-readiness.md` `de4c7f421c3f6a3b4e9b7d0a01c718a669e1283baa9c80cc39fb6ce0924e18ab`; all source/test/lock pins above are unchanged by subsequent documentation edits.
- Full regression provenance: earlier 48-test runs failed in synthetic fixtures before this final successful run. The initial run had four setup errors (runtime metadata stubs missing from controller test, temporary path handling and disk-handoff fixture); later runs narrowed to the root-view metadata fixture and H2 metadata mismatch. A subsequent assertion observed the exact H2 mismatch: temporary output dir `(device 16777229, uid 502, gid 0, mode 0700)` versus fixture expectation `(same device, uid 502, gid 20, mode 0700)`. The test now sets the temporary fixture directories to the required synthetic uid/gid and mode; root-view metadata now records actual temporary directory mode/uid/gid. These are test-environment corrections; production ownership, mode, device, capacity, lineage, and root-extent guards remain unchanged. Final full-suite output above is the sole post-correction pass.
- No `Popen`, signal, VM, actual assets, operator, vendor, model or qualification execution occurred. Synthetic source-map values are not external authority. The test import does not consume the real lock at runtime; the unchanged lock is included as required package configuration, not as test evidence or authority.

### Delegation deviation provenance (for independent review)

- Contrary to the later no-delegation instruction, two native child sessions had already completed and their work is preserved, not reverted: `LaunchGeometryCapacityExit` (session transcript `history://LaunchGeometryCapacityExit`, file `~/.omp/agent/sessions/-.paseo-worktrees-3hvsfnnw-modest-chicken/2026-10-20T12-15-23-106Z_01a1593c-dbe2-7658-8c2c-28185b226287/LaunchGeometryCapacityExit.jsonl`) changed only `launch.py`, `guest-supervisor.py`, `test_target_view_policy.py` for F1/F3/F4; `H2AggregateDirectory` (same session directory, `H2AggregateDirectory.jsonl`) changed only `harmless-fixture.py`, `test_guest_rejection_lifecycle.py` for F2. Both assigned not to test; their final yield calls are at transcript lines 331 and 102. I integrated and inspected the resulting five files and actual callers, corrected the production `prepared_root_partition_bytes` command/consumer handoff, corrected synthetic metadata setup after observed failures, and ran the final clean-copy suite. No additional child was spawned or restarted after the no-delegation clarification.


## Exact package boundary

`pr-files.txt` includes the reviewed launcher source/config and all five test modules, the unchanged approved plan and backend lock, the approved deadline amendment, existing usage README, the amendment-only review, three package documents, and root `CHANGELOG.md` (24 exact paths; list SHA-256 `39d49e6354b2dbb391368ae20a8333d1da8291aadfe6e7c0b186c4b4d1772163`). `CHANGELOG.md` SHA-256 is `498a54a41b91529373140eba176c3b9157f0d770d7df0be0a37e6bae48b6d64e`; `backend.lock.json` is byte-for-byte unchanged at SHA-256 `1a1370baa4540df2ea27885dd101eeacfe65f7e55c09c37446f109fa505471c1`. The lock is source configuration loaded by `launch.load_lock` and `provision.load_lock`, included in launcher identity/digest and manifest closure, not a credential, controller release binding, or actual source map.

The one current static-review report is included; `static-review.md` and `static-review-fix1.md` through `static-review-fix5.md` are not. `launcher-report.md` is not included.

## Unresolved gates (not PR claims)

- No independently approved source-map bytes/digest, runtime/target-view identity/digests, accepted prepared lineage, or controller release binding. Candidate hashes cannot authorize themselves.
- O/R identity conflict remains: current O `2126edc18d5e107db5cc3f19bb6f95cfea6aaead85658efa7bc5a3f16ef3163e` vs approved `2aa558bc5750b362a54a960c92ff23311153c6428c372203c2e5a0f37f8f16d1`; current R `b6b0843beefef91b2ce322f7544aaf40cef1f9a6b2c6adefe2b6c45a3950f554` vs approved `28b92f8abb02feebb4adc07d7594ee9a25e146cc3ef13a7d9f5940ec318b982d`.
- Three operator-fork findings remain separate and unapproved. No O/R edit, restoration, or repin.
- Failed acquisition evidence remains unchanged; no retry or resume.
- Existing 900s preparation, eight 300s fixture attempts, two 300s inspections, no-retry policy, external host watchdog, termination truth and log retention remain intact. Guest cleanup is cooperative; blocking file `write`/`fsync`/`os.sync` is not guest-deadline bounded. Interrupted durability/terminal delivery is `UNKNOWN`/`INCOMPLETE`, never PASS.
- Production QF5 RC3 is `HOLD`; T8/T9 incomplete; QF5b unstarted. No activation authority.

## Changelog

The scoped entry is applied in root `CHANGELOG.md` under `Unreleased` / `Changed`; no release version is assigned.
