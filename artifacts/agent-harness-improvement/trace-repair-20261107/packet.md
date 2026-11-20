# Assignment packet: harness-trace-identity-repair

- Plan: /Users/nguyenhuyhoang/.paseo/worktrees/0vty4mn4/flaky-turtle/artifacts/agent-harness-improvement/trace-repair-20261107/plan.md
- Plan SHA-256: d1996820566f2b6d13fe86be4a4405091871e22600e224bdae18f37c01c15f59
- Task number: 1
- Project domain: personal-open-source-agent-skills-standard
- Workspace root: /Users/nguyenhuyhoang/.paseo/worktrees/0vty4mn4/flaky-turtle

## Goal

Promote existing numeric aliases into active document declarations without changing requirements or audit source

## Owner

Personal - Cheap bounded document owner

## Authority: allowed operations

- Edit only current documents and external migration mapping within Task 1

## Authority: forbidden actions

- Change requirement meaning, historical artifacts, preimages, audit source, runtime or approvals; spawn agents; commit

## Authority: required approvals

- Operator Do next step authorizes bounded previously proposed trace repair; existing Subagent-Driven choice retained

## Global invariants

- Preserve immutable preimages and A/B artifacts; unchanged observable requirement wording, owners, gates and acceptance limits

## Non-goals

- No runtime C/D, source/parser changes, installs, commits, private data, premium calls or delegation

## Owned paths

- docs/brd/brd-agent-harness-improvement.md
- docs/prd/prd-agent-harness-improvement.md
- docs/srs/srs-agent-harness-improvement.md
- docs/srs/srs-walkthrough-agent-harness-improvement.md
- docs/validation/readiness-agent-harness-improvement.md
- artifacts/agent-harness-improvement/trace-repair-20261107/identity-mapping.md

## Acceptance criteria

- **trace-identity-repair**: One-to-one old-to-current mapping, unique numeric declarations, coherent current references, old bytes/digests/approval scope preserved, required trace audit passes without changing auditor

## Verification

- cwd: .
  command: Parent calls unchanged scripts/trace/index.ts run with --slug agent-harness-improvement --required --json; independent reviewer compares current docs with frozen preimages
  expected: No document trace issues and no semantic/authority change

## Required standards

- product-management/product-business-requirements (skills/product-management/product-business-requirements/SKILL.md, revision c68d063cb8fae1a54784366279a219611958036fc9bcaa093f59efd051c2d477)
- product-management/product-requirements (skills/product-management/product-requirements/SKILL.md, revision 600f1fb1db415b350f32ee130b2560771fbaaaadc79138aa7a6264e33bb2f1d2)
- common/common-software-requirements (skills/common/common-software-requirements/SKILL.md, revision 4d01d80e9d0d20581d954fac6e10f0d0048e065738446bcf93a83ca9ce9011cc)

## Source files

- docs/prd/prd-agent-harness-improvement.md (SHA-256 62e784bf8b02be5e58f8e695ece45dbd939c3521526ab59ef0591c8ef29bd868)
- docs/srs/srs-agent-harness-improvement.md (SHA-256 1397437e7b2a547b5218ae0a3b12d0a6c29ce5277d201f7be09203461528d3d7)

## Source revision

- d1957d0a121ba386a704eb12130288e8ab675f3c

## Dirty identity

- five-preimage-documents-plus-existing-immutable-ab-evidence

## Dependencies

- None declared (explicit empty list).

## Output contract: receipt destination

- artifacts/agent-harness-improvement/trace-repair-20261107/identity-mapping.md

## Output contract: status vocabulary

- FINAL
- NEEDS_CONTEXT

## Output contract: stop conditions

- Need for behavioral change, new authority, private data or parser change

## Limits

- status: advisory
- scope: One bounded document correction; no exact host monetary limit exposed

## Selected task text

### Task 1: Normalize current document identities while preserving history

**Scope / owned write set:** docs/brd/brd-agent-harness-improvement.md; docs/prd/prd-agent-harness-improvement.md; docs/srs/srs-agent-harness-improvement.md; docs/srs/srs-walkthrough-agent-harness-improvement.md; docs/validation/readiness-agent-harness-improvement.md; artifacts/agent-harness-improvement/trace-repair-20261107/identity-mapping.md only. Never modify preimage/, plan, packet, existing A/B artifacts, run records, scripts, policies or other sources.
**Inputs:** frozen preimage documents in this directory; current corresponding documents; scripts/trace/types.ts, parse.ts and graph.ts read-only; existing aliases in the PRD. Read exact standards from packet before writing.
**Outputs:** coherent current requirement documents and one mapping/change receipt linking immutable old documents, their SHA-256 digests and the current replacements. All observable wording, approval scope and live evidence limits remain unchanged. Declare BRD-OBJ-001 once, REQ-001 once, AC-001 through AC-006 once; SRS-001 through SRS-006 remain unchanged. Promote the already existing numeric aliases; do not invent requirements. Map historical BRD-HAR-01 -> BRD-OBJ-001, REQ-HAR-01 -> REQ-001, AC-HAR-01..06 -> AC-001..006 explicitly in identity-mapping.md outside scanner scope. Remove obsolete serialization-only columns/prose from the current canonical PRD, without changing criterion bodies. The current BRD acceptance table is upstream reference-only (e.g. cell “Criterion AC-001”, non-ID header) rather than a duplicate declaration; PRD tables own formal REQ/AC declarations. Ensure the BRD objective has a parser-recognized declaration (e.g. standalone **Objective ID**: BRD-OBJ-001). Current SRS/walkthrough/readiness use the promoted IDs and explain editorial migration via mapping link. Historical digest claims must point to preimage bytes, not mutable current links; keep historical approval history and source digests honest. No new behavioral approval or full-baseline acceptance is implied.
**Real Ingress:** unchanged scripts/trace/index.ts run(['--slug','agent-harness-improvement','--required','--json']); current docs/{brd,prd,srs} only. Prior exit-1 trace failure is retained in ../ab-20261106/trace-audit.md; do not rerun it as a before-check. Existing outcome consumer is separately exercised by parent.
**Invariants:**
- Positive: exact one-to-one legacy-to-current mapping, immutable preimages/digests, current references consistent and unchanged criterion text/owner/verification lanes. Prior A/B acceptance remains bound to old bytes and is bridged only editorially.
- Negative: no scanner bypass via fences around live requirements, no parser changes, no renaming SRS cards, no gate removal or C/D evidence/authority promotion. Historical IDs stay readable in the external mapping and snapshots, not malformed active references in scanned documents.
**Verification owner:** parent runs required trace/outcome audits once after worker freezes changes; independent reviewer compares each owned current document to corresponding preimage and confirms semantics/gates unchanged. Worker skips builds/tests/lint/formatters/audits mid-flight; return exact suggested consumer commands and visible limitations.
**Handoff / freeze:** return FINAL, changed paths, exact changes, source/digest limitations and AC assessment; stop writing. No commits or delegation. Parent owns any later correction and verification receipts.
**Correction route:** one concrete corrective follow-up for AC failure; quota follows eligible implementation ladder. Material semantic/design decision returns NEEDS_CONTEXT while continuing independent safe work.

- [ ] Preserve old approved bytes and map all eight identities explicitly.
- [ ] Normalize current declarations/references without behavioral changes or parser work.
- [ ] Freeze for independent diff review and real consumer verification.
