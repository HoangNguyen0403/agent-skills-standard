# Fractional route coordinate repair receipt

- Scope: approved ERD waypoint fidelity correction plus explicitly authorized ordinary-edge extension and regression lookup hardening.
- Root cause: ERD and ordinary-edge XML waypoint emitters converted planned coordinates with `int()`, truncating fractional coordinates while the shared checker retained them.
- Changes: `render_erd.py` and `render_drawio.py` serialize planned waypoint coordinates with `str(float)`, retaining round-trip precision without changing route plans.
- Regressions: added an ordinary-edge actual-emission test that requires a fractional planned waypoint and compares emitted numeric points exactly to the checker plan. Updated the ERD route regression to index relation cells by unique `_rel_<index>` ID so parallel source/target edges are both checked.
- Tests/build/lint/formatters: NOT RUN as instructed; parent owns focused/full verification after freeze.
- Sequence renderer positions were inspected; no matching fractional-coordinate defect was established for its sequence-message plan. No sequence changes.
- Freeze: changed only `render_erd.py`, `render_drawio.py`, and `test_render_drawio.py`, plus this receipt. No goldens or other worker files touched. Parent may now run the assigned verification.