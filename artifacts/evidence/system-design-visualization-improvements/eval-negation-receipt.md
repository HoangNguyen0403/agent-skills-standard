# Eval negation correction — receipt

Packet: `artifacts/runs/system-design-visualization-improvements/eval-negation-packet.md`
Scope: remove the two remaining denial-unsafe literal `not_contains` bans flagged by integrated reviewer `4811d741` (snapshot `.agent/sdd/execution-plan/review-52671cf9e-workspace-53a1c6a20895-11a187f0b713.diff`, base `52671cf9ed6a1c376dfaaae7e621dbc51a4c8765`).

## Removed assertions (exactly two)

1. `skills/database/database-query-performance/evals/evals.json`, case `id: 2` (Redis-vs-giant-JOIN pagination-amplification case):
```json
{
  "type": "not_contains",
  "value": "just add Redis",
  "description": "Rejects cache-first recommendation for unoptimized query amplification"
}
```
Rejected `"Do not just add Redis; fix the suspected amplification with bounded batching…"` because `scripts/evals/scorer.ts:193-194` lowercases the transcript and does a literal `includes` — negation is invisible to the matcher.

2. `skills/system-design/system-design-data-architecture/evals/evals.json`, case `id: 16` (multi-tenant GraphQL resolver amplification case):
```json
{ "type": "not_contains", "value": "just shard the database", "description": "Rejects blind sharding" }
```
Same failure class: rejected `"Do not just shard the database…"`.

## Owned files (only these)

- `skills/database/database-query-performance/evals/evals.json` — case 2 assertions 4 → 3
- `skills/system-design/system-design-data-architecture/evals/evals.json` — case 16 assertions 4 → 3
- `artifacts/runs/system-design-visualization-improvements/eval-negation-receipt.md` (this file)

No renderer/exporter/trace/guidance-prose changes; scorer, manifest, prior "universal fix" ban removal untouched. No commits, installs, model calls, or scorer redesign.

## Preserved

- All cases: database `[1,2,3]`, data architecture `[1..16]` — no case deleted.
- Positive lexical smoke assertions intact, including the rejection-shaping `contains_any` rows (`"pagination" | "LIMIT" | "row multiplication" | "Cartesian"`, `"batch" | "GROUP BY" | "aggregate" | "push down"`; `"premature" | "scaling order" | "before" | "caching"`).
- `expected_output` prose, manual semantic rubric judgement of recommendation-vs-rejection, and held-out negative controls (`should_not_trigger`: 4 database rows, 8 data-architecture rows; `should_trigger`: 3 and 6) unchanged.
- No replacement forbidden wording introduced; no `not_contains` assertion remains in either file.

## Verification executed

- `python3 -m json.tool` on both files: valid JSON, exit 0.
- Structural read-back: case IDs and assertion counts as above; zero `not_contains` in either file.
- Deterministic scorer run: **NOT RUN** — prerequisite absent. This checkout has no `node_modules` at root or in any workspace package (`cli/`, `scripts/`, `mcp/`, …) and no `tsx` binary on PATH, so `node --import tsx scripts/evals/scorer.ts` cannot load. Installing dependencies is out of scope per packet. Semantics of the failure were established by source inspection of `scripts/evals/scorer.ts:185-194`, not by execution. Parent runs the actual scorer check after freeze.

## Freeze receipt

Freeze state: NOT RUN (no test/build/lint/formatter executed mid-flight, per packet).
Live eval / model execution: NOT RUN. No efficacy or acceptance claim made; judgment remains with existing manual semantic rubric and held-out negative controls pending independent integrated source re-review.
