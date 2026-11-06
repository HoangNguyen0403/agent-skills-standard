# Receipt: exporter test repair — connected security fixture

- Status: **completed**
- Packet: `artifacts/runs/system-design-visualization-improvements/exporter-repair-packet.md` (task 1, bounded test-repair follow-up)
- Owner: Personal - DeepSeek exporter residual owner (config unchanged; user explicitly routed this bounded test repair to DeepSeek, overriding the exhausted route chain for this repair only)
- Prior Delivery attempt `c3587e11` failed on usage limit before edits; no active exporter writer.
- Owned write set for this repair: `skills/common/common-architecture-diagramming/scripts/test_export_html.py` and this receipt. No production code edited.

## Failure repaired

Parent integrated-186 test run: `TestExportHtmlExecution.test_export_html_security_escaping_and_literal_text_contract` failed before the HTML build (`expected code 0, got 1` at the `assertEqual(code, 0)` line). Cause: `malicious_spec` replaced `make_valid_spec`'s connected graph with a singleton node `xss` (`kind: container`) and `edges: []`, so strict validation rejected an unconnected node rather than exercising escaping.

## Change (test only)

`skills/common/common-architecture-diagramming/scripts/test_export_html.py`, same test:

- Removed the `nodes=[{id: xss, ...}]` / `edges=[]` overrides. The fixture now uses the existing connected two-node `make_valid_spec()` graph (container `gateway` → db `ledger`, one labelled edge), which is valid ingress and was already proven to export successfully by the happy-path test.
- Hostile payloads preserved on emitted metadata:
  - `title = "<script>alert('pwned')</script>"` → escaped into `<h1>`/`<title>`.
  - `scope = '"><iframe src="javascript:alert(1)"></iframe>'` → escaped into the metadata grid.
  - `version = "<img src=x onerror=alert(1)>"` → escaped into `Version / Date` (the earlier oracle correction; unchanged).
  - Citation: `malicious_spec["nodes"][0]["evidence"] = "<script>evil()</script>.go:10"` → escaped into the evidence citation list.
- Expected assertions unchanged: escaped `&lt;script&gt;alert(&#x27;pwned&#x27;)&lt;/script&gt;`, `&quot;&gt;&lt;iframe`, `&lt;img src=x onerror=alert(1)&gt;`, `&lt;script&gt;evil()&lt;/script&gt;.go:10`; DOM auditor rejects `script/iframe/object/embed/form`, `on*` handlers and `javascript:` URLs; payload-scoped guards `assertNotIn("<img src=x")` / `assertNotIn("<script>alert")`; no `<a href="`; no home path.

## Explicitly not changed

- No mock or relaxation of canonical `validate_spec`; the test still runs the real spec validation and, for manifests, the real canonical path.
- No raw node-label embedding added to `export_html.py`; node-label literal preservation remains renderer test scope (peer owner).
- No test deletion, no production edits, no doc/contract changes.

## Verification

NOT RUN here — per brief no tests/build/lint/formatters were executed mid-flight; parent runs the exporter suite after the renderer freezes. Parent evidence for the surrounding mechanisms already recorded externally: integrated-186 run reproduced the failure as a fixture-connectivity error before HTML build; real Desktop exports of all 8 diagram types × 2 themes passed strict layout, theme semantic comparison and input immutability.

## Limits

- This receipt covers only the test fixture repair. Prior exporter receipt `exporter-residual-receipt.md` still describes the capture-sink/binding change and its evidence; no re-verification of that slice was performed here.
- No delegation, installs, commits, live evaluation or publication.
