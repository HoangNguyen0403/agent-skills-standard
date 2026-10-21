# Roadmap Artifact, History and Access Procedures

## Scope and evidence discipline

These are authored offline procedures against fictional records. They are not verified market demand, resource availability, human approval, installed-consumer proof, or model efficacy. Any later assessment retains the exact canonical ledger path/revision, authority root, asOf/gate, full output envelope, inspected issue fields, and independent manual grade receipt. Structural success does not establish business truth or action permission.

## Authorized-input preflight

1. Resolve the selected agent skill root. Check `<root>/product-management/product-evidence/` (standard) and `<root>/product-management-product-evidence/` (Kiro flattened), pack/exclusion status, and the installed `scripts/validate-product-evidence.mjs` regular readable file. MCP body retrieval is not proof of local resource/script availability; repository checkout paths are not installed-resource paths.
2. Check `node --version` and require Node.js >=20. Distinguish package missing/excluded, script missing, and unsupported runtime. Do not install/sync or guess a different root silently.
3. Choose an existing absolute canonical authority root expressly authorized for the selected initiative and scope. Reject `/`, home, a parent workspace, or any broader root not authorized. Check it is a directory; check the chosen ledger is a contained regular file. CLI may resolve a contained relative ledger path; library `ledgerPath` is absolute. Never broaden the root or follow symlinks to make validation succeed.
4. Use a concrete valid UTC `--as-of` instant and one of `structural|experiment|commit|release`. Reject placeholders, malformed/future instants, unknown gate values and missing arguments before calling the validator.
5. Inspect the current exact strategy/business/authorization authority pairs and artifact bindings; evidence source access/privacy/status/freshness; available customer/product inputs; dependencies, overlapping initiatives, shared cohort/team capacity, and named displaced commitments. External/protected sources are opaque; no URI is fetched and no interview/analytics query is executed by the validator.
6. Report installation, invocation/root, authority, source/access and customer evidence gaps separately. Without evidence, retain a clearly labeled candidate/proposal and explicit unknowns; do not claim selected demand, verified strategy, consent, capacity, or permission. An unavailable evidence source is not an installation failure.

Portable invocation shape (replace every placeholder only after the checks above):

```sh
node <installed-package-root>/scripts/validate-product-evidence.mjs docs/product/<slug>/evidence.json --authority-root /authorized/narrow/root --as-of 2026-11-18T10:00:00Z --gate structural
```

## Artifact/history case matrix

The retained package example is `references/examples.md`, first `json` fence, `synthetic-roadmap@r1`; it is explicitly fictional/proposal-only. `SRC-001` has one retained hashed interview-byte fixture (three fictional interviews, non-representative); claims remain synthetic. The complete fixture's `DEC-001` is proposed and its strategy/business/authorization examples do not grant authority.

| Case | Exact target / revision | Inspectable predicate and disposition |
| --- | --- | --- |
| Current source and proposal | `verification-cases.md` `R-BASE`; `docs/product/synthetic-roadmap/evidence.json@r1` | Use the exact retained first JSON fence. Inspect `SRC-001` origin/scope/hash/access/privacy/license/freshness and `CLM-001` exact unresolved classification/rationale. Three synthetic interviews do not establish representativeness. DEC-001 remains proposed; actual install/runtime/access gates are separate and NOT_RUN. |
| Competing initiatives, finite capacity and displaced learning | `R-CAPACITY-DISPLACEMENT`; roots A `docs/product/synthetic-roadmap/evidence.json@r1` and B `docs/product/synthetic-roadmap-peer/evidence.json@r1`, plus the exact capacity and projection text fences | Materialize both roots independently from the ordered R-OVERLAP recipes. Verify same exact segment/geography/window/team/period, 4+4 engineer-weeks against 5, the 3-week gap, design capacity, identity API sequencing, SCIM learning comparison, Custom Export and Tenant Role Sync deferrals. Read-only projection carries each canonical path/slug/revision/pair, conflict/gap and non-authority; hours are capacity only, never savings/cash/ROI. Companion hashes must be measured and recorded; no validator output is claimed. |
| Overlap root identity and exact local authority | `R-OVERLAP-A`, `R-OVERLAP-B`; two separate canonical roots | Root B is the complete ordered deep-copy with its own slug/product ID, same scope/cohort/time and internal refs, exact local AUTH-001/AUTH-003 paths and bytes, changed OPP/DEC rationales, and root-local bridge. Verify all refs resolve only inside their own root; no cross-ledger merge, authority, state or claims. |
| Immutable negative and unrelated decision history | `R-IMMUTABLE-NEGATIVE`; root B `@r1` | Keep DEC-003/004/005 recorded current and byte-stable; DEC-004 reject supersedes DEC-003 exactly; DEC-005 is independently scoped to OPP-002. Check exact authorization/strategy/artifact/bridge pairs and the unchanged proposed DEC-001. Negative successor never authorizes. Actual affected IDs/issues depend on a future stable gate and remain NOT_RUN. |
| Plan-compatible lifecycle versus material change | `skills/product-management/product-metrics/references/verification-cases.md` `M-PLAN-BASE`, `M-PLAN-LIFECYCLE`, `M-MATERIAL-*`; metrics canonical root only | The complete paired plan fixture is package-local to product-metrics. Use only its explicit EXP/HYP/MET frozen projections and the five isolated source/dependency/budget/baseline-window/guardrail mutations. Roadmap overlap/projection rows are not plan records. Do not transfer their authority or mark lifecycle validation as executed here. |
| Missing authority, query or customer access | `R-AUTHORITY-AND-ACCESS`, `R-UNAVAILABLE-FEEDBACK`; root A protected variant / root B `@r2` unavailable successor | Use the exact recorded source/claim/opportunity/DEC snapshots and revisions. Keep external pointers opaque, preserve full old revisable rows, do not fetch or infer consent. Distinguish unknown market evidence from validator install/invocation failure; no real outreach, exposure or action. |
| Portfolio projection disposition | `R-READONLY-PROJECTION`; projection companion and two exact roots | Match each Markdown row to canonical path, slug, `r1`, OPP-001 pair, status kind, strategy context and capacity-gap disposition. It is read-only, never a second ledger; no issue, authority or cross-root resolution is claimed. |

### Manual grade receipt template

```text
case_id:
input_path_and_sha256:
initiative_slug_revision(s):
assessment_asOf_gate_and_authorized_root:
inspected_target_pairs_and_record_kind:
observed_disposition_issue_or_gap_and_affected_decisions:
capacity_dependency_cohort_and_displacement_predicates:
strategy_authority_and_history_predicates:
projection_read_only_and_exact_revision_predicates:
negative_and_unrelated_evidence_preserved:
manual_grade: PASS | FAIL | NOT_RUN
reason_and_evidence:
grader_identity_and_timestamp:
limits: synthetic | offline | no market truth | no host authorization | no efficacy
```

A manual grade requires exact inspected records and predicates; otherwise mark `NOT_RUN`. Keep author-authored fixture expectations separate from independent reviewer receipts.

## Residual recipe precedence and current source closure

Use `verification-cases.md`'s latest `Residual recipe corrections` section where it supersedes earlier incomplete rows. Peer-B bridges always resolve to B's own current business `AUTH-003` pair; an identical-looking authority ID in root A is not a substitute. Critical claims are exact `depends_on` members as well as typed claim/critical-claim references. Keep Tenant Role Sync and its hypothesis/opportunity/defer projection coherent; Custom Export remains a distinct displaced opportunity. The healthy affected-only control must not share the changed feedback source/claim branch.

Complete all closed fields on new and revised artifacts, including each common `freshness.rationale` separately from the typed payload rationale. Retain prior revisable SRC/CLM/OPP records exactly once when replaced; never copy recorded DEC rows to `record_history`. Recorded negatives stay inspectable current rows; a successor has a new ID and exact supersedes pair, and a reject never authorizes. State transitions contain all five required members and agree with lawful State progression. Preserve each local authority/artifact byte recipe and hash in the isolated root.

The prior-negative revision is a full old/current evidence comparison, not a negative DEC stand-in. Root A/B projections remain read-only companion text; each row points only to its own root and exact record pair. Any expected issue, affected set, severity, readiness or gate disposition is a manual frozen-contract expectation, not observed common output. Common execution and consumer proof remain NOT_RUN unless separately authorized.
