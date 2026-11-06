# Receipt: exporter-residual — bind offline export to the exact canonically validated capture

- Status: **completed**
- Packet: `artifacts/runs/system-design-visualization-improvements/exporter-repair-packet.md` (task 1)
- Plan SHA-256: `297c5ff5934fe9368415e31fc7dfe2c16b0125dd0228f9f410b64a63f8ba4611`
- Source snapshot: `52671cf9ed6a1c376dfaaae7e621dbc51a4c8765`
- Owner: Personal - DeepSeek exporter residual owner
- Route note: Route 2 (Personal - DeepSeek) for this slice only, after confirmed same-snapshot binding defect.

## Defect closed

Canonical `_validate_manifest_data` read view bytes A and validated them; `export_html.validate_and_bind_manifest` then re-opened the same view path and accepted whatever bytes B were on disk at that later moment. A retained root fd / in-memory manifest froze neither child file. The accepted B was therefore never validated by the canonical validator.

## Change

`skills/common/common-architecture-diagramming/scripts/validate_manifest.py`
- `_validate_manifest_data(manifest, root, root_fd, *, captures=None)`: optional keyword-only operation-local sink. At the single canonical view read site the bounded payload is now read once (`_read_bounded`), decoded, parsed, and `captures[view_id] = "sha256:" + sha256(payload)` is recorded from those exact bytes before contract validation runs. Reads that fail (symlink, directory, FIFO, byte bound, bad JSON) record nothing.
- `validate_manifest(path, *, captures=None)` forwards the sink. Both parameters are keyword-only and optional; every existing caller and the CLI are unchanged, no globals, no module state.

`skills/common/common-architecture-diagramming/scripts/export_html.py`
- `validate_and_bind_manifest` now passes a fresh `captures` dict into canonical validation, requires the complete report to pass (canonical `errors` then `review_needed`), then binds by comparing `sha256(selected_spec_bytes)` to the recorded captures. The second view-file read loop and `_read_bounded`/`_safe_child_parts` re-read path are deleted. Capture iteration preserves manifest view order, so identical-bytes ties still resolve to the first declared view; the failure message is unchanged.
- No change to trusted-ancestor checks, staging-only cleanup, exclusive no-clobber publication, complete writes, theme controls, escaping/literal-text handling, PNG validation or exit codes.

`skills/common/common-architecture-diagramming/scripts/test_view_manifest.py`
- `test_capture_sink_records_exact_canonical_view_bytes`: real bundle; sink equals sha256 of the view file bytes.
- `test_capture_sink_binds_the_payload_parsed_not_a_later_file_state`: controlled `_read_bounded` hook rewrites the view file after the canonical read returns; report still passes and the capture equals the parsed bytes A, not the on-disk B.
- `test_capture_sink_omits_views_that_were_never_parsed`: directory spec is an error and records no capture.

`skills/common/common-architecture-diagramming/scripts/test_export_html.py`
- Removed all three tests that mocked `validate_manifest._validate_manifest_data` to success (packet: mocking canonical validation is not proof). Replaced with real fixtures written by the new `_write_manifest_bundle` + `make_manifest_spec` helpers (contract-complete spec, allowlisted `view.md` source, matching capture digests).
- `test_export_html_manifest_binding_success`: real canonical validation + real binding, exit 0, `manifest.json`/`service_view` in the page, `spec.json` bytes equal the selected input.
- `test_export_html_manifest_review_needed_fails`: real changed source capture, exit 1, no output dir.
- `test_export_html_manifest_unrelated_fails`: two distinct real views, selected spec not among the validated captures, exit 1, no output dir.
- `test_export_html_manifest_rejects_view_swapped_after_canonical_read` (new regression): selected spec bytes B, manifest view containing A; a controlled `validate_manifest._read_bounded` hook rewrites the view file to B immediately after the canonical read returns. Result: exactly one canonical read, view file provably B on disk, exit 1, no output dir. A second read by the exporter would have bound B and returned 0, so this test fails against the defect.
- `test_export_html_manifest_does_not_consume_captures_when_report_fails` (new): second view with an invalid spec makes the report fail while the selected digest still matches a capture; exit 1, no output dir.
- Fixture fix inside the owned test file: `make_valid_spec` used node kind `"database"`, which `validate_spec` rejects (known kinds include `db`, not `database`), so the pre-existing happy-path fixture could not reach export. Changed to `"db"`. This is fixture-only; no production behavior.

`skills/common/common-architecture-diagramming/references/offline-export.md`
- Manifest Binding section rewritten: capture at canonical read, digest-only binding, no second view read, post-validation swaps cannot bind, captures consumed only after the full report passes.

## Evidence

Post-edit syntax check and one targeted binding smoke were run before the mid-flight probe restriction was restated; no repo test module, build, lint or formatter was executed.

Exact commands executed in the authorized worktree (`cwd` = `.../zealous-flamingo`):

1. `cd skills/common/common-architecture-diagramming/scripts && python3 -m py_compile validate_manifest.py export_html.py test_view_manifest.py test_export_html.py` → `COMPILE_OK` (syntax only; produced the git-ignored `scripts/__pycache__/`).
2. Reads only: `grep` over `skills/` for `_validate_manifest_data` / `validate_manifest(` callers, `git status --porcelain`, `git log --oneline -3`, `git show HEAD:.../style_catalog.py | grep database`, `python3 -c` fixture checks against `validate_spec.validate` and `style_catalog.STYLE_CATALOG`.
3. Smoke probe, preserved for parent rerun: `/tmp/probe_binding.py` (outside the repo). Output:
```
plain validate: OK
report ok: True captures: True
bind: manifest.json (view: service_view)
swap rejected: True swapped: True
failing report rejected: manifest validation failed: view broken_
```
   Rerun: `cd skills/common/common-architecture-diagramming/scripts && python3 /tmp/probe_binding.py` (after parent freezes the renderer).
4. A proposed `rm -f /tmp/probe_binding.py .../__pycache__/probe_binding*` cleanup was denied by the user and was not retried; the probe file and git-ignored `__pycache__/` remain in place as evidence.

References check for the additive API: `xd://lsp` has no language server in this workspace, so caller discovery was done with `grep` over `skills/`: `_validate_manifest_data` callers are `export_html.py` and `test_export_html.py`; `validate_manifest(` callers are `test_view_manifest.py` and the module CLI. All remain valid under the optional keyword-only parameter.

## NOT RUN (parent-owned)

- No test suite, build, lint or formatter was executed mid-flight, per packet.
- Python module suites (`test_view_manifest.py`, `test_export_html.py`, `test_fixtures.py`), native draw.io export, browser smoke and independent security re-review are parent/owner-frozen follow-ups.
- Pre-existing unrelated state observed, not touched: `style_catalog.py`, `render_drawio.py`, `render_erd.py`, `check_layout.py`, `validate_spec.py` and their tests are dirty from peer owners.

## Corrective follow-up (security review LOW finding)

Finding: the escaping test asserted the literal `<img src=x onerror=alert(1)>` payload was present escaped, but that payload lived in `node.label`, which the exported HTML intentionally never emits (it emits kind/evidence/view metadata, not node labels); renderer and PNG output were mocked, so the oracle could not pass and invited a raw-label embedding "fix".

Correction, test oracle only (`scripts/test_export_html.py`, `test_export_html_security_escaping_and_literal_text_contract`, receipts updated):
- Payload moved to `version`, which is emitted into the metadata grid (`Version / Date` → `<dd>`), so the assertion measures real escaping of content that actually reaches the page.
- The node label is now a benign string (`Untrusted boundary`); no raw node label embedding was added to `export_html.py`.
- Added markup-creation guards scoped to the payload: `assertNotIn("<img src=x", html_text)` and `assertNotIn("<script>alert", html_text)`, alongside the existing DOM auditor (disallowed tags, `on*` handlers, `javascript:` URLs). Template-owned `<img ... data:image/png>` elements are untouched and still not matched by these guards.
- Node-label literal preservation is renderer test scope (peer owner), not this exporter oracle.

No production code, no design change, no test/build/lint/formatter run for this correction; parent runs the exporter suite after the renderer freezes.

## Limits

- The binding guarantee is bounded by the canonical root fd/no-follow traversal already in place; hostile same-UID replacement of a directory between open and read remains outside the approved threat model (SRS LLD-002).
- `__pycache__/` under `scripts/` was produced by a syntax check and probe and is git-ignored; no source or tracked file is affected.
