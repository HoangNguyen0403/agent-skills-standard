# Metrics Report Schema

Write to `artifacts/sdlc-metrics.md` at a workflow terminal state. Every row cites its source and its
measurement basis. A value the runtime cannot supply is written `unavailable` with the reason, never
estimated. A proxy is labeled `proxy`; only direct observations are labeled `measured`.

```md
# SDLC Metrics: [scope]

Period:
Generated at:

## Delivery Health

| Metric | Value | Trend vs previous | Basis | Sample | Coverage | Source |
| --- | --- | --- | --- | --- | --- | --- |
| Deployment tag frequency (git proxy) | | | proxy | | unknown | [git tags] |
| Lead time for changes (observed) | | | measured | | complete | [delivery-observations.json] |
| Change failure rate (observed) | | | measured | | complete | [delivery-observations.json] |
| Time to restore (observed) | | | measured | | complete | [delivery-observations.json] |

## Stage Indicators

| Stage | Indicator | Value | Trend | Basis | Sample | Coverage | Source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| [stage] | [leading or lagging indicator] | | | [measured or proxy] | [n or n/a] | [complete/partial/unknown] | [artifact or commit range] |

## Control Bands

| Metric | Baseline window | Tier reached | Action taken | Routed to |
| --- | --- | --- | --- | --- |
| [metric] | [rolling window] | [tier] | [log / diagnose / propose] | [workflow or owner] |

## Attribution

| Identity class | Changes | Notes |
| --- | --- | --- |
| [agent or human] | | |

## Measurement Limitations

| Metric | Limitation |
| --- | --- |
| [metric] | [what the value does not mean] |

## Unavailable

| Metric | Reason |
| --- | --- |
| [metric] | [missing input] |

## Follow-Ups
```

## Delivery observations input

Direct measures read one optional file: `artifacts/metrics/delivery-observations.json`. It is an
authorized local export (`source_kind: host-export | operator-recorded`), not a second backlog, and
it is never read from the network. Do not place it under `artifacts/runs/`, whose reader treats every
JSON file as a RunRecord.

```json
{
  "schema_version": 1,
  "source_kind": "operator-recorded",
  "coverage": [
    {
      "change_id": "checkout",
      "revisions": ["r1"],
      "from": "2026-01-01T00:00:00Z",
      "through": "2026-02-01T00:00:00Z",
      "kinds": ["review", "decision-wait", "submission", "correction", "acceptance", "deployment", "defect", "cost"],
      "complete": true
    }
  ],
  "events": [
    { "id": "e1", "change_id": "checkout", "revision": "r1", "observed_at": "2026-01-05T00:00:00Z", "source_ref": "host-export:42", "kind": "review", "session_id": "s1", "active_seconds": 600 }
  ]
}
```

Every event carries `id`, `change_id`, `revision`, UTC `observed_at`, `source_ref`, and one kind:

| Kind | Required fields |
| --- | --- |
| `review` | `session_id`, `active_seconds` |
| `decision-wait` | `decision_id`, `opened_at`, `resolved_at` (or `null` = pending) |
| `submission` | `attempt` (positive integer) |
| `correction` | `round_id` |
| `acceptance` | `attempt`, `decision` (`accepted`/`rejected`), `authority_ref` |
| `deployment` | `deployment_id`, `environment: "production"`, `first_change_at`, `deployed_at` |
| `defect` | `deployment_id`, `remediation` (`hotfix`/`rollback`/`none`), `detected_at`, `restored_at` (or `null`) |
| `cost` | `charge_id`, `currency` (ISO code), `amount` (finite, non-negative), `component` (`agent`/`human`/`tooling`) |

Validation is fail-closed: malformed values, non-UTC or impossible calendar dates (e.g. `2026-02-30`),
negative or non-finite measurements, out-of-order timestamps, an acceptance that precedes its
submission, a defect detected before its deployment, duplicate IDs, and conflicting domain identities
all reject the export. Domain identities are canonicalized before aggregation: review `session_id`,
charge `charge_id`, correction `round_id`, submission `(change_id, attempt)`, acceptance
`(change_id, attempt, revision)`, deployment `deployment_id`, defect `(deployment_id, detected_at)`, and
decision `decision_id`. An equivalent replay (any ID) counts once; a conflicting payload rejects the
export regardless of event order. A rejected export yields no observations and diagnostics; it never
yields partial totals.

The source label is attribution, not authenticated origin. Exporters omit private reviewer identity
and raw customer data.

## Per-stage indicators

| Stage | Leading | Lagging |
| --- | --- | --- |
| BRD | first conversation to committed BRD | BRD survival into PRD |
| PRD / SRS | BRD-to-PRD-to-SRS commit deltas | requirement rework after the first task-list commit |
| Build | first-pass merge share | plan adherence; merged diff versus the task list |
| Test | first-pass CI success; eval pass rate | defect escape rate |
| Review | time to first finding | findings per review by severity |
| Release | commit-to-tag lag (git proxy) | revert/fix-commit tag share (git proxy) |
| Maintain | band breach to queued intake | repeat incidents by class |
| Delivery | completed decision waits; correction rounds; first-pass acceptance | review effort; escaped defects/rollbacks; currency-specific cost |

## Derivation Notes

- **Cohort/lifecycle**: accepted changes whose `acceptance` event is in `[currentSince, currentUntil)`.
  The change's lifecycle is its linked submissions with `attempt <= accepted attempt`, their revisions,
  and every pre-acceptance event on those revisions up to acceptance. Later revisions and
  post-acceptance work never enter a closed cohort.
- **Lifecycle coverage**: a total is `complete` only when merged `complete` coverage intervals for the
  metric kind span the whole lifecycle for every linked revision. Point coverage around an observed
  event, or a gap with no exported event, keeps the row partial or unavailable. Missing or uncovered
  relevant events prohibit a complete total.
- **Human review effort**: median summed `active_seconds` per accepted change, one value per review
  session inside the lifecycle.
- **Decision wait**: median `resolved_at - opened_at` for decisions completed inside the lifecycle and
  inside coverage, plus separate pending and censored counts. Pending or censored waits are never zero
  and never completed.
- **Correction rounds**: median distinct `round_id` per accepted change over lifecycle coverage. A zero
  requires coverage of the actual lifecycle, not the report period.
- **First-pass acceptance**: accepted changes whose accepted `attempt` is 1, over the cohort.
- **Escaped defects/rollbacks**: Count distinct defect observations, including `remediation: none`,
  separately from affected, hotfix/rollback, and rollback deployment counts. An affected deployment
  has at least one defect; the eligible deployment population is the failure-rate denominator. Missing
  incident coverage keeps the row unavailable.
- **Cost per accepted change**: per currency, mean of explicitly observed component amounts with
  `agent`, `human`, and `tooling` present for every cohort member and complete lifecycle cost
  coverage. Mixed currencies are reported separately and never combined. Partial component rows use
  the observed member count per component.
- **Measured DORA rows**: The population is every deployment whose `deployed_at` lies in the
  half-open period, defined before coverage filtering. Require complete period coverage for each
  member's change and revision, plus incident coverage for change failure rate; otherwise report a
  partial observation count or unavailable. Use domain timestamps (`deployed_at`, `detected_at`,
  `restored_at`), never export `observed_at`. For accepted-cohort escape counts, include only
  deployments and detections before `currentUntil`; events at or beyond the horizon cannot rewrite the
  as-of row. Restoration beyond coverage or the report horizon is censored. Git tags, commit subjects,
  document filenames, and run-record statuses remain proxies, never measured deployment, failure,
  rework, or adherence.
- **Previous period**: reported only when the export declares comparable previous-period cohort
  coverage; otherwise the trend is explicitly unavailable.
- **Plan adherence**: compare the merged diff's changed files against the file list committed in
  `docs/srs/srs-task-list-[slug].md`. Report the share of changed files the plan named, plus unplanned files.
- **Requirement rework**: count commits to `docs/prd/prd-[slug].md` and `docs/srs/srs-[slug].md`
  after the first `docs/srs/srs-task-list-[slug].md` commit for the same slug. Commit counts are a git
  proxy, not requirement rework.
- **BRD survival rate**: BRDs that reached a committed PRD, divided by BRDs committed in the period.
- **First-pass CI success**: pipeline runs green on first attempt for the change, divided by changes.
- **Band breach to intake**: breach timestamp to the commit that created the intake artifact.
- **Run-record health**: read `artifacts/runs/<slug>/*.json` for `feature_status`, `cost`, and
  `requirement_trace` per stage instead of re-deriving them from chat transcripts. Self-declared
  status is not verification, acceptance, or release.

New measurement rows do not enter control bands until a separately reviewed source and baseline
definition exists in `docs/ops/bands.yaml`.

## Independent trust observations (optional `trust` block)

Old exports omit `trust`; existing delivery rows and values remain unchanged. Omission makes only the new trust rows unavailable. The block is schema version 1 with exactly `schema_version`, `records`, `populations`, and `coverage`:

```json
{
  "trust": {
    "schema_version": 1,
    "records": [],
    "populations": [],
    "coverage": []
  }
}
```

Trust records are strict discriminated objects. Every record has `id`, `kind`, UTC `observed_at`, and `source_ref`; `observed_at` is export chronology only, never cohort time.

| `kind` | Required domain fields |
| --- | --- |
| `revision-class` | `change_id`, `revision`, `change_class` (`trunk` / `shared` / `leaf` / `unknown`), `policy_ref`, `policy_digest` |
| `agent-review` | `review_id`, exact `change_id` / `revision`, `completed_at`, terminal `verdict` (`approved` / `changes-requested` / `blocked`), actual `reviewer_configuration`, `evidence_ref`, `evidence_digest` |
| `human-finding` | `finding_id`, `approval_review_id`, exact `change_id` / `revision`, `detected_at`, `severity` (`Blocker` / `Major` / `Nit`), `evidence_ref`, `evidence_digest` |
| `seed-assignment` | `seed_run_id`, immutable `package_ref` / `package_digest`, `change_class`, `assigned_at`, `evaluation_cutoff`, `expected_defects` (`id` / `severity` pairs), `evidence_ref`, `evidence_digest` |
| `seed-result` | `seed_run_id`, `completed_at`, `detected_seed_ids`, actual `reviewer_configuration`, `review_output_ref`, `review_output_digest` |
| `grant-reference` | `grant_id`, `change_class`, exact `scope` object (`change_id`, `revision`), `evidence_cutoff`, `effective_from`, nullable `effective_until`, `revoked_at`, `suspended_at`, nullable `independent_validation_ref` |

Each reviewer configuration has exactly `provider`, `model`, `effort`, `mode`, and `features`; values are observed labels or the literal `unknown`, never a requested profile. Do not export private reviewer identities or customer data.

Population manifests have exactly `population_kind` (`agent-review`, `seed-assignment`, `production-deployment`), `population_id`, `scope_ref`, SHA-256 `inventory_digest`, half-open `from` / `through`, exhaustive `member_ids`, `complete`, and `source_ref`. Agent-review manifests may also declare boolean `first_approval_history_complete`; only explicit `true` establishes exhaustive first-approval history. Missing/false makes first-approval rates unavailable even with complete report-window coverage. Agent-review members are review IDs, seed members are seed-run IDs, and deployment members are deployment IDs. Their listed identities must match records/events in their interval.

Coverage entries have exactly `kind`, `scope_ref`, `from`, `through`, `complete`, and `source_ref`. Kinds are trust record kinds plus `deployment` and `defect`. Merge complete intervals only when `scope_ref` matches the corresponding complete population manifest; grant history uses the global `all` scope. First-approval cohorts require explicit complete review history, continuous review/classification coverage from the manifest start, and finding coverage through `U`. Seed cohorts use their exhaustive cutoff manifest; each member requires assignment and result coverage from `assigned_at` through `evaluation_cutoff`, including pre-period time. A gap strictly after the last member cutoff does not invalidate recall. Deployment rates require their manifest scope plus continuous deployment, classification and defect coverage through `U`. Manifests, coverage and source references are declarations, not authenticated completeness.

Domain identities are tuples: revision class `(change_id, revision)`, agent review `review_id`, human finding `finding_id`, seed assignment/result `seed_run_id` within its kind, and grant `grant_id`. Identical payload replays excluding transport `id` collapse; conflicting payloads, duplicate contradictory classifications, invalid references, impossible chronology or unexpected seed detection IDs reject the entire export. Findings must reference an approved review of the same exact revision and be detected after its completion. Missing class is `unknown`, never excluded.

### Trust cohorts and outputs

- **Agent-review escape share by class:** distinct revisions whose *first* approved technical review completed in `[S,U)`; denominator is those revisions, numerator is revisions with at least one exact-revision human Blocker/Major finding detected after first approval and before `U`. Later reapproval does not move the cohort. Rejected, unmerged and never-human-accepted revisions remain included. An explicitly complete first-approval-history declaration is required; report-window completeness alone cannot establish first-ever approval. This is an as-of horizon, not lifetime defect probability.
- **Seeded-review recall by class:** assignments enter by `evaluation_cutoff` in `[S,U)`, independently of acceptance or merge. Report assigned packages and expected Blocker/Major defects separately. Recall is independently confirmed expected defects detected by cutoff / expected Blocker/Major defects. Completed empty detections are misses; absent, pending or late results make recall unavailable, and an empty expected-defect denominator is unavailable rather than 100%. Configuration strata come from actual result records or `unknown`.
- **Production deployment escape measures by class:** select every production deployment by `deployed_at` in `[S,U)`, then join classification by exact deployed `change_id` / `revision`. Report escaped defect count (including `remediation: none`), affected deployment count, eligible deployment count, affected share, hotfix/rollback deployment count and rollback-only deployment count. Defects satisfy `deployed_at <= detected_at < U`; older deployments' events do not enter this period cohort.
- **Coverage:** agent-review rates require exhaustive first-approval history plus continuous review/classification history and human-finding coverage through `U`. Seed rates require an exhaustive cutoff-cohort manifest and continuous assignment/result coverage for each member from `assigned_at` through `evaluation_cutoff`; gaps after the last included cutoff do not invalidate recall. Deployment rates require exhaustive production deployment inventory and continuous deployment, classification and defect coverage through `U`. A no-escape grant conclusion requires grant, deployment, defect and classification coverage from the earliest grant evidence cutoff through `U`, resolved exact class and grant-scope applicability for every potentially relevant deployment. An unresolved class/scope makes the negative conclusion unavailable; positive observed counts remain reportable as partial.
- **Fresh grant escape:** a defect qualifies only when its exact deployment class and `(change_id, revision)` tuple match a grant, `detected_at > evidence_cutoff`, `effective_from <= detected_at < effective_until` (null is open), and neither revocation nor suspension is at/before detection. Emit `SUSPENSION_REQUIRED` with grant, defect and evidence references even when rate coverage is incomplete. Missing grant inventory, validation reference, class/scope, or applicability history is unavailable, not “no escape.” Expired/revoked/suspended grants do not trigger at or after the boundary.

Each trust rate carries numerator, denominator, sample size, coverage, source, cohort, as-of horizon, and limitations/diagnostics in JSON and the conditional Markdown `## Trust Observations` table. Counts are separate from rates. Trust rows are optional and do not alter existing measurements. These declaration-only diagnostics do not authenticate approval, activate a grant, or enter control bands.
