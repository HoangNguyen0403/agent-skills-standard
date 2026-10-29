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
