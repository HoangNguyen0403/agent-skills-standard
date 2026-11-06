# Assignment packet: design-improvements-3

- Plan: /Users/nguyenhuyhoang/.paseo/worktrees/0vty4mn4/zealous-flamingo/artifacts/runs/system-design-visualization-improvements/execution-plan.md
- Plan SHA-256: 7460a2ffd4f1179fe90191ad465b880adc7a9319219474aa79fe03417142737b
- Task number: 3
- Project domain: Personal agent-skills-standard prj_24334e6778b1395c
- Workspace root: /Users/nguyenhuyhoang/.paseo/worktrees/0vty4mn4/zealous-flamingo

## Goal

Canonical N+1 guidance and held-out behavior cases

## Owner

Personal - Cheap worker 3

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

- skills/database/database-query-performance/SKILL.md
- skills/database/database-query-performance/references
- skills/database/database-query-performance/evals/evals.json
- skills/system-design/system-design-data-architecture/SKILL.md
- skills/system-design/system-design-data-architecture/references
- skills/system-design/system-design-data-architecture/evals/evals.json
- skills/system-design/system-design-review/SKILL.md
- skills/system-design/system-design-review/references
- skills/system-design/system-design-review/evals/evals.json
- benchmarks/evals/system-design-nplus1-heldout.json
- benchmarks/evals/system-design-nplus1-skills.txt

## Acceptance criteria

- **AC-07**: Apply canonical PRD AC-07 and corresponding SRS contract in this task scope
- **AC-08**: Apply canonical PRD AC-08 and corresponding SRS contract in this task scope

## Verification

- cwd: /Users/nguyenhuyhoang/.paseo/worktrees/0vty4mn4/zealous-flamingo
  command: Parent runs focused Python/native checks and actual ingress smoke after all relevant owners freeze
  expected: Owned behavior passes; unavailable native/eval/human lanes explicit NOT RUN

## Required standards

- database-query-performance (skills/database/database-query-performance/SKILL.md, revision 2b036001cef94fdb62f61c6881fb243aedb8db1500e5504edee98f4a5a8ad78a)
- system-design-review (skills/system-design/system-design-review/SKILL.md, revision 2ea78f997d334582f75f3694337e06aad98f460917ce5111e93bf89c4dc9b8fa)

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

- artifacts/runs/system-design-visualization-improvements/worker-3-receipt.md

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

## Task 3 — N+1 canonical guidance and held-out cases

**Scope / owned write set:** skills/database/database-query-performance/SKILL.md and references; system-design-data-architecture and system-design-review SKILL.md/references/evals; database-query-performance/evals/evals.json; new benchmarks/evals/system-design-nplus1-heldout.json and system-design-nplus1-skills.txt only.
**Inputs:** SRS LLD-003/SRS-007…008, PRD AC-07…08, existing ORM/communication guidance; no implementation editing to ORM catalog.
**Outputs:** concise canonical detection/remedy/evidence rules and reusable behavioral evaluation cases with negative controls.
**Real ingress:** system-design/review skill routing and normal source/design analysis, not a standalone duplicate skill.
**Invariants:** code-only suspected vs runtime observed; bounded loading preserves scope/results/page/cardinality; defer actual counts to trace evidence.
**Positive:** lazy loops/serializers/aggregates/GraphQL fan-out identified; remedies justified; already-batched and redundancy controls rejected.
**Negative:** no blanket giant JOIN, cache/index/concurrency-only fixes, duplicated framework recipes, keyword-only proof or live model run.
**Verification owner:** parent and independent reviewer; source case/schema checks and deterministic demonstrations after freeze, live efficacy explicitly NOT RUN.
**Handoff / freeze:** freeze and report exact edits, semantic expectations and limitations; no build/lint/tests/formatting or eval spend.
**Correction route:** parent integrates shared contracts; one focused quality correction then eligible fallback if needed.
