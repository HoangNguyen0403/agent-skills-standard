# Evidence Mapping for Product Strategy

> **Synthetic-only example.** The complete linked ledger/source bytes describe a missing-authority training case, not an approved strategy, product mandate, validated need, budget, or action.

## Canonical view and authority

`docs/product/<slug>/evidence.json` is the sole mutable product evidence ledger. A readable `strategy.md` view links exact IDs/revisions, strategy authority and scope, goals/non-goals, alternatives, uncertainty, and open decisions; it contains no duplicate editable records. Product-state decisions remain separate from delivery `feature_status` and Outcome trace arrays.

When strategy authority is missing or conflicting, keep `strategy_authority: null`, state the exact `strategy_gap`, and restrict the result to unvalidated candidates/proposals. Never substitute technical SRS/H1 approval, owner attribution, or an unreviewed memo for a strategy-domain authority.

## Record and recommendation mapping

- `SRC` retains source locator/origin/revision/time/scope, privacy/access/license, exact byte digest when supplied, and limitations. Hashes do not establish authority or truth.
- `CLM` distinguishes literal supported observations from inference, assumption, and unknown; source refs and `depends_on` resolve exactly; counterevidence remains retained.
- `OPP` links claims and states alternatives/substitutes, explicit non-goals, unresolved constraints, and candidate/deferred/rejected status in rationale.
- `HYP` links exact `OPP`/`CLM` refs, falsifiable prediction, mechanism, disconfirmation, and optional declared metric; untested status stays proposed.
- Proposed `DEC` links consumed and critical claims (critical refs also in `depends_on`), uses null `strategy_binding` when proposal rules require it, and never changes recorded history. Recorded DEC is immutable; supersession uses a new ID and exact `supersedes`.

A no-build recommendation discovered here belongs in OPP/DEC rationale and a candidate/deferred/rejected opportunity. A proposed DEC may use only a permitted proposed outcome such as `defer` or `reject`; never proposed `authorize`, `scale`, `stop`, or `risk_accept`. `stop` is reserved to the contract's `value_review` purpose and separately authorized stage.

## Complete affected-only support

Follow `product-evidence` §2.6's installed, bounded role-aware influence worklist, not a locally shortened vector. It follows per-kind typed support: SRC origin/availability/privacy/license limits; CLM sources and counterevidence; OPP claims; HYP opportunity/claims/primary metric; EXP hypothesis/primary and guardrail metrics/results/authorization; INV claims/artifacts; DEC consumes/critical claims/authority/strategy binding/artifacts/bridges; MET query/baseline/exception; REV hypotheses/metrics/observations/costs. `depends_on` remains its own acyclic provenance DAG; exact-pair resolution, influence, and acyclic DEC supersession remain distinct. Supersession and REV historical attribution are not current support; plan/evidence/exception roles and retirement rules apply as specified by the installed contract. Preserve negative evidence/history, reassess only affected decisions, and never retarget authority or alter delivery status.
