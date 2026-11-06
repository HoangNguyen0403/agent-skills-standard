# Assignment packet: offline-export-capture-repair

- Plan: /Users/nguyenhuyhoang/.paseo/worktrees/0vty4mn4/zealous-flamingo/artifacts/runs/system-design-visualization-improvements/exporter-repair-plan.md
- Plan SHA-256: 297c5ff5934fe9368415e31fc7dfe2c16b0125dd0228f9f410b64a63f8ba4611
- Task number: 1
- Project domain: Personal agent-skills-standard prj_24334e6778b1395c
- Workspace root: /Users/nguyenhuyhoang/.paseo/worktrees/0vty4mn4/zealous-flamingo

## Goal

Bind selected spec to exact canonically validated capture

## Owner

Personal - DeepSeek exporter residual owner

## Authority: allowed operations

- Read and edit owned paths under approved SRS/packet
- Freeze and return evidence

## Authority: forbidden actions

- Run tests/build/lint/formatters mid-flight
- Edit peer-owned paths
- Deploy or spend

## Authority: required approvals

- User approved corrected contracts; subagent-driven; repair baseline

## Global invariants

- Preserve approved IDs, semantics, evidence and independent review
- No fabricated verification

## Non-goals

- No installs, model eval execution, publication, commits, delegation or unrelated edits

## Owned paths

- skills/common/common-architecture-diagramming/scripts/export_html.py
- skills/common/common-architecture-diagramming/scripts/test_export_html.py
- skills/common/common-architecture-diagramming/scripts/validate_manifest.py
- skills/common/common-architecture-diagramming/scripts/test_view_manifest.py
- skills/common/common-architecture-diagramming/references/offline-export.md

## Acceptance criteria

- **AC-01**: Apply canonical PRD AC-01 and corresponding SRS contract in this task scope
- **AC-04**: Apply canonical PRD AC-04 and corresponding SRS contract in this task scope
- **AC-05**: Apply canonical PRD AC-05 and corresponding SRS contract in this task scope

## Verification

- cwd: /Users/nguyenhuyhoang/.paseo/worktrees/0vty4mn4/zealous-flamingo
  command: Parent runs focused Python/native checks and actual ingress smoke after all relevant owners freeze
  expected: Owned behavior passes; unavailable native/eval/human lanes explicit NOT RUN

## Required standards

- common-architecture-diagramming (skills/common/common-architecture-diagramming/SKILL.md, revision 0ea84fb78e9f46fc318e84c400d2674c771c39f350a31a24b20d65af8c0a9427)
- common-security-standards (skills/common/common-security-standards/SKILL.md, revision 26ac1d160a2b2ffe48e3a1afe609cef6f559be2fe9c89c81840ae8d8a217ca9e)

## Source files

- docs/prd/prd-system-design-visualization-improvements.md (SHA-256 1fe4e418408e3b0a09ae938da20ecfcb6c1cbe15435cecbbb9ab46af69d0c659)
- docs/srs/srs-system-design-visualization-improvements.md (SHA-256 46b35a78b9d69ce2266e50021623fa1f6273a4286e2c2adfa1c751aefe7d6cad)
- docs/adr/adr-system-design-visualization-improvements.md (SHA-256 23715f039a099e62b4b411d100539442843370b4a655ce0d0db663f74e423f54)

## Source revision

- 52671cf9ed6a1c376dfaaae7e621dbc51a4c8765

## Dirty identity

- d8876d7c0286d34d2e17860c8a161a678c970123129a3c9faa0351cb5901ba2f

## Dependencies

- None declared (explicit empty list).

## Output contract: receipt destination

- artifacts/runs/system-design-visualization-improvements/exporter-residual-receipt.md

## Output contract: status vocabulary

- completed
- needs_context
- blocked

## Output contract: stop conditions

- Freeze after owned edits
- Return material missing contract to parent

## Limits

- status: advisory
- correction_attempts: 1

## Selected task text

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
