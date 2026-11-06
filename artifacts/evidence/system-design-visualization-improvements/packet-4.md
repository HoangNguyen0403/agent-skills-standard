# Assignment packet: design-improvements-4

- Plan: /Users/nguyenhuyhoang/.paseo/worktrees/0vty4mn4/zealous-flamingo/artifacts/runs/system-design-visualization-improvements/execution-plan.md
- Plan SHA-256: 7460a2ffd4f1179fe90191ad465b880adc7a9319219474aa79fe03417142737b
- Task number: 4
- Project domain: Personal agent-skills-standard prj_24334e6778b1395c
- Workspace root: /Users/nguyenhuyhoang/.paseo/worktrees/0vty4mn4/zealous-flamingo

## Goal

Real scoped bounded-query fixture

## Owner

Personal - Cheap worker 4

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

- skills/database/database-query-performance/scripts/nplus1_smoke.py
- skills/database/database-query-performance/scripts/test_nplus1_smoke.py

## Acceptance criteria

- **AC-09**: Apply canonical PRD AC-09 and corresponding SRS contract in this task scope

## Verification

- cwd: /Users/nguyenhuyhoang/.paseo/worktrees/0vty4mn4/zealous-flamingo
  command: Parent runs focused Python/native checks and actual ingress smoke after all relevant owners freeze
  expected: Owned behavior passes; unavailable native/eval/human lanes explicit NOT RUN

## Required standards

- database-query-performance (skills/database/database-query-performance/SKILL.md, revision 2b036001cef94fdb62f61c6881fb243aedb8db1500e5504edee98f4a5a8ad78a)
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

- artifacts/runs/system-design-visualization-improvements/worker-4-receipt.md

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

## Task 4 — Real scoped N+1 fixture

**Scope / owned write set:** new skills/database/database-query-performance/scripts/nplus1_smoke.py and test_nplus1_smoke.py; no other database skill files.
**Inputs:** SRS LLD-004/SRS-009, PRD AC-09 and historical design query probe as feasibility only.
**Outputs:** runnable stdlib SQLite fixture with independent deterministic oracle, scoped parents/children, query counts/fingerprints/results/rows/bytes/timing and negative controls.
**Real ingress:** direct nplus1_smoke.py CLI exercising actual sqlite3 read entrypoint, not mocks/source assertions.
**Invariants:** in-memory synthetic data only, scoped parameterized queries, parent pagination and empty/varied children, bounded page/batch.
**Positive:** N=1/10/50 counts baseline 1+N vs candidate two for nonempty one-page relation, empty one; independent expected results and continuation/scope/aggregate controls.
**Negative:** baseline output is not sole oracle; no cross-scope cache, fabricated wire bytes, service startup, ORM/Postgres speed claims or silent partial success.
**Verification owner:** parent and independent review; actual CLI, focused unit and altered-query counterexample after freeze.
**Handoff / freeze:** return exact entrypoints/tests and freeze; do not run checks mid-flight or add duplicate prose.
**Correction route:** one focused AC correction; report actual prerequisite gap, no substitute fake execution.
