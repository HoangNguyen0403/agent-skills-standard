# Assignment packet: design-improvements-2

- Plan: /Users/nguyenhuyhoang/.paseo/worktrees/0vty4mn4/zealous-flamingo/artifacts/runs/system-design-visualization-improvements/execution-plan.md
- Plan SHA-256: 7460a2ffd4f1179fe90191ad465b880adc7a9319219474aa79fe03417142737b
- Task number: 2
- Project domain: Personal agent-skills-standard prj_24334e6778b1395c
- Workspace root: /Users/nguyenhuyhoang/.paseo/worktrees/0vty4mn4/zealous-flamingo

## Goal

Safe static offline export and honest guidance

## Owner

Personal - Cheap worker 2

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
- skills/common/common-architecture-diagramming/scripts/export_drawio.py
- skills/common/common-architecture-diagramming/SKILL.md
- skills/common/common-architecture-diagramming/references/mermaid-fallback.md
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
- docs/srs/srs-system-design-visualization-improvements.md (SHA-256 4fe86e3f3ac3623fb4e7c0fb4273942fa851b37b9118fb1a65d035aebc0c8d6e)
- docs/adr/adr-system-design-visualization-improvements.md (SHA-256 7700c81d4738f3dee0327441f60e46da65b2c911dcd264d540aea75ba8223f9a)

## Source revision

- 52671cf9ed6a1c376dfaaae7e621dbc51a4c8765

## Dirty identity

- e956b81155f45ded09e056cda7b589c7618beb6d986981620dab75c6b2308836

## Dependencies

- None declared (explicit empty list).

## Output contract: receipt destination

- artifacts/runs/system-design-visualization-improvements/worker-2-receipt.md

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

## Task 2 — Portable static export and honest delivery guidance

**Scope / owned write set:** new diagramming scripts/export_html.py and test_export_html.py; existing export_drawio.py only if strictly required; diagramming SKILL.md and references/mermaid-fallback.md; new references/offline-export.md if needed for concise skill routing.
**Inputs:** approved SRS LLD-002/FLOW-001/SRS-004…005 and reviewed security corrections; fixed shared renderer interface above.
**Outputs:** full strict static package CLI, no-clobber private publication, manifest capture binding, no active content, guidance consistent with implementation.
**Real ingress:** export_html.py SPEC --output-dir DIR [--manifest MANIFEST] using existing renderer/validator/exporter.
**Invariants:** exact source bytes/digest, private staging, trusted ancestors, exclusive no-follow children, PNG-only escaped page, staging-only cleanup.
**Positive:** both themes derive from one source; offline view title/scope/legend/evidence and digest; explicit manifest binds selected captured bytes.
**Negative:** reject existing paths/symlinks, unrelated/changed manifests and review_needed; never delete final published files after failure or claim CSP governs Desktop.
**Verification owner:** parent plus independent security reviewer; future actual browser and failure smoke after freeze.
**Handoff / freeze:** freeze owned files, return exact CLI/options and test command; no mid-flight checks.
**Correction route:** forward renderer/schema needs to parent; one corrective round for defects, configured quota fallback only.
