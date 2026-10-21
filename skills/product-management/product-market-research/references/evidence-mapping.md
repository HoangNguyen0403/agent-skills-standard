# Evidence Mapping for Product Market Research

> **Synthetic-only example.** All example records are training data, not external market facts. The complete package-shaped example and its source bytes are in [examples/](examples/).

## Canonical ledger and scope

Read/write one `docs/product/<slug>/evidence.json`; a `research.md` view links exact record IDs/revisions, source authority/access, scope, and uncertainty. Do not create a second editable ledger. Product value/state is not delivery `feature_status` or Outcome trace IDs.

Use the ledger's exact `Scope` shape for every record and source origin: `{segment, geography, window:{start,end}}`. A source's original population/window stays on `SRC.data.origin.scope`; a new target scope needs a reviewed claim, not an assumed subset.

## Source (`SRC`)

Record publisher, stable `origin_id`, origin class/revision/time/scope, retrieval time, locator, privacy, license, availability, and limitations. Trace reposts to the original observation; unresolved independence stays unknown. External available bytes need a real captured digest. Local available source hashes are computed from supplied bytes. Restricted sources use `pointer_only` with protected/unavailable access; never claim inaccessible content as support. Hashes identify bytes only, not source truth, consent, or rights.

The complete fictional ledger links each quote/row to retained benign bytes and SHA256. Confirm only the literal scoped observation; causal explanations, population inference, demand, price, and impact remain inference/assumption/unknown with limits and negative evidence.

## Claim (`CLM`) and opportunity (`OPP`)

`CLM.data.sources` are exact `SRC` refs and also appear in `depends_on`; `counterevidence` retains exact `SRC`/`CLM` refs as descriptive influence, not DAG edges. `confirmed` requires available source support; interpretations need rationale and uncertainty. Never discard contrary observations or turn repost count into probability.

`OPP` links exact claims, customer job/problem, substitutes (including `unknown` if not researched), alternatives, candidate/deferred/rejected status, and rationale. Include do-nothing. If a substitute wins, recommend defer/no-build in rationale; do not invent a market fact or encode an unauthorized stop.

## Handoff and bounded reassessment

Pass exact `SRC`/`CLM`/`OPP` pairs to strategy for `HYP` and proposed `DEC` creation; scope changes require new reviewed claims. A readable view cites the canonical ledger, authority/access/scope, current IDs/revisions, counterevidence, and open gaps.

## Worked fictional research-to-strategy handoff (read-only)

Canonical ledger identity: `docs/product/synthetic-market-research/evidence.json`; slug `synthetic-market-research`, revision `r1`, exact Scope `{segment:"Mid-market B2B SaaS Operations", geography:"North America", window:{start:"2026-01-01T00:00:00Z", end:"2026-06-30T23:59:59Z"}}`. The complete read-only fixture payload for this identity is [`examples/synthetic-market-ledger.json`](examples/synthetic-market-ledger.json); it is one ledger, not a second editable view.

Handoff within that same ledger: retain `SRC-001/r1` (literal fictional 2-of-3 operators used a spreadsheet for one monthly report) and `SRC-002/r1` (one same-cohort example used the existing workflow); `CLM-001/r1` supports only the literal `SRC-001/r1` row and retains `SRC-002/r1` as counterevidence; `OPP-001/r1` remains a candidate with cause, recurring need, demand, prevalence, price, and impact unknown. `HYP-001/r1` depends on `OPP-001/r1` and `CLM-001/r1`, has the exact same Scope, null primary metric, proposed status, conditional falsifiable prediction/disconfirmation, and asserts no causal mechanism. `DEC-001/r1` depends on and consumes exact `OPP-001/r1` and `HYP-001/r1`, includes `CLM-001/r1` in both `critical_claims` and `depends_on`, and is `purpose:learning`, `status:proposed`, `outcome:defer`; authority and strategy binding are null. The root's strategy gap remains explicit; product state remains `unvalidated`, lists `HYP-001/r1`, and has `decision:null`. This is a recommendation only: no research, outreach, spend, build, or product action is authorized. New sources, target scope, or any applicability change require separate review and a new current claim; these exact pairs resolve only within this slug, not by reusing ID tokens across ledgers.

For affected-only reassessment, use the installed `product-evidence` contract §2.6 complete per-kind, role-aware bounded `influence` worklist. It includes counterevidence and typed query/baseline/metric/guardrail/authorization/artifact/authority support as applicable—not merely `depends_on`, `consumes`, and `critical_claims`. Keep exact pair resolution, acyclic `depends_on` provenance, influence, and acyclic DEC supersession distinct. Historical attribution is not current support; retain negative/history; do not globally invalidate, retarget approval, or promote delivery status.
