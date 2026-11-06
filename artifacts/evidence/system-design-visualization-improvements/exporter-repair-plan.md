# Offline exporter residual repair

Authority: approved SRS/ADR, corrected design and Subagent-Driven implementation. Personal project prj_24334e6778b1395c; workspace wks_e1df74a66b7e5f55. Original exporter owner frozen after one corrective follow-up; residual quality finding routes this slice to configured Personal - DeepSeek, not global quota exhaustion. Base 52671cf9ed6a1c376dfaaae7e621dbc51a4c8765.

## Task 1 — Bind offline export to the exact canonically validated view capture

**Scope / owned write set:** diagramming scripts/export_html.py, scripts/test_export_html.py, scripts/validate_manifest.py, scripts/test_view_manifest.py and references/offline-export.md only. No renderer/style/checker or skill guidance edits; renderer owner remains separate.
**Inputs:** SRS LLD-002 captured-byte binding and trusted ancestor contract; independent security finding confirmed canonical read A followed by exporter reread B accepts unvalidated B. Existing current exporter has no-follow/root-bounded reads but not same-snapshot validation. Original packet-2 remains applicable except this explicitly extended canonical owner set.
**Outputs:** exact-capture operation-local digest sink at canonical view read; exporter consumes captures only after report fully passes; real canonical matching and changed-view regressions.
**Real ingress:** export_html.py SPEC --output-dir DIR [--manifest MANIFEST]; default canonical manifest validator callers unchanged.
**Invariants:** canonical validator is sole graph authority; bounded no-follow file reads; same bytes parsed and hashed; fresh operation-local sink, no globals; errors/review_needed always reject.
**Positive:** optional keyword-only captured digest sink populated by canonical view ID from exact bounded payload at original canonical parse site; selected initial SPEC digest matches captured digest after successful complete report, without second view-file read. Existing no-clobber/complete writes/staging-only cleanup and group/other ancestor rejection retained.
**Negative:** no mock canonical success to prove binding; no later read/caller declared digest as capture; changed A-to-B before binding selected B must reject with no final output. Never copy source bodies into HTML or broaden filesystem/network authority.
**Verification owner:** parent covering Python modules + actual package/browser smoke after owners freeze; independent security rereview of cumulative same-base snapshot. Workers do not run tests/build/lint/formatters mid-flight.
**Handoff / freeze:** freeze owned files and report exact modified paths in exporter-residual-receipt.md with expected commands; no installs, commits, delegation, model evals or publication. Forward cross-owner gaps immediately.
**Correction route:** one concrete residual correction; observed route exhaustion advances configured Personal Delivery, never premium. Missing prerequisites are named, not bypassed.
