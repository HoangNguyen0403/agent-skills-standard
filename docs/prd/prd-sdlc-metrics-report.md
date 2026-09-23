# Product Requirements Document (PRD): SDLC Metrics Report

**Status**: Draft | **Owner**: HoangNguyen0403 | **Last Updated**: 2026-09-23

## 1. Purpose And Scope

- **Business Objective Ref**: BRD-OBJ-001 (see `docs/brd/brd-sdlc-metrics-report.md`)
- **Problem Statement**: `common-sdlc-metrics` SKILL.md defines a delivery-metrics report contract
  with no producer and no real requirement chain to validate the trace gate against. Maintainers
  cannot trust `pnpm audit:trace` as a merge gate until it has run against committed, non-fixture
  content, and the sibling producer initiative has no fixed IDs to report against.
- **Assumptions**: `scripts/trace/index.ts` and `scripts/outcome/schema.ts` behave exactly as
  shipped and unit-tested; this PRD's acceptance criteria treat both as an external oracle.
- **In Scope**: Requirement registry (REQ-001..003), user stories and ACs (AC-001..005), the
  SRS/FRS chain, and three `RunRecord` instances for the workflows that authored this chain.
- **Out of Scope**: The `artifacts/sdlc-metrics.md` producer script (separate initiative, same
  slug); any change to `docs/ops/bands.yaml`, `scripts/trace/*`, or `scripts/outcome/*`.

## 2. Goals And Guardrails

- **Primary Metric**: `pnpm audit:trace --slug sdlc-metrics-report --json` reports `"ok": true`
  with zero error-severity issues by 2026-09-23.
- **Secondary Metrics**: `node --import tsx scripts/outcome/index.ts --records --json` reports zero
  issues across the three committed run records; `pnpm audit:trace --strict --slug
  sdlc-metrics-report` reports the exact warn-severity issue count (target: zero, reported either
  way).
- **Guardrails**: No `RunRecord.cost` field may report a fabricated token/USD number; unmeasured
  cost must use `source: "unavailable"` with the token/USD fields omitted entirely, per
  `common-sdlc-metrics` §5 ("no metric without a source").

## 3. Personas, JTBD, And Use Cases

| Use Case ID | Persona         | Job / Goal | Scope Note |
| ----------- | --------------- | ---------- | ---------- |
| UC-001      | Repo maintainer (HoangNguyen0403) | Trust that `pnpm audit:trace` blocks a bad requirement chain, not just an empty repo | Limited to this slug's chain; does not cover other skills' docs |
| UC-002      | Sibling producer-script author | Report band breaches and DORA/per-stage indicators against fixed, committed IDs | Limited to reading this chain's ids; does not implement the producer itself |

## 4. Requirement Registry

| Req ID  | Requirement       | Persona | Priority | Owner   | Status              | BRD Objective Ref |
| ------- | ----------------- | ------- | -------- | ------- | ------------------- | ----------------- |
| REQ-001 | Emit `artifacts/sdlc-metrics.md` from committed artifacts and git history at a workflow terminal state. | Repo maintainer | P0 | HoangNguyen0403 | Draft | BRD-OBJ-001 |
| REQ-002 | Report an unavailable input as unavailable, with the reason — never estimated, never guessed. | Repo maintainer | P0 | HoangNguyen0403 | Draft | BRD-OBJ-001 |
| REQ-003 | Detect control-band breaches from `docs/ops/bands.yaml` and route each breach to an owner at its earned tier. | Repo maintainer | P1 | HoangNguyen0403 | Draft | BRD-OBJ-001 |

## 5. User Stories And ACs

_Strict format: As a [persona/role], I want to [Action], so that [Benefit]._

| Story ID | Linked Req ID | User Story                 | INVEST Check  | Status |
| -------- | ------------- | --------------------------- | ------------- | ------ |
| US-001   | REQ-001       | As the repo maintainer, I want the metrics report emitted from committed artifacts and git history, so that delivery flow is auditable without extra tooling. | I/N/V/E/S/T: independent of other reports, negotiable format, valuable to maintainers, estimable (schema exists), small (one report), testable (exit code + content) | Draft |
| US-002   | REQ-002       | As the repo maintainer, I want an unavailable input reported as unavailable with its reason, so that I never mistake a guess for a measurement. | I/N/V/E/S/T: same as above | Draft |
| US-003   | REQ-003       | As a band owner, I want a rolling-window breach routed to me at its earned tier, so that I respond before drift becomes an incident. | I/N/V/E/S/T: same as above | Draft |

| AC ID  | Linked Story ID | Scenario              | Given     | When     | Then                | Status |
| ------ | --------------- | --------------------- | --------- | -------- | ------------------- | ------ |
| AC-001 | US-002          | edge: empty repo | a repo with no run records | the producer runs | it exits 0 and every metric is reported unavailable with a stated reason | Draft |
| AC-002 | US-001          | happy path | committed artifacts and git history exist | the report is emitted | every value cites its source artifact path or commit range | Draft |
| AC-003 | US-001          | negative: no composite score | any input | the report is emitted | it contains no composite productivity score and no per-individual breakdown | Draft |
| AC-004 | US-003          | happy path | a band in `docs/ops/bands.yaml` whose rolling window is breached | the producer runs | the breach is reported with its tier and named owner | Draft |
| AC-005 | US-001          | edge: self-referential proof | this slug's committed BRD, PRD, and SRS | `pnpm audit:trace` runs | the slug reports zero error-severity issues and every AC is Covered | Draft |

## 6. Functional Behavior (FRS-lite)

- **Primary Flows**: Read `git log`, `artifacts/runs/<slug>/*.json`, `docs/srs/`, and
  `benchmarks/*/history.json` -> evaluate control bands against `docs/ops/bands.yaml` -> render
  `artifacts/sdlc-metrics.md` per `common-sdlc-metrics/references/metrics-schema.md`.
- **Alternate/Error Flows**: Any input source missing or empty -> that metric's row states
  `unavailable` plus the specific reason (e.g. "no run records under artifacts/runs/"); a band with
  no configured owner is itself a defect, not a silently-skipped breach.
- **Input/Output Boundaries**: Inputs are read-only (`git log`, committed JSON/YAML/Markdown);
  output is a single Markdown file, no side effects, no network calls, no inference spend.

## 7. Non-Functional Product Constraints

- **Performance**: Report generation reads only local git history and committed files; no
  externally-imposed latency budget (out of band with CI).
- **Security/Privacy**: No PII; `agent.identity` in run records names an identity/session, not a
  private individual.
- **Accessibility/Usability**: Plain Markdown output, readable in any git host or terminal.
- **Platform Support**: Repo-local Node/TypeScript (`node --import tsx`), no browser or mobile
  surface.

## 8. Analytics And Telemetry

- **Events**: None emitted by this initiative; run records themselves are the telemetry substrate
  the sibling producer will read.
- **Dashboards / Alerts**: Control-band breaches (REQ-003) are the alerting mechanism; no separate
  dashboard is in scope here.

## 9. Risks And Decisions

| Risk/Decision | Type                                           | Owner   | Status   | Rationale |
| ------------- | ---------------------------------------------- | ------- | -------- | --------- |
| Fixed AC-001..005 and SRS-001..004 IDs before the sibling producer initiative starts | Decision | HoangNguyen0403 | Approved | Both initiatives edit the same working tree concurrently; a shared, frozen ID contract is the only way to avoid ID collisions or renumbering churn |
| `RunRecord.cost.source` is always `"unavailable"` for this initiative's three records | Decision | HoangNguyen0403 | Approved | No host-measured token/cost telemetry exists for the sessions that produced this chain; fabricating a number violates REQ-002 and the SKILL.md "never estimate" rule |

## 10. Dependencies And Rollout

- **Dependencies**: Sibling initiative (same slug) building the `artifacts/sdlc-metrics.md`
  producer script; depends on this PRD's fixed IDs, not the reverse.
- **Release Strategy**: Documents merge directly (no feature flag; this is requirements content,
  not runtime code).
- **Ops / Support Readiness**: None required; no runtime behavior changes.
- **Success Metrics**: `pnpm audit:trace --slug sdlc-metrics-report` exits 0 with zero
  error-severity issues; `scripts/outcome/index.ts --records` validates the three committed run
  records with zero issues.

## 11. Traceability Links

- **SRS/FRS Doc**: `docs/srs/srs-sdlc-metrics-report.md`
- **Implementation Plan**: `docs/srs/srs-task-list-sdlc-metrics-report.md`
- **Verification Evidence**: `artifacts/runs/sdlc-metrics-report/`

### Requirement Trace

REQ-001, REQ-002, and REQ-003 each trace to BRD-OBJ-001 (see the last column of §4's Requirement
Registry). AC-001 through AC-005 each trace to exactly one of the three REQs above (see §5's
Linked Req ID column). The full four-level BRD -> REQ -> AC -> SRS matrix, including SRS ids and
verification evidence, is authoritative in `docs/srs/srs-sdlc-metrics-report.md` §2 to avoid
duplicating a single source of truth across two documents.

## 12. Change Log

| Date         | Author | Change         |
| ------------ | ------ | -------------- |
| 2026-09-23   | HoangNguyen0403 (agent-authored) | Initial PRD for `sdlc-metrics-report`: requirement registry, user stories, ACs, requirement trace |

## 13. Open Questions

- [ ] Should `RunRecord.cost.source` ever be backfilled to `"host"` once the runtime exposes real
      token/cost telemetry mid-session? Deferred to the sibling producer initiative.
