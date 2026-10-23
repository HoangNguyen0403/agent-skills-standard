# Task 3 report — required skill content delivery

Status: **GREEN implemented, verification pending** (orchestrator requested no local checks/tests). Task 1 `mcp/src/server.ts` settlement consumed; no server edits made.
Owner: MCP delivery. Account domain: Personal. Implementation approval: SRS D1–D5 (approved 2026-10-23).

## RED evidence (observed by orchestrator)

Repeated-body stubs, stale edited body, `force_reload` schema exposure, missing structured `selected`/`bodyDigests`; plus the incidental server-instructions wording failure.

## Production changes

`mcp/src/services/SessionTracker.ts`
- `LoadEvent`: removed `dedupedSkills` / `estimatedTokensSaved`; added `selected?: string[]` (matched IDs even when unreadable) and `bodyDigests?: Record<string, string>` (SHA-256 of each raw body actually returned). `loaded` now strictly means bodies returned.
- `SkillContextCost`: removed `dedupedSkillCount` / `estimatedTokensSaved`; added `bodyReturnCount` (repeats counted, skill keys only).
- Added `selectedSkills()`, `bodyDigests()`, and private `isSkillKey` / `uniqueSkillKeys`; `loadedSkills()` remains unique returned bodies. `summary()` unchanged in shape.

`mcp/src/tools/index.ts`
- `loadSkillsForFilesSchema` / `loadSkillsForKeywordsSchema`: `force_reload` removed; function args narrowed to `{ files }` / `{ keywords }`.
- `finalize()`: no session suppression, no stub. Every matched body is read and rendered at request time; `selected`, `loaded`, `bodyDigests`, `estimatedTokens` recorded. Read failure keeps the existing safe `### ERROR: Could not read skill content for <id>` block and is excluded from `loaded` and digests. `dedupStub()` and the `forceReload` parameter deleted.
- `getSkill()`: records `selected` on miss/failure and `loaded` + digest + token estimate on success, so direct lookups participate in the same evidence accounting.
- `formatConsultationEvent()`: reports returned bodies plus `selected but body not returned` instead of stub/omission text.
- `auditSessionCompliance()`: adds unique selection count, total/unique body-return counts, and a SHA-256 body-digest section; keeps the session-scoped disclaimer (not acknowledgment/enforcement).
- `getSessionCost()`: dedup-savings rows replaced with unique-selection and total body-return counts; no savings claim remains.

Expected behavior after GREEN: repeated file/keyword lookups and parent→sibling HTTP requests return full current bodies; edited SKILL.md is re-read; unreadable bodies stay out of returned/digest evidence; public schemas expose only `files` / `keywords`.

## Test changes

- `mcp/test/skill-delivery.spec.ts`: real SDK in-memory and shared-HTTP regressions for repeated file/keyword delivery, sibling delivery, current revision, unreadable-body exclusion, schema shape, and structured `selected`/`loaded`/`bodyDigests` accounting against tracker APIs. No report-heading or digest-typography assertions.
- `mcp/test/Tools.spec.ts`: removed the obsolete dedup-stub / `force_reload` / dedup-savings tests and the entire incidental `server — instructions & best practices` wording block.

Command for verification when authorized:

```
rtk pnpm --filter ./mcp test test/Tools.spec.ts test/http-transport.spec.ts test/skill-delivery.spec.ts
```

## Observed GREEN and final test settlement

Orchestrator observed targeted MCP GREEN 50/51; the single failure was `mcp/test/Tools.spec.ts` → `renders agent-estimate provenance with real numbers when tokens are hand-supplied`, which supplied `reasoningTokens` + `reasoningCostPer1M` without `reasoningBilling` and pinned the old `USD 8.500000` / prose rows.

That entire wording/implementation-pin block was deleted (no re-pin to new billing defaults). WorkflowTelemetry's actual included/separate/ambiguous behavior remains covered by its 39 GREEN tests. No new duplicate/wiring test added. No production edits after the Task 4 handoff; `mcp/src/tools/index.ts` was not touched.

## Independent review fix

Review MAJOR: `getSkill()`'s `!skill` branch recorded `selected: [skillKey]` for a request with no indexed match.

- `mcp/src/tools/index.ts:246-251`: miss now records `input: [requested id]`, `selected: []`, `loaded: []`.
- Indexed-but-unreadable branch unchanged: `selected: [canonicalKey]`, `loaded: []`, no digest.
- Added structured regression in `mcp/test/skill-delivery.spec.ts`: real `get_skill` call for a missing `rust/whatever` asserts one tracker event with requested input, empty `selected`, empty `loaded`. No report-wording assertions.

Remaining D1 review findings: none. Source settled; parent can run the focused gate and close review.

## Cross-owned / follow-up

- **Task 7 shared API (done here in owned file)**: `get_session_cost` schema and args now accept optional `reasoningBilling: "separate" | "included-in-output"` with no default. Documented semantics: required when both `reasoningTokens` and `reasoningCostPer1M` are supplied; if omitted while billing is ambiguous, provenance must fall back to `unavailable` and `missingHostFields` must include `reasoningBilling` (never a `separate` default). The whole args object is passed unchanged to `summarizeSessionCostCoverage(args)`; Task 7 owns the normalization in `WorkflowTelemetry.ts`.
- `mcp/test/TelemetryWriter.spec.ts`: removed the obsolete `dedupedSkills` fixture field (Task 7 telemetry test). Counts were unaffected; Task 7 should avoid editing this file again.
- `scripts/skill-tests/product-evidence-integration/consumer-smoke.mjs`: the three live `force_reload: true` arguments (keyword qualified, keyword bare, file load) removed; behavioral assertions unchanged. No live source caller of `force_reload` remains outside the schema-removal regression's test name.
- Billing schema coordination arrives from Task 7; `WorkflowTelemetry.ts` / `SessionJournal.ts` untouched.
- **Handoff**: `mcp/src/tools/index.ts` is settled for Task 3 and released for Task 4 workflow-lookup edits. Final Task 3-owned files: `mcp/src/tools/index.ts`, `mcp/src/services/SessionTracker.ts`, `mcp/test/skill-delivery.spec.ts`, `mcp/test/Tools.spec.ts`, `mcp/test/TelemetryWriter.spec.ts` (fixture line only), `scripts/skill-tests/product-evidence-integration/consumer-smoke.mjs`, and this report.
- `CHANGELOG.md:1137`, SRS/PRD/artifacts references remain historical evidence and were not rewritten.

## Non-goals honored

No workflow lookup edits (Task 4), no journal/telemetry sources (Task 7), no `SkillIndex` routing (Task 6), no packet/policy/export/generated-mirror/root-changelog changes, no auth or approval-config changes, no checks/tests/build/lint/formatters, no commits.
