# Formal orphan coverage authority repair

Status: completed; owned delta frozen for parent verification and independent review.

## Root cause

`orphanIssues` treated every valid same-ID reference as formal coverage. In particular, a `source`-authority reference from a historical mapping column could suppress an orphan error for a separately declared formal requirement. This let historical traceability masquerade as formal downstream coverage.

## Change

- Formal-column references count as coverage.
- Source-column and qualified historical references do not.
- Untyped references count only when the matching ID resolves formally without a matching historical source declaration/family; ambiguous authority does not count.
- Added a parser-backed counterexample with a historical BRD candidate, a separate formal REQ heading, a distinct formal mapping target, and AC/SRS coverage. Expected issue: only `orphan-req` for the uncovered formal candidate; source mapping remains valid.

## Owned paths

- `scripts/trace/graph.ts`
- `scripts/trace/graph.test.ts`
- `artifacts/runs/system-design-visualization-improvements/trace-orphan-receipt.md`

## Verification and freeze

- Regression test added; execution intentionally **NOT RUN** under the packet's no-midflight-check restriction. Parent must run the stated trace suite and actual CLI audit on the frozen integrated state.
- Build, lint, and formatting checks: **NOT RUN**.
- No other owned or peer paths changed by this slice. Independent review remains required.
