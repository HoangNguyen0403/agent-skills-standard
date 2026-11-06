# Renderer residual correction — worker receipt (frozen)

Owner: this worker (Personal - DeepSeek), single writer. Previous renderer owner frozen.
Base: 52671cf9ed6a1c376dfaaae7e621dbc51a4c8765.
Skill root: `skills/common/common-architecture-diagramming`.

## Skills loaded before source changes

- `python-language` (`**/*.py`)
- `common-best-practices` (composite via python-language)
- Reference contract read: `references/layout-rules.md`, `references/diagram-spec.md`,
  `references/style-catalog.md` (context), plus packet brief and parent probe scenario
  (read only; probe not run, not edited).

## Changed files (exact)

Source (owned):
1. `scripts/text_layout.py` — rewritten as the shared plan module.
2. `scripts/check_layout.py` — rewritten to measure those plans.
3. `scripts/render_drawio.py` — consumes plans; header/page/sequence emission.
4. `scripts/render_erd.py` — consumes the entity plan; relation label box.
5. `scripts/style_catalog.py` — terminal state style, entity row style.

Tests (owned; authored, NOT RUN):
6. `scripts/test_render_drawio.py` — new class `TestEmittedGeometryPlans` (9 tests) +
   `html`/`render_erd` imports.
7. `scripts/test_check_layout.py` — new class `TestEmittedPlanFindings` (3 tests) +
   `text_layout` import.

Docs (limited to the corrected contract):
8. `references/layout-rules.md` — "One plan, then draw it" section; sequence spacing,
   row-gap and entity/terminal bullets; checker coverage list.

Not touched: `export_drawio.py`, `export_html.py`, `validate_spec.py`,
`validate_manifest.py`, `schema_to_spec.py`, `schema_parsers/`, `.agent/`, peer
evidence, other workers' files, `.github/.codex/.claude/.agents` skill mirrors.
No installs, services, commits, permissions, deployment, model calls.

## Repair closure

1. **Sequence EDGE_PROPERTIES projection restored.**
   `_render_sequence_body` now applies `_property_value` over `EDGE_PROPERTIES` onto the
   `_msg_<n>` `mxCell` before/with the value, matching the ordinary-edge convention.
   `EDGE_PROPERTIES` is unchanged: identity, evidence, evidence_kind, evidence_revision,
   evidence_digest, evidence_confidence, lifecycle, metric_provenance. `protocol` is not
   in the tuple and was NOT invented; only fields present on the source edge are emitted.
   Closure test: `test_sequence_message_cells_carry_populated_edge_provenance` (all eight
   fields populated, plus a control that absent fields stay absent).

2. **Estimator-only edge sizing replaced by one emitted label plan.**
   `text_layout.edge_label_plan` returns escaped wrapped `LabelLine`s, `width`, `height`;
   `label_rect` yields the rectangle at an anchor. Consumers:
   - `render_drawio._edge_value` renders exactly those lines (same evidence predicate and
     `⚠ UNVERIFIED` warning), `_render_edges` emits `width`/`height` on the label geometry
     with `x = 2·fraction−1`.
   - `render_erd.render_relations` emits the same `width`/`height` box at `x=0`.
   - `check_layout._edge_findings` builds the same rectangle at `label_point(points)` and
     keeps both strict checks: label-rect ∩ non-endpoint node, and unrelated route crossing
     a label rect (plus label-label overlap).
   No fallback path; when a rectangle cannot fit, the finding is still reported.
   Closure tests: `test_routed_edge_label_geometry_and_escaping_match_the_plan`
   (escaping + width/height + fraction agreement),
   `test_cross_row_edge_label_rectangle_clears_every_other_node`.

3. **ERD swimlane header allocation is real.**
   `text_layout.entity_plan` returns `width`, `header_height`, wrapped escaped
   `header_text`, and one `EntityRowPlan` (wrapped escaped text + height) per column.
   `render_erd._entity_style` rewrites the swimlane's `startSize` to `header_height`;
   header value is the planned text; each row is emitted at its planned `y`/`height` with
   its planned text. `whiteSpace=wrap;overflow=visible` replaces `overflow=hidden`, and the
   row heights come from the same wrap that produced the text, so nothing is clipped.
   Closure test: `test_erd_swimlane_start_size_rows_and_header_text_match_the_plan`
   (startSize, entity height, per-row y/height/value, full wrapped content, no
   `overflow=hidden`).

4. **One header plan in `Layout`.**
   `text_layout.HeaderPlan` holds `width`, `title`/`meta`/`contract` as `HeaderText`
   (escaped wrapped text, x, y, width, height, size), `rule_y`, `body_y`, `height`.
   `Layout.header` carries it; `header_box` is derived from it. `render_drawio.layout`
   plans the header from the drawn content width (`max(1000, content + 60)`), re-places at
   that `body_y`, and pushes `body_y` further when a group box would reach into the header
   (`rule_y + HEADER_BODY_GAP + group padding`). `_render_title` consumes the plan directly;
   the previous fixed 30/18/+52 positions and the duplicate `header_layout` replanning are
   gone. `check_layout._header_findings` now covers groups as well as nodes.
   Closure tests: `test_header_plan_owns_every_emitted_header_offset`,
   `test_group_headers_expanding_upward_push_the_body_below_the_rule`,
   `test_group_box_reaching_into_the_header_is_reported`.

5. **One sequence message plan.**
   `check_layout.sequence_messages` returns per message: `y`, `source_x`, `target_x`,
   `plan`, `rect` (from `label_rect` at the midpoint anchor), plus `sequence_bottom`.
   Rows start at `participant_bottom + 24` and advance by
   `max(60, prev_h/2 + h/2 + 26)`; the renderer emits `width`/`height`, the exact int
   endpoints, and a waypoint at the planned anchor; the checker measures the same
   rectangles pairwise and against expanded participant footprints.
   The old dual constants (renderer `max(340, …)`/`max(60, h+26)` vs checker
   `participant_bottom+40`/`max(50, h+26)`/fixed width 180) are removed.
   Closure tests: `test_sequence_message_geometry_matches_the_shared_plan`,
   `test_sequence_plan_reserves_room_below_expanded_participants`,
   `test_sequence_plan_keeps_long_labels_clear_of_neighbours`.

6. **State terminal distinguishable; circle labels size-matched.**
   `start` stays a filled 40×40 ellipse; `end` is now a hollow `doubleEllipse` with
   `strokeWidth=3` (light: white fill / #1F2933 ring; dark: #111827 fill / #F9FAFB ring).
   Shape and size semantics unchanged; only supported style tokens used; the unverified
   path still applies the warn font colour for legibility. `circle_label_plan` supplies
   the under-circle label block, and `_shape_cell` emits its `labelWidth`/`labelHeight`
   while `_footprint`/`_footprint_w` reserve exactly that block (the 120 px planning-only
   footprint is gone).
   Closure tests: `test_state_terminal_is_distinct_from_start_in_both_themes`,
   `test_circle_under_label_width_and_height_are_emitted_not_just_planned`.

### Adjunct change inside renderer ownership

`_fit_page` grows `pageWidth`/`pageHeight` to the emitted content bounds (never below
1600×1200). Reason: with plan-driven rows, an adverse long sequence/ERD extends past the
fixed 1200 px page and a Desktop export of the page would crop planned content. Only the
`render_drawio` model attributes change; the exporter is untouched.

## Tests authored but NOT RUN

Per the brief, none of these were executed; the parent runs covering checks once after
freeze.

- `test_render_drawio.TestEmittedGeometryPlans` (11): sequence provenance, sequence
  geometry/plan agreement, routed-edge label plan + escaping, cross-row label clearance,
  ERD startSize/rows/header text + wrap oracle, ERD header font and adverse header
  content, ERD relation route/ports/waypoints agreement, header offsets, group upward
  expansion, terminal distinctness, circle label emission.
- `test_render_drawio.TestErdRenderer.test_relation_carries_er_arrows_for_cardinality`
  retargeted from the retired router pin to orthogonal base + both IE arrows + the four
  port coordinates (cardinality assertions unchanged).
- `test_check_layout.TestEmittedPlanFindings` (3): sequence plan reserves room below
  expanded participants, long sequence labels stay clear, group box reaching into the
  header is reported.

## Corrective round 1 (same owner, full scope)

Parent run of 204 tests: 9 failures = 8 stale root goldens (expected, not regenerated) +
`test_render_drawio.py::test_erd_swimlane_start_size_rows_and_header_text_match_the_plan`.
195 other cases passed.

**Root cause — test oracle, not the emitter.** `wrap_text` replaces the space at a line
boundary with the emitted `<br>`; no character is dropped. The old assertion did
`plan.rows[1].text.replace("<br>", "")`, i.e. it deleted the break *without* putting
whitespace back, so a word-boundary break (`constraint | and`, `numeric(38, | 12)`)
concatenated into `constraintand`. The mid-word chunk break inside the 59-character
identifier reconstructed correctly by coincidence, which is why only that phrase failed.
Every character of
`tenant_scoped_reconciliation_identifier_with_semantic_meaning : numeric(38, 12) with
check constraint and default` was present in the emitted cell.

## Corrective round 2 — two ERD majors and the oracle precision (same owner, full scope)

**(1) Entity header wrapped at the wrong font.** MAJOR confirmed in source:
`_entity_header_lines` wrapped the sublabel/metric at a 10 px budget and the state line at
9 px, but the emitted swimlane draws one label at `fontSize=12`. Lines wrapped for a
narrower font are wider when drawn, so a long sublabel/state/metric could overflow the
200 px entity width with `overflow` no longer hiding it.
Fix (one consistent font): `text_layout.ENTITY_HEADER_FONT = 12` is now the single header
wrap budget (`entity_header_budget`), all header parts wrap at it, and `render_erd` writes
that same value into the style's `fontSize` (with `startSize`), so plan and drawing cannot
diverge. New assertion + adverse case:
`test_erd_header_wraps_at_the_emitted_swimlane_font` (long sublabel, lifecycle/confidence,
long metric with provenance) checks the emitted `fontSize` equals the plan font, per-line
width fits `ENTITY_W - 2·ENTITY_PAD_X` at that font, the header wraps to more than four
lines, the parts replay without loss, and long words stay intact.

**(2) ERD relation labels were checked against a route the renderer did not draw.**
`render_erd` used `entityRelationEdgeStyle` with no ports or waypoints, while
`check_layout._edge_findings` measured `route()`/`label_point()`. Confirmed: the strict
label checks were measuring a different path than draw.io drew.
Fix (one actual route): relations are now orthogonal edges with the IE-notation arrows
preserved, pinned with `_anchor_style` (same `anchor_sides` ports as the checker) and with
the checker's own waypoints from `check_layout.plan_routes`, the label at
`check_layout.label_fraction`, and the plan's label box. `render_relations` now takes
`spec`/`lay` and shares `plan_routes` with the checker; no draw.io-managed route remains,
so nothing is claimed as checked that is not. Existing contract test updated from pinning
the router (`entityRelationEdgeStyle`) to asserting the orthogonal base, both IE arrows,
and the four port coordinates; cardinality assertions unchanged. New assertion:
`test_erd_relation_is_drawn_on_the_route_the_checker_measures` (emitted waypoints ==
planned waypoints, `x` == `2·label_fraction−1`, plan width/height, ports ==
`anchor_sides`, ER arrow for the edge's cardinality).

**(3) Oracle precision.** The `handle_data`/break-stripping readings were too coarse:
inserting a space at every break corrupts an intra-token chunk, and deleting every break
corrupts a word boundary. `test_render_drawio.py` now distinguishes them by replaying the
emitted lines against the source: `wrap_replays_source` requires each break to consume
source whitespace or continue a token with no character lost or reordered;
`intra_token_breaks`/`token_at` then prove that a mid-token break only happens to a token
longer than the row budget; word-intactness per line is still asserted for every word that
fits the budget. `word_boundary_text` is used only where every break is a word boundary
(the header scope assertion), and says so.

Delta files this round: `scripts/text_layout.py` (single header font + budget),
`scripts/render_erd.py` (font in style, shared relation route, module doc),
`scripts/render_drawio.py` (pass `spec`/`lay` to relations),
`scripts/test_render_drawio.py` (precise wrap oracle, two new tests, relation-style
contract retargeted), `references/layout-rules.md` (ERD route + header font contract).

Goldens left stale on purpose: the eight root `.drawio` mismatches remain the expected
consequence of the intentional geometry change. No regeneration and no hand edit in this
round either.

## Remaining risks (not closable from here)

- **Goldens are stale.** `assets/fixtures/*.drawio` (the eight root goldens) encode the
  previous emitted geometry and MUST be regenerated before `test_fixtures` compares them:
  `UPDATE_GOLDEN=1 python3 -m unittest test_fixtures` inside
  `skills/common/common-architecture-diagramming/scripts`, then the parent command with
  `UPDATE_GOLDEN=`. Shell/test execution was denied to this worker, so no golden was
  regenerated or hand-edited.
- Desktop/browser/CSP export smoke and PNG inspection are the parent's; not run here.
  Whether the hollow terminal ring, the plan-width circle labels, and the orthogonal ERD
  relations read well at 2× export scale needs eyes on the PNG.
- `_fit_page` widens the page for long diagrams; that is a page-size response, not a claim
  of arbitrary input-size capacity.
- The `.github/.codex/.claude/.agents` skill mirrors are generated copies and were not
  updated (not owned).
- The ERD header is drawn bold (`fontStyle=1`) while the wrap estimate uses a regular
  advance; the 24 px header padding absorbs the difference on one line, but a bold-metric
  refinement is a judgement call the parent's PNG pass can still reject.

## Frozen scope

Frozen files: `scripts/text_layout.py`, `scripts/check_layout.py`,
`scripts/render_drawio.py`, `scripts/render_erd.py`, `scripts/style_catalog.py`,
`scripts/test_render_drawio.py`, `scripts/test_check_layout.py`,
`references/layout-rules.md`. No further edits from this worker.
