# Independent review — approved deadline amendment and serial implementation

## Verdict and scope

**SpecCompliance: PASS, scoped STATIC review against the explicitly user-approved amended contract. TaskQuality: PASS, scoped STATIC review. Activation and runtime acceptance: HOLD.**

No confirmed correction-induced blocking, major or critical defect was found in the reviewed amendment, sender and production callsites. The remaining F4-N3 interface from `static-review-fix5.md` is addressed under the approved amendment, not retrospectively declared compliant with the superseded guest-hard-completion requirement. Its deadline-aware serial interface is implemented; guest filesystem/cleanup completion is explicitly cooperative and unknown/incomplete when interrupted. The external host whole-VM deadline remains mandatory. This is not proof of host scheduling, kill/reap latency or Linux device behavior.

The bounded launcher-only PR **can be packaged honestly as code with synthetic host coverage and activation gates still closed**. It must not be described as verified VM containment, operator-proof acceptance, a production release or completion of T8/T9. No new implementation loop is requested by this review. Ordinary repository PR checks and accurate inclusion/exclusion of artifacts remain packaging obligations, not checks executed here.

All paths below are relative to `L=.superpowers/sdd/2026-10-11-system-design-professionalization/t8-lane-runner/offline-proof-launcher`, unless qualified with E, its existing evidence root. The only write in this assignment is this report. The writer was quiescent; this reviewer did not implement the amendment or delegate.

## 1. Authority and contract interpretation

The current user explicitly authorized review of the clarification selected after fix5 §4: external host watchdog as sole hard whole-VM deadline; cooperative guest cleanup; unsynced or undelivered artifacts unknown/incomplete on kill; nonblocking deadline-aware serial transport still required. This instruction is the approval boundary. The implementer's description of approval is not independent authority.

`deadline-contract-amendment.md:3–17` records that narrow change, preserves the approved plan and backend lock, leaves external map/runtime/lineage/release references nonauthorizing, and disclaims preemptible regular-file `write`, `fsync` and preparation `os.sync`. Its interface and outcome contract at19–30 agree with the actual source. `README.md:24–41` does not supply runnable fabricated start authority, distinguishes local FD completion from receiver observation, and keeps activation and production gates closed.

Unchanged `approved-plan.md:125–156,193–208,239–245` and `policy.json:7–29,42–59` retain: no network or host shares; bounded read-only input/runtime view; one 4-GiB writable filesystem; main process plus two permitted threads; process/exec/unapproved-signal restrictions; 16-MiB raw stdout and stderr limits; independent host timing/termination records; one preparation at most900 seconds, eight named fixtures at most300 seconds each, two named inspections at most300 seconds each; each named attempt once and no automatic retry. The amendment does not authorize a retry after a failed acquisition, an O/R repin or any VM/operator execution. This review does not exercise these controls.

## 2. Actual full input pins

Actual raw SHA-256 values were obtained before dependent source inspection and reconciled with `launcher-report.md:362–387`. Changed-file pins match the user-supplied values and the report. Protected inputs match their prior observed identities. These are integrity observations, not approval of candidate source-map/runtime contents.

| Input | Actual raw SHA-256 |
|---|---|
| `launcher-report.md` | `2930d31e38b8db4d6a14da396c07d569b201ba603ae2e765885a2d38cd4b206a` |
| `guest-supervisor.py` | `3a96034335b109129c46b2825171e697e6b07cc6b7a8a3f293f378901560ae01` |
| `deadline-contract-amendment.md` | `fe58b42c45aa6c9ee4e30573de9357f8f85f6bdfdeb46747aaf6171cc52fe403` |
| `README.md` | `80be7e3762add9d8c88e796599fffeef0f3610308a6979571000be4ff430c8db` |
| `test_serial_send_deadline.py` | `b0000583d236a30713be5569dd03e16fb8a0a219c97cff5f8606170969ceb1e4` |
| `test_guest_rejection_lifecycle.py` | `00cbc91d11e95fde1475b8d2b73fb6765d4faea1cb645b4a6a47cedd4c4c8076` |
| `test_target_view_policy.py` | `70364abd14b7d86a637587a8f4b4774a8fde57509d0387fc73faf826e8bb2ed1` |
| `test_source_map_closure.py` | `1d78abb845002563a40e72a421e950d8e30d128c50cf599effe186ddcabdcf4a` |
| `prepare-manifest.py` | `906d3f09947b2392013176fcbe24d223c79cd4832005bdf5009cb3640f5480cb` |
| `bootstrap.py` | `9d5e0accb444a8336d9759ee7ee24add146e4cf2e904941758959e9a976fe0c1` |
| `harmless-fixture.py` | `ab253e18293147cca18ea45ea9365ff30ef251f3310b86b88327e34aa5d4ccdd` |
| `launch.py` | `46d3ea91fb09eec0d1d08806b2b700313f5a156ce8d141b9ddd0910acf751a5e` |
| `protocol.py` | `fed5cc04b546972325215f88a3b4bb7f8276e41524aec7e35a11e0ef45927bb9` |
| `policy.json` | `546c2dfa2e26c7b21d7a9c8f4d3cf898f4b07c96cb9dc29e0b3ec5ede082cdea` |
| `manifest.schema.json` | `dcdce61796d2047f32cd2f707b91a40588ad35e90e01332b9ac8df1184062910` |
| `provision.py` | `e3df6b370254b4248e1c03e87ef098dd9a9ad1af91c8d3431ac76662809ca5df` |
| `debian_contract.py` | `2d4cfad1c069b2af4d09cbe39d5e432b83ff046d9c74cd824dc0b91f9c2e8e8c` |
| `test_provision_metadata.py` | `d399038a2bed6b1960f7f24ad91d62d518ba82359281bbfe2806be3cf361c130` |
| `approved-plan.md` | `da2f39921fe5fde68452733b75406db716d824e625e03d686f82256084b7dffe` |
| `backend.lock.json` | `1a1370baa4540df2ea27885dd101eeacfe65f7e55c09c37446f109fa505471c1` |
| `static-review-fix5.md` | `84fe33871fd62c903d6368b195f4086ada7d5cfdf65d9632996eac313118caff` |
| preserved current O: `E/g2-instrumented-operator/operator.py` | `2126edc18d5e107db5cc3f19bb6f95cfea6aaead85658efa7bc5a3f16ef3163e` |
| preserved current R: `E/qf5-collector-report.md` | `b6b0843beefef91b2ce322f7544aaf40cef1f9a6b2c6adefe2b6c45a3950f554` |

Old approved O/R remain `2aa558bc5750b362a54a960c92ff23311153c6428c372203c2e5a0f37f8f16d1` / `28b92f8abb02feebb4adc07d7594ee9a25e146cc3ef13a7d9f5940ec318b982d`. This report neither resolves their conflict nor approves the preserved fork. Its three separate findings are outside this launcher amendment. No restoration, actor attribution, plan/lock mutation or candidate self-authorization occurred.

## 3. Sender boundary and outcome semantics — addressed, static

### One owned nonblocking descriptor

`guest-supervisor.py:717–733` opens the fixed serial endpoint once with `O_WRONLY|O_NONBLOCK|O_NOFOLLOW`, verifies the opened FD is a character device, registers writable/error/hangup polling, and closes the FD on initialization failure. `SerialWriter.close:807–808` closes that owned object. `run_mode:2003–2024` and `main:2050–2059` each create one writer in their mutually exclusive entry paths and close it in `finally`; no alternate production sender or independent serial-open path was found in the enumerated consumers.

### Absolute cutoff and bounded progress

`_send_frame:739–799` refuses a poisoned writer or an already expired call before constructing a frame. Each write iteration checks the same supplied absolute monotonic deadline and the4096-step cap. The attempted slice is at most64KiB (`:688–689,763–771`). Interrupted writes consume progress steps. On backpressure, the remaining duration is recomputed, the writable poll is bounded by its millisecond representation, a poll consumes another progress step, and expiry is rechecked before another write (`:774–789`). Error/hangup/invalid-FD polling outcomes and write errors return unknown. No deadline reset or blocking serial-write fallback exists.

The ceil-to-millisecond poll timeout is a poll API granularity, not a promise of exact submillisecond scheduling. It is followed by a deadline check before writing. This review does not claim a hard-real-time guest or host scheduling guarantee.

### Exact local versus receiver facts

`SerialSendOutcome:692–714` exposes complete/partial/unknown, started, sequence, frame byte count and actually accepted byte count; its serialized receiver observation is always unknown. `_send_frame` advances sequence only after its entire local frame is accepted (`:794–799`). The incomplete helper (`:758–761`) poisons after any written prefix or unknown operation outcome. Poisoned writers refuse later frames before writing (`:740–741`); the explicit H7 corrupt-frame path also poisons. A zero-byte expiry can remain unpoisoned, but it has not appended a partial frame and the same expired deadline prevents further transport. A local complete outcome is deliberately not a host acknowledgement.

`send_json:811–816` rechecks poison and expiry before serialization and passes the same deadline to `send`; `_send_frame` checks again after serialization on entry. `require_serial_complete:819–821` rejects non-complete preparation/inspection outcomes instead of returning successful operation completion.

## 4. Complete production caller reconciliation

All textual production calls to `writer.send`, `send_corrupt`, `send_json`, `require_serial_complete` and writer construction were enumerated, then the complete owning functions were read. No old no-deadline production invocation remained.

| Consumer | Actual source and data flow | Static disposition |
|---|---|---|
| Pre-gate rejection | `reject_child_before_gate:1192–1461` receives the existing operation deadline. EOF1283 and retained-payload1331 send with that deadline; accepted frame payload bytes, written/expected frame bytes, sticky incomplete status and EOF status are separate from memory and artifact/sync facts. Terminal1459 explicitly chooses not-started after expiry or poison, otherwise uses deadline-aware JSON; local terminal outcome is attached only after transport1460. | ADDR. No late terminal initiation, invented receiver acknowledgement or promoted rejection. |
| Shared child path | `collect_child:1462–1687` establishes one `started + budget_ms/1000` cutoff before its owned preparation/spawn path. EOF1623 and prefix1635 carry it. Payload accounting only increments complete-frame payload on a complete outcome; failures remain sticky. Terminal1683–1685, including H7 corruption, is skipped after expiry/poison and shares the same cutoff. | ADDR. No per-frame budget renewal or terminal append after a partial/unknown stream. |
| Guest fixture exit | `run_mode:2018–2022` receives the actual result and returns success only for exited/zero plus complete local terminal delivery. Local completeness alone does not bypass host checks. | ADDR. A failed terminal send cannot establish guest success. |
| Preparation | `prepare_mode:1832–1906` sets one900-second deadline before acquisition/verification work. Kernel/initrd metadata and every chunk1897–1902 use it and require complete local delivery. After cooperative `os.sync`, report1904 and shutdown1905 also require complete sends. | ADDR. Expiry after blocking work refuses the next send; no successful report/shutdown is fabricated. |
| Read-only inspection | `inspect_mode:1909–1997` caps its supplied operation budget at300 seconds before inspection work; result1996 uses the same cutoff and requires completion. | ADDR. Expiry after traversal cannot create a successful local terminal outcome. |

The normal shared-child loop can still drain/persist/reap cooperatively, and regular-file writes/fsync as well as preparation sync remain synchronous. The amendment explicitly removes any guest-hard-completion promise for these operations. Their presence is therefore not reopened as the old F4-N3 requirement. If killed before synchronization/terminal delivery, no complete guest receipt can be inferred from an in-memory result or from code reaching a pre-syscall clock check.

For pre-gate rejection, the separate memory/actual named prefix/sync/frame records at1193–1205,1302–1345,1388–1451 remain truthful under the reviewed cases; rejection stays `published=false` and an unconfirmed reap is not represented as success. The original F4-N4 credit is preserved, not replaced by local frame counts.

## 5. Host authority and unchanged failure classification

The host `launch.py` and `protocol.py` raw identities are unchanged. Their relevant consumers were read, not executed:

- `launch.SerialFrameScanner:854–893` incrementally passes only decoder-validated complete frames to the callback and raises on missing/truncated framing. `protocol.FrameDecoder:117–153` checks exact run/sequence/header/digest, delivers only a complete payload, and rejects a trailing partial frame. A previously delivered valid frame remains observed when a later frame is incomplete.
- `launch.py:1454–1483` retains actual observed stream payloads and control records. It does not adopt the sender's local `receiver_observed` or `terminal_delivery` as authoritative success. Post-send `terminal_delivery` is local metadata, not something the sender could truthfully include as a receiver acknowledgement in the frame being sent.
- The host deadline is armed before the owned vfkit spawn (`:1498–1509`), includes startup, and is not dependent on the guest reporting READY or finishing cleanup. Expiry/interruption/transport failure leads to the owned host stop path (`:1524–1537,1591–1598,1609–1617`). `stop_vm:767–851` records actual positive-owned-PID signal/reap facts, uncertainty and lateness. This is the mandatory external enforcement path; it is not runtime verified here.
- `scanner.finish` at1618–1621 preserves a transport error. The result starts failure1682; raw serial bytes and observed stream prefixes are retained1684–1689. Unconfirmed VM termination1659–1662 records the uncertainty instead of fabricating a reaped VM.
- `base_no_host_failure:1780`, preparation report/shutdown reconciliation1791–1798, final elapsed-time checks1778–1779/1831–1832 and `no_host_failure:1850–1856` keep timeout/interruption/transport/artifact/unknown-VM outcomes fail-closed. A guest-local complete send cannot override these conditions. Preparation still requires trusted complete exports plus matching shutdown and clean host observations; inspection still requires sealed-source/read-only reconciliation.

The strict controls in unchanged host/bootstrap/policy files retain their previous static credits. Their implementation was not replaced with a promise that guest cooperation enforces a hard deadline. Conversely, late/unknown host termination is still a failure, not excused by the amendment. Actual OS containment and wall-time behavior remain unexercised prerequisites.

## 6. Synthetic source-case fidelity and verification limits

`launcher-report.md:356–360` reports `rtk python3 -I -S -B -m unittest discover -s . -p 'test_*.py'`,44 tests in0.437s, OK. It also records earlier fixture defects and corrections. These are implementer-reported results, not independently executed or replayed results. No raw test-process transcript or OS telemetry was collected in this review. Reading source and pinning it does not prove that command ran or that no process/VM was started in another session.

The source evidence is bounded and relevant:

| Case source | What the actual case can establish if exercised | What it cannot establish |
|---|---|---|
| `test_serial_send_deadline.py:60–77` | A synthetic nonblocking pipe feeds the actual host scanner; full local send decodes to the expected payload and advances sequence once. | Virtio character-device poll/write semantics or a real receiver acknowledgement. |
| `:79–102` | Expired JSON call initiates no os.write and does not advance sequence. | Real watchdog timing or interruption of a blocked filesystem syscall. |
| `:104–173` | A real pipe prefix plus explicitly synthetic backpressure/clock/poller causes partial poisoning; the actual scanner keeps the earlier frame and rejects the trailing prefix; later sender calls write nothing. | Kernel backpressure timing, real serial delivery or host VM kill behavior. |
| `:175–225` | Expired actual pre-gate rejection invokes no terminal transport and does not wait for a child after expiry, with fake child/termination. | Actual signals, cgroup kill, descriptor survival through exec or reap latency. |
| `test_guest_rejection_lifecycle.py:40–61,90–218` | The fake writer now implements the explicit outcome/poison contract. Existing real temporary-file prefix/hash/sync-uncertainty and empty-versus-unobserved assertions remain; it is not a receiver-acknowledgement mock. | A VM, real child execution or actual durable-on-kill storage behavior. |
| `test_target_view_policy.py:21–26,392–416` | Guest test loading registers the module needed by the new dataclass; injected pre-gate callers use the actual deadline/outcome signature. | Production Popen/preexec FD or Linux confinement semantics; Popen/signals are patched. |

The constructor's actual character-device validation, write/poll error/step-limit branches and all preparation/inspection send callsites were inspected statically; the new test file does not independently demonstrate every such branch or a live Linux serial endpoint. This is an explicit verification limit, not a claim of tested runtime enforcement. No count of synthetic cases is substituted for the actual source reconciliation.

## 7. Preserved credits, missing authority and next gate

- **F4-N1 and other FD handoff credits retained:** the fixed destination/source keep-set and placeholder ownership at `guest-supervisor.py:1517–1559` still precede membership/mount checks and GO. Unchanged pinned bootstrap/fixture retain their prior static review; real exec/library/socket proof remains outstanding.
- **F4-N2 retained:** unchanged `prepare-manifest.py` still contains the actual final full map comparator, and unchanged `test_source_map_closure.py` retains actual producer integration cases. No source-map approval is inferred from those synthetic examples.
- **F4-N4 retained:** partial file prefix, sync certainty, memory observations and frame outcomes remain separate. The amendment does not turn unknown durability into PASS.
- Prior closed mount-before-chown, first-owned-stop, strict schema/raw-map membership/actual builder, release revalidation, kernel/module checks, framing, read-only inspection and preparation-lineage source credits are preserved at their pinned unchanged inputs; this review is not a new broad audit or runtime signoff.

**CODE versus AUTHORITY versus runtime:** no residual amendment code blocker was identified. Independently approved complete source-map bytes and external raw digest, resolved O/R authority, runtime/target-view identities and their digests, accepted preparation/claim lineage and the controller release remain missing activation inputs. Those mandatory externally supplied values must not be self-enrolled from this review's candidate hashes. They block activation, not this scoped static code verdict. No acquisition retry, external-store adoption/cleanup or VM start is authorized here.

Recommended next action is the existing bounded **launcher-only PR packaging gate**: include the reviewed source, synthetic tests and amendment/usage documentation with honest evidence limits; exclude O/R fixes/repins, real authority/credential material, VM images/downloads/stores/raw large runtime artifacts and unrelated historical evidence. Preserve the immutable approved plan and attach the amendment explicitly. Do not call the PR verified containment, a completed reconstruction or QF5a runtime acceptance. No commit, push or PR creation was performed by this reviewer.

Before any activation, the controller must separately resolve the actual authority/release and permitted acquisition/preparation path, then enforce the original named one-shot campaign with real retained evidence. Before an operator proof, the three separate fork findings require their own authorized correction/review and explicit pin approval plus a separate pin-specific operator-run authorization. Production QF5/RC3 remain **HOLD**, QF5b remains unstarted and T8/T9 remain incomplete.

## 8. Review method, compliance and cost boundary

Root `AGENTS.md`, the code-review workflow, Python language/security and common review/security/OWASP/agent-boundary standards were loaded or refreshed. File routing returned no tier-eligible Python match; direct Python standards were loaded. MCP compliance audit before report delivery returned **no coverage gaps**; its23 loaded skills are cumulative session state, not23 new rulesets used by this focused review. Broad keyword routing also returned mobile-specific rules; those do not create mobile scope in this Python amendment.

Only named static project reads, textual source/caller enumeration, raw artifact hashing and this report write occurred. No delegation, source change, launcher/operator/vendor import or execution, syntax/AST/compile check, test/smoke, real process/signal experiment, external-store read/write, acquisition/VM/daemon operation, runtime-root inspection/creation, or host account/trust/inventory/credential read occurred. There was no need to invoke the target or rerun the reported tests to reach this static verdict. Final source/protected-input stability and this report's raw hash are checked at handoff.

Session cost telemetry was requested. Host token usage and pricing were unavailable; no monetary estimate or task-specific timing is invented from cumulative session telemetry. Completion means independent delivery of this static amendment report, not release, activation or proof authority.
