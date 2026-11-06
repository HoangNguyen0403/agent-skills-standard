# Assignment packet: design-improvements-5

- Plan: /Users/nguyenhuyhoang/.paseo/worktrees/0vty4mn4/zealous-flamingo/artifacts/runs/system-design-visualization-improvements/execution-plan.md
- Plan SHA-256: 7460a2ffd4f1179fe90191ad465b880adc7a9319219474aa79fe03417142737b
- Task number: 5
- Project domain: Personal agent-skills-standard prj_24334e6778b1395c
- Workspace root: /Users/nguyenhuyhoang/.paseo/worktrees/0vty4mn4/zealous-flamingo

## Goal

Generic bounded trace-ID compatibility

## Owner

Personal - Cheap worker 5

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

- scripts/outcome/schema.ts
- scripts/outcome/schema.test.ts

## Acceptance criteria

- **AC-01**: Apply canonical PRD AC-01 and corresponding SRS contract in this task scope
- **AC-05**: Apply canonical PRD AC-05 and corresponding SRS contract in this task scope

## Verification

- cwd: /Users/nguyenhuyhoang/.paseo/worktrees/0vty4mn4/zealous-flamingo
  command: Parent runs focused Python/native checks and actual ingress smoke after all relevant owners freeze
  expected: Owned behavior passes; unavailable native/eval/human lanes explicit NOT RUN

## Required standards

- typescript-language (skills/typescript/typescript-language/SKILL.md, revision 5dbacb158389d8c88a1239324c10cf84cbb688f7ca88f3920671d25d71f91866)

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

- artifacts/runs/system-design-visualization-improvements/worker-5-receipt.md

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

## Task 5 — Bounded trace-ID compatibility

**Scope / owned write set:** scripts/outcome/schema.ts and schema.test.ts only; no unrelated enums/record fields/workflow files.
**Inputs:** SRS LLD-005/SRS-010 and existing rejection evidence; approved ID source preserved.
**Outputs:** generic optional single uppercase-alphanumeric namespace for BRD/REQ with >=3 digits; AC >=2 digits; existing numeric forms and SRS grammar retained.
**Real ingress:** validateRunRecord and exact required-scope outcome audit, existing callers.
**Invariants:** retain placeholder rejection, cost/workflow/scope checks and exact source IDs; no new alias/ID registry.
**Positive:** existing 20 IDs and legacy numeric forms accepted; focused malformed corpus rejected.
**Negative:** no slug special-case, silent normalization, empty trace arrays, weakened unrelated tests or install to hide missing tsx.
**Verification owner:** parent and independent reviewer; native tests only if dependencies available, otherwise honest source-derived checks and named blocked native lane.
**Handoff / freeze:** use code-intelligence references before exported contract edits when available; freeze source and report tests not run; no mid-flight checks.
**Correction route:** missing deps are prerequisite, not quota; no install without authorization; one bounded defect correction.
