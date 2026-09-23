# Software Requirements Specification (SRS): SDLC Metrics Report

**Status**: Draft | **Owner**: HoangNguyen0403 | **Last Updated**: 2026-09-23

## 1. Context And Trace Source

- BRD objective links: BRD-OBJ-001
- PRD links: REQ-001, REQ-002, REQ-003
- AC links: AC-001, AC-002, AC-003, AC-004, AC-005
- Scope statement: This SRS specifies the CLI contract, input readers, control-band evaluation, and
  output structure for the `artifacts/sdlc-metrics.md` producer described in
  `common-sdlc-metrics/SKILL.md`, and defines the verification lane that proves the requirement
  trace gate (`pnpm audit:trace`) audits this chain correctly (AC-005).

## 2. Requirement Trace

| BRD Objective | PRD Req | AC | SRS | Verification |
| --- | --- | --- | --- | --- |
| BRD-OBJ-001 | REQ-001 | AC-002 | SRS-002 | `node --import tsx scripts/trace/index.ts --slug sdlc-metrics-report --json`; input-reader coverage confirmed by AC-002's "cites its source" requirement |
| BRD-OBJ-001 | REQ-001 | AC-003 | SRS-004 | Manual review of `artifacts/sdlc-metrics.md` against `common-sdlc-metrics/references/metrics-schema.md`: no composite score, no per-individual row |
| BRD-OBJ-001 | REQ-001 | AC-005 | SRS-004 | `node --import tsx scripts/trace/index.ts --slug sdlc-metrics-report --json` exit 0, zero error-severity issues, every AC id in the coverage table marked Covered |
| BRD-OBJ-001 | REQ-002 | AC-001 | SRS-001 | `node --import tsx scripts/trace/index.ts --slug sdlc-metrics-report --json` against a repo with no run records: exit 0, every metric row states `unavailable` plus a reason |
| BRD-OBJ-001 | REQ-003 | AC-004 | SRS-003 | Fixture run against `docs/ops/bands.yaml` with an injected rolling-window breach: breach row names its tier and owner |

## 3. Requirement Cards

### SRS-001: CLI contract

- **Statement**: The producer shall expose a CLI with deterministic subcommands, flags, an exit
  code of 0 on success (including the all-unavailable case) and 1 on a validation failure, and a
  `--json` output shape mirroring `scripts/trace/index.ts`'s `{ ok, slugs, issues }` convention.
- **Priority**: Must
- **Status**: Draft
- **Source**: REQ-001, REQ-002, AC-001
- **Input / Trigger**: Invocation at a workflow terminal state (CLI call, no interactive prompts).
- **Processing Rule**: Parse `--slug`, `--json`, and `--root` flags identically to
  `scripts/trace/index.ts`'s `flagValue` convention; never throw on a missing optional input.
- **Output**: Exit code plus either human-readable text or a JSON object, never both silently
  disagreeing.
- **Error / Fallback**: A missing required input source (e.g. no `artifacts/runs/<slug>/`) is not
  a crash — it is a reported `unavailable` metric row (see SRS-002).
- **NFR Impact**: None declared.
- **Measurement Method**: Run the CLI against a repo fixture with zero run records; assert exit
  code 0.
- **Verification Lane**: manual (this initiative defines the contract; the sibling producer
  initiative implements and unit-tests it).

### SRS-002: Input readers

- **Statement**: The producer shall read `git log`, `artifacts/runs/<slug>/*.json`, `docs/srs/`,
  and `benchmarks/*/history.json` as its only input sources, and shall attach the exact source path
  or commit range to every value it derives from them.
- **Priority**: Must
- **Status**: Draft
- **Source**: REQ-001, AC-002
- **Input / Trigger**: Same CLI invocation as SRS-001.
- **Processing Rule**: Every derived metric row carries a citation to the artifact path (e.g.
  `artifacts/runs/sdlc-metrics-report/2026...-plan-feature.json`) or a commit range (e.g. `git log
  <sha>..<sha>`); a value with no citation is a defect, not an omission.
- **Output**: One cited row per metric in `artifacts/sdlc-metrics.md`.
- **Error / Fallback**: A source directory that does not exist (e.g. no `artifacts/runs/<slug>/`)
  yields `unavailable` for every metric that depends on it, never a zero or an estimate.
- **NFR Impact**: None declared.
- **Measurement Method**: Diff the rendered report's citations against the actual file paths /
  commit ranges read.
- **Verification Lane**: manual, cross-checked against AC-002.

### SRS-003: Band evaluation

- **Statement**: The producer shall evaluate every band declared in `docs/ops/bands.yaml` against
  a rolling baseline window (never a fixed target) and shall report each breach with its tier and
  named owner.
- **Priority**: Must
- **Status**: Draft
- **Source**: REQ-003, AC-004
- **Input / Trigger**: Same CLI invocation as SRS-001; runs after input readers (SRS-002) have
  loaded the underlying counts.
- **Processing Rule**: A band definition with no owner is a configuration defect and must fail
  loud (surfaced as a `decision_needed` item), never a silently-skipped breach.
- **Output**: One breach row per fired band, citing the band id, its tier, and its owner.
- **Error / Fallback**: `docs/ops/bands.yaml` missing entirely -> report control-band evaluation as
  `unavailable`, reason "docs/ops/bands.yaml not found", never assume zero breaches.
- **NFR Impact**: None declared.
- **Measurement Method**: Fixture run with one band whose rolling window is deliberately breached;
  assert the breach row names the correct tier and owner.
- **Verification Lane**: manual, cross-checked against AC-004.

### SRS-004: Output document structure

- **Statement**: The producer shall render `artifacts/sdlc-metrics.md` conforming to
  `common-sdlc-metrics/references/metrics-schema.md`: DORA four, per-stage indicators, control-band
  breaches, trend-over-snapshot framing, and no composite productivity score or per-individual
  breakdown.
- **Priority**: Must
- **Status**: Draft
- **Source**: REQ-001, AC-003, AC-005
- **Input / Trigger**: Final step of the same CLI invocation, after SRS-002 and SRS-003 have
  produced their rows.
- **Processing Rule**: Reject (fail the render) any metric row that blends more than one indicator
  into a single number, or that attributes a value to a named individual rather than a flow stage.
- **Output**: `artifacts/sdlc-metrics.md`, one Markdown document, alongside
  `artifacts/session-cost.md`.
- **Error / Fallback**: None — this card only governs shape, not availability; availability is
  SRS-001/SRS-002's concern.
- **NFR Impact**: None declared.
- **Measurement Method**: Structural review of the rendered document's headings and rows against
  `metrics-schema.md`; this SRS card and its trace row are the same review `pnpm audit:trace`
  performs on this document (AC-005 is self-referential by design).
- **Verification Lane**: manual, plus `pnpm audit:trace --slug sdlc-metrics-report` for AC-005.

## 4. Functional Flows (FRS)

| Flow ID | Actor | Goal | Normal Course | Alternatives | Exceptions |
| --- | --- | --- | --- | --- | --- |
| FLOW-001 | Repo maintainer | Get a trustworthy delivery-metrics report | Invoke CLI -> read inputs (SRS-002) -> evaluate bands (SRS-003) -> render report (SRS-004) -> exit 0 | Any single input source empty: that metric alone reports `unavailable`, the rest still render | All input sources empty: entire report is `unavailable` rows, still exits 0 |

## 5. Interface Requirements

- API contracts: none — this is a local CLI, not a network service.
- Event contracts: none.
- Data contracts: `RunRecord` (schema_version 1, `scripts/outcome/schema.ts`) is the sole structured
  input contract; `docs/ops/bands.yaml` is the sole configuration contract (schema:
  `common-sdlc-metrics/references/bands-template.yaml`).
- External integration assumptions: `git` is available on PATH; no external network calls are made.

## 6. Non-Functional Requirements

| NFR ID | Category | Requirement | Threshold | Measurement Method | Verification |
| --- | --- | --- | --- | --- | --- |
| NFR-001 | Reliability | Producer must exit 0 when every input source is absent (fail-open on missing data, matching `scripts/trace/index.ts`'s own fail-open convention) | 0 crashes on empty-repo fixture | run against empty fixture | manual |
| NFR-002 | Auditability | Every rendered metric must carry a source citation or an `unavailable` reason | 100% of rendered rows cited | diff report rows against input sources | manual |

## 7. Security And Privacy Requirements

- AuthN/AuthZ: none — local read-only CLI, no credentials handled.
- Data classification and protection: `agent.identity` in run records names a session/agent
  identity, never a private individual; no PII is read or rendered.
- Audit logging and operational controls: the rendered report itself is the audit artifact; no
  additional logging pipeline is in scope.

## 8. Constraints And Compatibility

- Migration constraints: none — first version of this document set, `schema_version: 1`.
- Backward compatibility: any future `RunRecord` schema change must bump `schema_version` per
  `scripts/outcome/schema.ts`'s existing convention; out of scope for this initiative to alter.
- Compliance constraints: none beyond the "no per-individual breakdown" rule already captured in
  AC-003 / SRS-004.

## 9. Verification Matrix

| Requirement ID | Verification Lane | Evidence Artifact |
| --- | --- | --- |
| SRS-001 | manual | `node --import tsx scripts/trace/index.ts --slug sdlc-metrics-report --json` output (this initiative); CLI implementation itself is the sibling producer initiative's evidence |
| SRS-002 | manual | Citation review of `artifacts/sdlc-metrics.md` once the sibling producer emits it |
| SRS-003 | manual | Fixture run against `docs/ops/bands.yaml` with an injected breach |
| SRS-004 | manual + automated | `node --import tsx scripts/trace/index.ts --slug sdlc-metrics-report --json` (AC-005 self-proof) plus structural review against `metrics-schema.md` |
