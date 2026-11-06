# Assignment packet: document-trace-alignment

- Plan: /Users/nguyenhuyhoang/.paseo/worktrees/0vty4mn4/zealous-flamingo/artifacts/runs/system-design-visualization-improvements/trace-alignment-plan.md
- Plan SHA-256: 67552a1e5e777605017fc5cdebe788542f078b0a82424a22f14cb58251a6571c
- Task number: 1
- Project domain: Personal agent-skills-standard prj_24334e6778b1395c
- Workspace root: /Users/nguyenhuyhoang/.paseo/worktrees/0vty4mn4/zealous-flamingo

## Goal

Align formal document trace IDs while preserving historical mappings

## Owner

Personal - Cheap trace compatibility owner

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

- scripts/trace/types.ts
- scripts/trace/parse.ts
- scripts/trace/graph.ts
- scripts/trace/index.ts
- scripts/trace/parse.test.ts
- scripts/trace/graph.test.ts
- scripts/trace/index.test.ts

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
- docs/srs/srs-system-design-visualization-improvements.md (SHA-256 46b35a78b9d69ce2266e50021623fa1f6273a4286e2c2adfa1c751aefe7d6cad)
- docs/adr/adr-system-design-visualization-improvements.md (SHA-256 23715f039a099e62b4b411d100539442843370b4a655ce0d0db663f74e423f54)

## Source revision

- 52671cf9ed6a1c376dfaaae7e621dbc51a4c8765

## Dirty identity

- d8876d7c0286d34d2e17860c8a161a678c970123129a3c9faa0351cb5901ba2f

## Dependencies

- None declared (explicit empty list).

## Output contract: receipt destination

- artifacts/runs/system-design-visualization-improvements/trace-alignment-receipt.md

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

## Task 1 — Align formal document trace identifiers with approved generic grammar

**Scope / owned write set:** scripts/trace/types.ts, parse.ts, graph.ts and their existing focused .test.ts files; index.ts/index.test.ts only if real exact-scope consumer behavior requires it. No outcome/schema, approved source IDs or unrelated workflow changes.
**Inputs:** actual adapted-loader scripts/trace/index.ts --slug system-design-visualization-improvements --required --json exits1: no formalREQ/AC and malformedAC01 because grammar differs. Approved SRS LLD005 outcome grammar and explicit latest user extension. Canonical PRD unchanged.
**Outputs:** document parser accepts same formal IDs; required scope recognizes actual declarations and links; existing numeric grammar and historical source-group mappings remain supported.
**Real ingress:** existing parseRepo/buildTraceGraph and scripts/trace/index.ts exact --slug --required audit, not a new alias registry.
**Invariants:** formal BRD-OBJ/REQ optional one uppercase-alphanumeric namespace with >=3digits, AC>=2digits numeric, SRS>=3digits numeric. Historical multi-namespace/source-group mapping semantics preserved; explicit source mappings remain evidence rather than automatically satisfying required formal scope. Reject lowercase/multi-namespace formalIDs/shortnumbers/placeholders/wildcards; no sourceID migration or emptytrace waiver.
**Positive:** approved qualifiedVIS/PERF objectives/requirements and AC01-09 are actual formal declarations in selected slug, genericA1/B2 supported, existing numeric IDs unchanged; focused positive/negative real parse/graph/requiredscope cases.
**Negative:** do not silence undeclared/unmapped/dangling links, weaken empty/no-scope failure or reclassify explicitly historical source fields as formal merely because grammar overlaps. If code reveals ambiguity not resolvable from explicit source/formal column context, return precise evidence and decision need before editing that branch.
**Verification owner:** parent runs actual unchanged trace test modules and exact scoped audit via existing Node26 adapted-loader; missingnative tsx remains labeled separately. Independent Personal reviewer checks cumulative changed scope. No worker suites/build/lint/formatters mid-flight.
**Handoff / freeze:** freeze owned files and report exact paths, real consumer impact, tests NOT RUN and trace-alignment-receipt.md. No installs/commits/delegation/liveeval/publication.
**Correction route:** one focused AC correction then configured eligible fallback; actual quota uses authorized chain, no premium. Preserve unrelated changes and existing tests that protect behavior; remove incidental wording/sourcepins rather than repin.
