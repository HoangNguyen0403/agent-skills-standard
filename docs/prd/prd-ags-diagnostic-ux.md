# Feature Plan: Improve AGS Diagnostics Display, Navigation, and Reading Efficiency

Status: Approved; approval: approved(requesting operator, 2026-11-11); execution: Subagent-Driven (A); source brief: [brd-ags-diagnostic-ux.md](../brd/brd-ags-diagnostic-ux.md) (`approved(requesting operator, 2026-11-11)`, `sha256: eb1f4b2eca9d405de5002cb2fe8e4137d49eca9d7703eaff29e8453316efe49c`)
operator_profile: hybrid; lane: both
SNC: S=1 N=1 C=1 total=3 tier=medium; model_tier: standard; delivery_mode: standard
Product/validation owner: requesting operator. Engineering owner: retrospective view implementer(s). QA/review owner: independent reviewer. Merge/release authority: requesting operator only.

## Decision Brief

- **Changes since approved revision:** Elaborated approved Option 1 (static-first zero-JS HTML/CSS overhaul) into canonical `REQ-*` / `AC-*` contracts and vertical slices; identified existing `mcp/test/retrospective-report-html.spec.ts:2382-2484` assertions that currently pin all 11 `<details>` sections closed and exact `<summary>` markup (will require contract test updates when smart auto-expand and section `#id` anchors are added).
- **Recommendation:** Implement Option 1 in two independent vertical slices (`index.html` layout/prioritization in `index-report.ts` and `report.html` navigation/auto-expand/cross-links in `report-html.ts` + `trend.ts` + `run.ts`), followed by docs parity and browser visual verification on a synthetic store fixture, then independent review.
- **Approval sought:** Approved (`requesting operator`, `2026-11-11`) with Subagent-Driven execution (Option A). Confers repository implementation and local verification only — no merge, release, spend, or runtime activation authority.
- **Evidence and limitations:** `confirmed(mcp/src/retrospective/index-report.ts)`, `confirmed(mcp/src/retrospective/views/report-html.ts)`, `confirmed(mcp/src/retrospective/trend.ts)`, `confirmed(mcp/src/retrospective/run.ts)`, `confirmed(mcp/test/retrospective-index.spec.ts)`, `confirmed(mcp/test/retrospective-report-html.spec.ts)`, `confirmed(docs/session-retrospective.md)`, and user screenshot. Multi-session reading time baseline remains `unknown` (`measure first`).
- **Unresolved decision:** None blocking PRD drafting. Optional index-row pure-CSS `:checked` filter vs badge-only visual prioritization and exact `indexHref` omission when rendered outside store layout are specified below with safe defaults; operator approves this plan + execution mode (`Subagent-Driven` vs `Inline`) before code starts.
- **Approval sought:** Approve this PRD (`REQ-001..REQ-006`, `AC-001..AC-008`), slice decomposition, and execution mode. Approval grants repository implementation planning only — no merge, release, spend, or runtime activation authority.
- **Independently ready slices:** Slice A (`index.html` UI/UX & prioritization) and Slice B (`report.html` navigation, smart auto-expand & cross-links) have disjoint file ownership and run concurrently once approved.

## Outcome And Guardrails

- **Outcome:** Operators opening `~/ags/diagnostics/index.html` or any session `report.html` can scan tables cleanly without mid-token wraps, distinguish `ACT` vs `WATCH` issues immediately, jump straight to relevant sections or back to `index.html` / prior reports, and see flagged root-cause details expanded on open.
- **Guardrails:**
  - Preserve strict CSP `default-src 'none'; style-src 'unsafe-inline'` with zero `<script>`, zero external URLs (`http(s)://`), and full HTML escaping (`escapeHtml`) on all dynamic/untrusted metadata (`label`, `folder`, `branch`, redacted commands).
  - Preserve `0600` owner-only permissions, relative-path traversal safety (no `..` escape outside store root; no raw filesystem paths exposed in HTML), and unchanged `ledger.json` / `summary.md` schemas.
  - Standard document depth (`delivery_mode: standard`) applies: Option 1 introduces no new API, storage schema, or CSP relaxation.

## Scope And Non-Goals

- **Scope fence:** Approved BRD-lite `docs/brd/brd-ags-diagnostic-ux.md` (Option 1).
- **Capability inventory (in scope):**
  - *Lay out* readable `index.html` and `report.html` tables/cards without breaking dates, currency, or counts mid-value → `REQ-001` (`in_scope`).
  - *Prioritize & filter* `ACT` vs `WATCH` findings in `index.html` (`Recurring problems` and session rows) using zero-JS HTML/CSS → `REQ-002` (`in_scope`).
  - *Jump* directly to `report.html` sections via an in-page anchor bar/TOC with status counts and `:target` highlight → `REQ-003` (`in_scope`).
  - *Auto-expand* `report.html` detail sections backing active `ACT` findings, permission denials, or error stops while keeping clean/secondary sections collapsed → `REQ-004` (`in_scope`).
  - *Navigate* bidirectionally between `index.html` and `report.html` and across compared trend reports using safe relative `href`s → `REQ-005` (`in_scope`).
  - *Maintain* CSP/XSS/path-safety invariants and update retrospective documentation + visual verification proof → `REQ-006` (`in_scope`).
- **Non-goals (excluded):** Client-side `<script>` / CSP relaxation (Option 2), loopback HTTP server (`ags retrospective serve`, Option 3), new session-parsing rules, `ledger.json` schema or consent-version changes, external fonts/CDNs/analytics.

## Requirements And Acceptance Criteria

| Req ID | Requirement | Owner | Priority | Status | BRD objective |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Render `index.html` and `report.html` tables and cards with responsive overflow containers and `nowrap` protection on dates, currency, counts, and action links so tokens do not split awkwardly at desktop width. | Slice A & B Engineers | P0 | Implemented (Slice D review waived) | BRD-OBJ-001 |
| REQ-002 | Visually separate and prioritize `ACT` vs `WATCH` items in `index.html` (`Recurring problems` and session rows) and provide zero-JS CSS focus/filter affordances without mixing `0 ACT` rules as urgent failures. | Slice A Engineer | P0 | Implemented (Slice D review waived) | BRD-OBJ-001 |
| REQ-003 | Provide a top intra-page section navigation bar (TOC with `#sec-*` anchors and key status pills/counts) and `:target` visual highlight in `report.html`. | Slice B Engineer | P0 | Implemented (Slice D review waived) | BRD-OBJ-001 |
| REQ-004 | Auto-open (`<details open>`) `report.html` detail sections directly supporting active `ACT` improvements, permission denials, or error stops while keeping unflagged/secondary sections (`Outcome`, `Limits`, `For the maintainer`, etc. unless flagged) collapsed by default. | Slice B Engineer | P0 | Implemented (Slice D review waived) | BRD-OBJ-001 |
| REQ-005 | Add safe relative back-navigation from `report.html` to `index.html` when rendered in store context, and relative links from `Compared with earlier reports` headers to prior `report.html` files when resolvable inside the store root. | Slice B Engineer | P0 | Implemented (Slice D review waived) | BRD-OBJ-001 |
| REQ-006 | Preserve strict CSP (`default-src 'none'; style-src 'unsafe-inline'`), zero `<script>`, zero external URLs, full HTML escaping, and update `docs/session-retrospective.md` and `docs/session-retrospective-privacy.md` with visual browser verification on synthetic fixtures. | Slice A, B, C Engineers | P0 | Implemented (Slice D review waived) | BRD-OBJ-001 |

| AC ID | Req ID | Given | When | Then | Owner | Verification lane |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | An `IndexResult` containing sessions with long folder/branch/title strings alongside ISO dates, `$XX.XX est.` costs, and counts | `renderIndexHtml` generates `index.html` and is viewed at standard desktop width (e.g., 1280px) | Date, cost, ACT/WATCH/Denied counts, and Open action cells render on single lines without mid-token wrapping, and long text wraps/truncates inside responsive table wrappers without horizontal page overflow. | QA / Reviewer | Unit + browser visual check |
| AC-002 | REQ-002 | Matched sessions where some rules fired only at `watch` (`0` ACT sessions) and others fired at `act` (`>=1` ACT sessions) | `renderIndexHtml` renders `Recurring problems` and monthly session tables | `ACT` rules/sessions sort and badge visually distinct from `WATCH`-only rules (`0` ACT), and the footer CLI hint names `ags retrospective index` accurately. | QA / Reviewer | Unit test (`retrospective-index.spec.ts`) |
| AC-003 | REQ-003 | A `Ledger` with multiple populated report sections | `renderReportHtml` renders `report.html` | A top section-jump navigation bar lists available sections with key counts/status badges and working `#sec-*` anchor links targeting each `<details id="sec-...">` section. | QA / Reviewer | Unit + browser DOM check |
| AC-004 | REQ-004 | A `Ledger` containing `permissionRequests.denied > 0`, `errorStops > 0`, or an `act`-level `LedgerImprovement` (`guardrail-answers`, `cost-concentration`, `unguarded-edits`, `lookup-misses`, `human-intervention`, `agent-error-concentration`) vs a clean `Ledger` with zero denials, zero error stops, and zero `act` items | `renderReportHtml` renders `report.html` | Flagged root-cause sections render with `<details class="sec" id="..." open>`, while clean/unflagged sections and `Limits`/`For the maintainer` render collapsed (`<details class="sec" id="...">` without `open`). | QA / Reviewer | Unit test (`retrospective-report-html.spec.ts`) |
| AC-005 | REQ-005 | A report generated via `runRetrospective` inside a store root (`sessions/<token>/generations/<gen-id>/report.html`) with resolved `previous` trend reports | `renderReportHtml` renders `report.html` with `ReportContext` (`indexHref`, `previous[].reportHref`) | Header/nav includes a safe relative `← All sessions` link (`../../../../index.html`) without `..` escaping above store root, and trend column headers link via safe relative paths to each earlier generation's `report.html`; standalone calls without `indexHref` omit broken links. | QA / Reviewer | Unit + integration test (`run` / `trend` / `report-html`) |
| AC-006 | REQ-006 | Hostile/untrusted strings (`<script>`, `<img>`, quotes, `http://` links, `../` segments) in title, folder, branch, command text, and artifact IDs | `renderIndexHtml` and `renderReportHtml` execute | Output retains `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">`, contains zero `<script` tags, zero `http(s)://` URLs, and escapes all dynamic values. | QA / Reviewer | Unit security/XSS tests |
| AC-007 | REQ-006 | Updated `index-report.ts` and `report-html.ts` | Synthetic multi-session store fixture (never `~/ags/diagnostics`) is generated and opened in headless Chromium | Visual inspection confirms readable layout, working `index.html` → `report.html` → `index.html` and trend redirection, anchor jumping, and zero console/CSP errors. | Integration / QA | Browser visual check |
| AC-008 | REQ-006 | Updated `index.html` and `report.html` behavior | Slice C updates `docs/session-retrospective.md` and `docs/session-retrospective-privacy.md` | Documentation accurately describes layout, bidirectional relative links, section TOC, smart auto-expand rules, and preserved zero-JS CSP posture. | Independent Reviewer | Doc parity review |

### Smart Auto-Expand Truth Table (`AC-004` canonical rule)

| Section | Condition to render `<details open>` | Otherwise |
| --- | --- | --- |
| `Permission requests` | `denied > 0` OR `unanswered > 0` OR `guardrail-answers` improvement has `level === "act"` | Collapsed |
| `Error stops` | Total `errorStops > 0` OR `agent-error-concentration` improvement has `level === "act"` | Collapsed |
| `Tool failures` | Any tool row has `errors > 0` AND (`agent-error-concentration` `act` OR total tool failure rate noteworthy / `failed > 0` when `act` present) — *canonical threshold: `totalErrors > 0` and any `act` improvement, or dedicated `toolErrors > 0` if `act`* | Collapsed |
| `Cost and models` | `cost-concentration` improvement has `level === "act"` | Collapsed |
| `AGS lookups` | `unguarded-edits` or `lookup-misses` improvement has `level === "act"` | Collapsed |
| `Agents` | `agent-error-concentration` or `human-intervention` improvement has `level === "act"` | Collapsed |
| `Outcome`, `Timeline`, `Trend`, `Limits`, `For the maintainer` | Always collapsed by default (reachable in 1 click via top TOC) | Collapsed |

## Open Consequential Decisions

None blocking planning. Minor CSS tokens (exact `max-width` e.g. `1200px`, badge colors, truncation `max-width`, sticky TOC styling) are delegated to slice implementers provided `AC-001..AC-008` and existing responsive `@media` behavior hold.

## Status And Receipt

- `feature_status`: `requirements_ready` (inherited from approved BRD-lite; plan pending operator approval before implementation)
- Run record: `docs/prd/prd-ags-diagnostic-ux.md` (no separate `artifacts/runs/` file minted unless execution starts)

## References

- Approved brief: `docs/brd/brd-ags-diagnostic-ux.md` (`sha256: eb1f4b2eca9d405de5002cb2fe8e4137d49eca9d7703eaff29e8453316efe49c`)
- Source modules: `mcp/src/retrospective/index-report.ts`, `mcp/src/retrospective/views/report-html.ts`, `mcp/src/retrospective/trend.ts`, `mcp/src/retrospective/run.ts`, `mcp/src/retrospective/views/format.ts`
- `feature_status`: `approved_for_implementation` (PRD and Subagent-Driven execution approved by requesting operator on 2026-11-11)
- Run record: `docs/prd/prd-ags-diagnostic-ux.md` (no separate `artifacts/runs/` file minted)

## Implementation Plan, Task Slices And Verification Plan

| Slice | Sole owner / files | Contract & deliverable | Dependencies | Size / confidence / suggested tier |
| --- | --- | --- | --- | --- |
| **Slice A: `index.html` Display, Layout & Prioritization** | Slice A Engineer (`mcp/src/retrospective/index-report.ts`, `mcp/test/retrospective-index.spec.ts`) | `REQ-001`, `REQ-002`, `REQ-006` (`AC-001`, `AC-002`, `AC-006`): responsive overflow-safe table CSS (`index`-scoped `<style>` rules), `nowrap` on dates/money/counts/actions, `ACT` vs `WATCH` visual separation & sorting in `Recurring problems` + session badges, optional zero-JS CSS-only `ACT only` toggle, fix CLI hint (`ags retrospective index`), unit + XSS tests. | Plan approval | M / high / `standard` (`tier=medium`) |
| **Slice B: `report.html` Navigation, Smart Auto-Expand & Cross-Links** | Slice B Engineer (`mcp/src/retrospective/views/report-html.ts`, `mcp/src/retrospective/trend.ts`, `mcp/src/retrospective/run.ts`, `mcp/test/retrospective-report-html.spec.ts`, `mcp/test/retrospective-trend.spec.ts`) | `REQ-001`, `REQ-003`, `REQ-004`, `REQ-005`, `REQ-006` (`AC-001`, `AC-003`, `AC-004`, `AC-005`, `AC-006`): preserve `REPORT_CSS` backward compatibility for `index-report.ts`, add top section jump TOC (`#sec-*`), `:target` highlight, smart `<details open>` per truth table, `indexHref` back-link (`../../../../index.html` in `run.ts`), relative `reportHref` on `SessionRates` in `trend.ts`, responsive table wrappers, update collapsed-everywhere assertions in `retrospective-report-html.spec.ts`. | Plan approval | M / high / `standard` (`tier=medium`) |
| **Slice C: Docs Parity & Synthetic Browser Verification** | Integration / Docs Engineer (`docs/session-retrospective.md`, `docs/session-retrospective-privacy.md`) | `REQ-006` (`AC-007`, `AC-008`): update docs for new layout, navigation links, TOC, and smart auto-expand; generate synthetic multi-session store in `/tmp` (never `~/ags/diagnostics`), verify rendered `index.html` ↔ `report.html` visually in headless browser + run `mcp` unit tests & typecheck. | Slice A + Slice B | S / high / `fast` (`tier=low`) |
| **Slice D: Independent Review** | Independent Reviewer (no implementation ownership) | Verify `AC-001..AC-008`, CSP/XSS invariants, relative-path traversal boundaries, and visual/navigation quality; emit PASS/FAIL/NOT RUN evidence. | Slice C | S / high / `standard` (`tier=medium`) |

### Verification Procedure (Planned — Not Yet Executed)

1. **Focused unit/contract tests (Slice A & B):**
   - `rtk pnpm --filter agent-skills-standard-mcp test -- retrospective-index.spec.ts` (or exact workspace vitest command verified in `mcp/package.json` at execution).
   - `rtk pnpm --filter agent-skills-standard-mcp test -- retrospective-report-html.spec.ts retrospective-trend.spec.ts retrospective-run.spec.ts`.
   - `rtk pnpm --filter agent-skills-standard-mcp typecheck`.
2. **Consumer-smoke & visual verification (Slice C):**
   - Generate a disposable synthetic store in `os.tmpdir()` containing 5+ sessions (long folder/branch/title names, mixed `ACT` and `WATCH` improvements, denials, error stops, and multiple generations for trend links).
   - Run `collectIndex` + `renderIndexHtml` + `writeIndex` and `renderReportHtml`, open `file://<tmp>/index.html` in headless Chromium/Playwright (or `browser` eval), verify zero console/CSP errors, capture screenshots at desktop (~1280px) and narrow (~390px) widths, click `Open` → `report.html` → `#sec-*` TOC jump → trend link → `← All sessions` back to `index.html`.
   - Clean up temporary `/tmp` directory after verification.

## Next Workflow

`implementation-readiness` (or direct `implement-feature` execution after operator confirms plan + chooses **Subagent-Driven** vs **Inline** execution).

## Cost Report

`get_session_cost(workflow="plan-feature", slug="ags-diagnostic-ux", outcome="requirements_ready")` called: 7 MCP tool calls, 4 skills loaded during brainstorm + 2 planning skills (`product-management/product-requirements`, `quality-engineering/quality-engineering-business-analysis`) + file-matched skills via `load_skills_for_files`, 2 workflow bodies (`brainstorm-feature`, `plan-feature`); host token usage and monetary cost unavailable.
