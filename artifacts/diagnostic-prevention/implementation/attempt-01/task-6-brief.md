### Task 6: Truthful MCP telemetry and conditional price coverage (H05 reachable source)

**Files:** `mcp/src/services/SessionTracker.ts`, `TelemetryWriter.ts`, `WorkflowTelemetry.ts`, `mcp/src/tools/index.ts`, related `mcp/test/{Tools,TelemetryWriter,WorkflowTelemetry,SessionTracker}.spec.ts` only as needed.
**Inputs:** current source already distinguishes catalog discovery/body loads; don't redo historical fixed behavior. **Outputs:** explicit body/stub/estimate scope and truthful conditional cost completeness.
- [ ] Include direct skill body fetch estimates consistently; define body-return counters separate from dedup stub/selected IDs in persisted telemetry without breaking freshness readers. Migrate every repository consumer found for changed fields. Do not claim returned body was used by actor or authenticated host provenance from caller strings.
- [ ] Positive cached/reasoning usage requires corresponding rates before exact cost; missing rates remain partial/null, never implicit zero. Known zero buckets don't demand nonexistent rates. Preserve current numeric API with documented unknown if possible; no new accounting system.
- [ ] Tests: catalog list no bodies, direct fetch versus stub counts, absent body, cached/reasoning positive missing-rate partial, known zero, all-rates complete. Existing source tests may already pass; report baseline as existing, not a new fix.
- [ ] Document mounted MCP deployment identity unknown; no restart/reconfigure live service.
**Verification owner:** parent `rtk pnpm --filter ./mcp exec vitest run test/Tools.spec.ts test/TelemetryWriter.spec.ts test/WorkflowTelemetry.spec.ts`; actual SDK smoke on final build parent-owned. **Report:** task-6-report.md FINAL. **Correction route:** host ladder.

