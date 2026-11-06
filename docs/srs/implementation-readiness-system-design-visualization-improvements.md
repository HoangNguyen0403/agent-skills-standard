# Implementation Readiness: Visualization and N+1-aware Skills

Date: 2026-11-05. Owner: requesting maintainer; integrator: parent coding assistant. Mode: extended; SNC: high (5); operator_profile: technical.

## Delivery Mode And Work Item

- Work item: [approved PRD](../prd/prd-system-design-visualization-improvements.md), original approved revision SHA-256 `f1ed4fe790932e6500b5b29c4fca01c5cd06d3be292c8ee03322af81ca5d435f`; [source brief](../brd/brd-system-design-visualization-improvements.md#approval).
- Technical baseline human approval: explicit “Approve technical design” response covers SRS/ADR including trace compatibility. Personal review-account domain explicitly authorized. No implementation execution mode or installation/live-evaluation usage authority was selected by that response.
- Current corrected SRS/ADR revision and independent verdicts: [review receipt](design-review-system-design-visualization-improvements.md). Both independent reviewers cleared the narrow applied delta at proposed-design level; maintainer explicitly approved corrections, Subagent-Driven execution, and focused baseline repair on 2026-11-05.
- Canonical ACs: PRD AC-01…09. Technical contracts: [SRS](srs-system-design-visualization-improvements.md) SRS-001…010, VER-001…010. No separate editable requirement/evaluation oracle is invented by this assessment.
- Evidence lanes: technical — the design-entry probes and baseline failures recorded below are historical; current focused proof is recorded in Slice Disposition and [walkthrough §10](srs-walkthrough-system-design-visualization-improvements.md#10-integrated-implementation-checkpoint); product usefulness acceptance — NOT ASSESSED; release/publication — NOT AUTHORIZED/NOT ASSESSED.

## Verdict

**Authorized for bounded Subagent-Driven execution:** the requesting maintainer explicitly approved the corrected SRS/ADR delta, Subagent-Driven execution, and focused baseline repair on 2026-11-05. Implementation is bounded to authorized workers under the Personal domain.

**Slice-aware delivery status:** S2 diagram renderer, S3 export hardening, S5 real SQLite fixture, and S6 trace parser alignment are frozen with scoped checks and independent reviews closed (207 Python tests pass in 0.142s after intentional 8-fixture golden refresh and verification with update disabled; 16 standard + 6 adverse Desktop exports pass; browser verification proves 2 PNGs, 0 page scripts, themes, full digest, 1440px layout, and strictly zero baseline external attempts, while the controlled probes deliberately attempted HTTP (one image request recorded) and were blocked by CSP with no script executed and no successful response; 12 SQLite unit tests and 11 CLI controls pass; 68 trace + 37 outcome tests pass; integrated source review closed two denial-unsafe lexical ban data-only corrections). S1 guidance and S4 guidance/evals are delivered at source level with behavioral and live-judgment gates still NOT RUN. Scoped source closure does not constitute full-plan or whole-feature acceptance; unexercised gates (native tsx/node_modules, live model evaluations AC-07..09, human paired-reader acceptance AC-06, Desktop network proof — browser CSP is not Desktop network enforcement, and release publication) remain strictly separate and marked BLOCKED or NOT RUN.

## Slice Disposition

| Slice | Accountable owner | Criteria / verification refs | Current readiness and independent boundary |
| --- | --- | --- | --- |
| S1 guidance reconciliation | Diagram-guidance maintainer | AC-01,05; VER-005 behavioral instruction scenarios | Guidance delivered at source level; no green visualization baseline is claimed. Behavioral instruction scenarios (VER-005) and the AC-01/05 live judgment remain NOT RUN, and final visual acceptance stays blocked separately. |
| S2 layout/themes | Diagram-renderer/golden maintainer | AC-01…03; VER-001…003 | Frozen and closed; 207 Python tests pass (0.142s) across test_fixtures, test_check_layout, test_render_drawio, test_view_manifest, and test_export_html AFTER intentional independently reviewed 8-fixture golden refresh and verification with UPDATE_GOLDEN disabled (`renderer-final-proof.json`). Exact-final-source 16 Desktop standard and 6 adverse exports pass. Six earlier residuals resolved in frozen source. Historical 141-test and 192-test failures preserved as historical record. |
| S3 portable viewing | Export maintainer | AC-01,04,05; VER-004/005 | Frozen and closed; exact final source browser verification (Playwright CLI against exact final export) confirms 2 PNGs loaded, 0 page scripts, manual+auto themes, full 64-hex SHA-256 digest visible, 1440px scroll width equals viewport width, 0 baseline external requests. Controlled intercepted probes (`script-src-elem`, `connect-src`, `img-src`) blocked by CSP without execution or successful HTTP responses; malicious adversarial metadata rendered strictly as literal text with 0 executable elements, 0 event attributes, and 0 javascript: URLs; browser sessions closed. Desktop network proof remains environment-blocked (no bypass; browser CSP is not Desktop proof). |
| S4 N+1 guidance/eval cases | Design/database-guidance maintainer | AC-07,08; VER-007/008 | Guidance and eval definitions aligned. Reuse canonical query/ORM/GraphQL rules; source/eval work remains independent of image/tsx prerequisites. Live model execution remains separately authorized. |
| S5 real N+1 fixture | N+1-runtime maintainer | AC-09; VER-009 plus reviewed recognition/remedy evidence | Independently closed: real SQLite fixture passes 12 unit tests (0.027s) and 11 real CLI controls. Proves 2 SELECTs for high fan-out (250 child relations, 23,088 direct JSON bytes) vs 1 SELECT aggregate (250 count / zero children, 56 bytes). Direct serialized representation is not wire bytes; no PostgreSQL capacity claim. |
| S6 integration and CMP-006 compatibility subtask | Integrator coordinates; tooling maintainer owns code; independent QA verifies | All ACs; VER-010 for bounded trace compatibility | Scoped trace alignment closed (reviewer `4811d741`, notification `a2030859`): outcome grammar (37 tests PASS) and document-trace parser (68 tests PASS, 160ms) accept approved single-namespace IDs; required-slug CLI PASS (0 issues, `document_links` assurance; execution evidence `not_evaluated`). Reuses existing dependencies via Node 26 adapted loader (module typeless warning retained). Full delivery integration remains gated on external lanes: human usefulness (AC-06 NOT RUN), live evals (AC-07..09 NOT RUN), and final docs review. |

Implementation roles must be materialized from eligible configured profiles at dispatch. Personal domain is authorized, not a license to silently change models/settings. Use the configured first-choice implementation route and authorized fallbacks; no automatic premium. Workers must not delegate or change architecture. Separate implementer, verifier and human acceptance roles are retained.

## V-Model And Testability (Historical Design-Entry Snapshot)

> Read this table as a historical design-entry snapshot recorded on 2026-11-05, before implementation. Its rows keep the original pre-implementation wording (for example "HTML not implemented/tested", "golden suite failed", "only SQLite probe", "new tests require evidence") and are **not** a current status statement. Current status lives in Slice Disposition above and [walkthrough §10](srs-walkthrough-system-design-visualization-improvements.md#10-integrated-implementation-checkpoint).

The canonical verification mappings remain on SRS cards; this table classifies coverage, not a duplicate AC definition or a claim that tests exist/pass.

| Level | Existing design references | Prerequisite/evidence disposition |
| --- | --- | --- |
| Acceptance | AC-06 human paired reader exercise; AC-07…09 independently judged behavior/result fit | Human reader baseline/participant/scoring and authorized held-out model run pending; actual usefulness/model efficacy not established |
| System | VER-003/004 actual theme/local page; VER-005 complete delivery-path scenarios | Desktop baseline export exercised, future HTML/theme/CSP/network surfaces not implemented or tested |
| Integration | VER-001 manifest/provenance/regeneration, VER-009 real SQLite, VER-010 strict scoped audit | Existing manifest/render checks ran within 141-test baseline command; golden suite failed. SQLite design probe passed limited query-shape checks. Native full audit unavailable; future implementation behavior not inferred |
| Unit | Planned complete-label geometry/palette isolation, escaping, scoped result/batch/empty-page rules, bounded ID grammar | Existing renderer/checker/manifest modules exercised once; source-defined proposed regex corpus passed separately, not the native validator. New behavior-focused tests require independent oracles and honest RED/GREEN evidence |

Negative/edge paths are specified: unverified evidence, multiline/hidden text, dark export failure, existing/foreign paths, explicit manifest mismatch/review_needed, attempted script/network content, empty relations/pages, large fan-out, parent pagination, scoped identity, already-batched/aggregate/spare-instance controls and malformed IDs. No mobile build/driver or application market/role toggles are in scope; mobile-specific gates are not applicable to this local tooling change.

## Observed Baseline And Blocking Gaps

| Gap | Observed evidence / scope | Owner and required input |
| --- | --- | --- |
| Execution authority and correction delta | Maintainer explicitly approved corrections, Subagent-Driven execution, and focused baseline repair on 2026-11-05 | Resolved for bounded worker dispatch; separate publication, live model eval, and package installation remain unauthorized |
| Existing diagram golden mismatch | Historical baseline run: 141 tests, seven fixture subtest failures. Resolved in frozen source: 8 root fixtures regenerated after independent source closure and actual surface inspection; subsequent full run passed 207/207 tests (0.142s) with UPDATE_GOLDEN empty | Frozen and verified (`renderer-final-proof.json`); historical mismatch retained as historical progression |
| Native schema dependencies | Node 26 adapted loader reuses existing local dependencies (module typeless warning retained); native pnpm/tsx path unexercised; no installs performed | Tooling maintainer verified adapted loader for document-link trace audit; native tsx/node_modules installation remains deferred; do not infer general environment pass |
| Qualified source IDs vs validator | Resolved in implementation: user directed "Align trace parser too"; outcome and document-trace grammar accept approved IDs without renumbering | Scoped trace alignment closed by independent review (`4811d741`, `a2030859`); required-slug audit PASS (0 issues; `document_links` assurance) |
| Live model usage | Review account authorization is not eval-spend/runtime authorization; missing gpt-tokenizer preflight | Integrator/maintainer resolves exact eligible executor/model/quota when live eval is needed; no unauthorized tokenizers installed; eval runs remain NOT RUN |
| Browser verification environment | Playwright CLI executed against exact final source export (`offline-package-roundtrip/index.html` and `offline-adversarial-roundtrip/index.html`): 2 PNGs loaded, 0 scripts, themes verified, full digest visible, 1440px layout, controlled CSP probes blocked, literal adversarial metadata; sessions closed | Verified (`renderer-final-proof.json`). Desktop denied-network proof remains environment-blocked with no unauthorized bypass; Desktop behavior observed separately from browser CSP |
| End-to-end acceptance | Renderer and export pipeline frozen (207 Python tests, 22 Desktop exports, browser CSP proof); N+1 fixture (12 unit tests, 11 CLI controls) and trace alignment (68 trace tests, 37 outcome tests, 0 required-trace issues) closed; whole-delivery source review closed two denial-unsafe lexical ban data-only fixes (notification `6c973182`). External lanes remain BLOCKED / NOT RUN | Implemented source != feature verified. AC-06 paired human readers NOT RUN; AC-07..09 held-out model evaluations NOT RUN/unauthorized; release/publication unassessed/unauthorized |
| Human usefulness and release | No reader comparison or publication authorization | Requesting maintainer supplies human acceptance and separate release decision when evidence is ready |

Paseo CLI metadata lookup separately failed on an existing local config-schema mismatch. The user resolved account-domain ambiguity directly, so that CLI failure is not a blocker for already-launched MCP reviews. No local account/config file was modified.

## Next Workflow

Bounded implementation slices under Personal domain are completed and frozen. Integrated source closure finalized two denial-unsafe lexical ban data-only corrections (`6c973182`). Next workflow is independent final documentation delta review and maintainer review.

Current outcome reflects frozen bounded implementation with external lanes explicitly pending/blocked (`frozen_pending_external_acceptance`), not a premature claim of whole-feature or whole-branch acceptance. [Readiness run record](../../artifacts/runs/system-design-visualization-improvements/readiness-review-20261105.json).

## Cost Report

MCP session cost is requested before handoff. Host-complete tokens, account allowance and monetary cost are unavailable; no exact aggregate cost/savings claim. Read-only reviewers returned documentary findings, not implemented controls or human approvals.
