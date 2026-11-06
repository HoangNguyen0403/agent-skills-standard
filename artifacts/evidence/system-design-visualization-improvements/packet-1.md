# Assignment packet: design-improvements-1

- Plan: /Users/nguyenhuyhoang/.paseo/worktrees/0vty4mn4/zealous-flamingo/artifacts/runs/system-design-visualization-improvements/execution-plan.md
- Plan SHA-256: 7460a2ffd4f1179fe90191ad465b880adc7a9319219474aa79fe03417142737b
- Task number: 1
- Project domain: Personal agent-skills-standard prj_24334e6778b1395c
- Workspace root: /Users/nguyenhuyhoang/.paseo/worktrees/0vty4mn4/zealous-flamingo

## Goal

Renderer themes geometry and approved focused baseline repair

## Owner

Personal - Cheap worker 1

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

- skills/common/common-architecture-diagramming/scripts/render_drawio.py
- skills/common/common-architecture-diagramming/scripts/style_catalog.py
- skills/common/common-architecture-diagramming/scripts/check_layout.py
- skills/common/common-architecture-diagramming/scripts/render_erd.py
- skills/common/common-architecture-diagramming/scripts/validate_spec.py
- skills/common/common-architecture-diagramming/scripts/test_render_drawio.py
- skills/common/common-architecture-diagramming/scripts/test_check_layout.py
- skills/common/common-architecture-diagramming/scripts/test_fixtures.py
- skills/common/common-architecture-diagramming/assets/fixtures/context.drawio
- skills/common/common-architecture-diagramming/assets/fixtures/container.drawio
- skills/common/common-architecture-diagramming/assets/fixtures/component.drawio
- skills/common/common-architecture-diagramming/assets/fixtures/deployment.drawio
- skills/common/common-architecture-diagramming/assets/fixtures/dataflow.drawio
- skills/common/common-architecture-diagramming/assets/fixtures/sequence.drawio
- skills/common/common-architecture-diagramming/assets/fixtures/state.drawio
- skills/common/common-architecture-diagramming/assets/fixtures/erd.drawio
- skills/common/common-architecture-diagramming/references/diagram-spec.md
- skills/common/common-architecture-diagramming/references/layout-rules.md

## Acceptance criteria

- **AC-01**: Apply canonical PRD AC-01 and corresponding SRS contract in this task scope
- **AC-02**: Apply canonical PRD AC-02 and corresponding SRS contract in this task scope
- **AC-03**: Apply canonical PRD AC-03 and corresponding SRS contract in this task scope

## Verification

- cwd: /Users/nguyenhuyhoang/.paseo/worktrees/0vty4mn4/zealous-flamingo
  command: Parent runs focused Python/native checks and actual ingress smoke after all relevant owners freeze
  expected: Owned behavior passes; unavailable native/eval/human lanes explicit NOT RUN

## Required standards

- common-architecture-diagramming (skills/common/common-architecture-diagramming/SKILL.md, revision 0ea84fb78e9f46fc318e84c400d2674c771c39f350a31a24b20d65af8c0a9427)
- python-language (skills/python/python-language/SKILL.md, revision 930c3d23e0d1a1871555602eebb2e100d22363fb093f42e2b649f10823a489d8)

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

- artifacts/runs/system-design-visualization-improvements/worker-1-receipt.md

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

## Task 1 — Renderer themes geometry and focused baseline repair

**Scope / owned write set:** diagramming scripts render_drawio.py, style_catalog.py, check_layout.py, render_erd.py, validate_spec.py; existing corresponding Python tests; assets/fixtures root .drawio goldens only; references/diagram-spec.md and layout-rules.md.
**Inputs:** approved SRS LLD-001/SRS-001…003, PRD AC-01…03, existing baseline failure evidence and static delimiter diagnosis.
**Outputs:** complete compatible theme/geometry behavior and reviewed intended-serialization baseline repair; receipt of changes and limits.
**Real ingress:** existing renderer/validator CLI and render(spec) callers.
**Invariants:** preserve semantics/provenance/manual-edit and all eight types; deterministic per-render palette, no global mutation.
**Positive:** long/multiline labels reserve full geometry, both themes cover all paths; source intended semicolon tokens are valid.
**Negative:** no blind golden update, suppressed layout findings, invented components, raw spec markup or changed edge semantics.
**Verification owner:** parent integrator and independent Personal review profile; covering Python modules plus actual light/dark exports after freeze.
**Handoff / freeze:** report exact paths and freeze before shared commands; no mid-flight tests/build/lint/formatter.
**Correction route:** one focused correction with exact failed AC; quota exhaustion advances eligible configured route, no premium.
