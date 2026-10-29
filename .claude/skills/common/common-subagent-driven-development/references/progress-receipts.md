# Revision-bound progress receipts

`sdd_progress.py` records durable local checkpoints from explicit observation files. It is not an approval service, notification receiver, host lock, or wakeup guarantee. `owner_paused` and owner identity are declarations in a receipt; the helper does not authenticate the owner or enforce a pause.

## Placement and dispatch receipts

Record these in the existing task artifact, worker report and review receipt; add no telemetry store and no new `sdd_progress.py` observation field.

- **Placement:** one implementation context or bounded workers, plus the named benefit or host requirement that decided it.
- **Capability and effort:** requested capability, actual provider/model/effort when observable, effort support, selection reason, eligibility or authority reference, budget availability, and substitution or fallback reason. Field definitions, resolution rules and cost vocabulary live in [`common-task-complexity-routing` — Capability and effort resolution](../../common-task-complexity-routing/references/routing-table.md#capability-and-effort-resolution); reference that heading instead of restating routing policy.
- **Economics:** count the accepted task including parent, workers, independent reviews, repairs and failed or cancelled attempts; keep tokens, billed money, subscription or quota consumption, and elapsed time distinct.
- **Honesty:** a placement or capability claim is advisory unless the host enforces it. Unknown stays unknown, and no savings are claimed without complete comparable actor coverage and prices.

## Initialize

```sh
python3 skills/common/common-subagent-driven-development/scripts/sdd_progress.py init \
  --state .sdd/progress.json --plan .sdd/plan.md --workspace .sdd \
  --actions planning repair acceptance \
  --revision <settled-source-revision> --dirty-identity <working-tree-identity>
```

State version 2 binds the canonical plan path and content hash, canonical workspace, ordered action cursor, source revision, and dirty identity. There is no compatibility shim for version 1 state. Re-initialize only into a new state path; existing state is never overwritten.

## Reconcile

```sh
python3 skills/common/common-subagent-driven-development/scripts/sdd_progress.py reconcile \
  --state .sdd/progress.json --observation .sdd/observations/planning.json
```

An observation declares `completion_id`, `plan`, `workspace`, current `action_id`, `outcome` (`completed` or `blocked`), workspace-relative `evidence`, `verified_revision`, `current_revision`, `dirty_identity`, `owner`, and boolean `owner_paused`. Completed observations require evidence files. Blocked observations additionally require `blocked_reason` and retain the cursor. A new valid explicit observation can clear a block by completing the current action.

Evidence paths must resolve to files inside the workspace; accepted receipts store SHA-256 content identities. Replaying the same completion ID and unchanged evidence is idempotent. Changed reuse, missing/escaping evidence, changed plan, wrong action/workspace, mismatched revisions, dirty identity changes, or an owner not declared paused cannot advance state. Human wait, worker span, and notification timing may be included as observation fields for audit context; unknown values remain unknown and do not contribute billed compute.

## Status (read-only)

```sh
python3 skills/common/common-subagent-driven-development/scripts/sdd_progress.py status \
  --state .sdd/progress.json --revision <current-revision> --dirty-identity <current-identity> \
  --format json
```

`status` reads version 2 state and projects it; `--format markdown` renders the same projection. It never calls `init`/`reconcile`, never advances the cursor, never rewrites the task document, and never creates files. It refuses with a nonzero exit and no projection when the plan hash changed, the caller-supplied revision or dirty identity differs from state, a receipt disagrees with the cursor, the current block's action/completion/reason disagrees with its receipt, or stored evidence for a completed action or the current block is missing, escaping, or byte-changed. Earlier blocked receipts stay listed as history rather than current success. The returned `blocked` object is the validated `completion_id`/`action_id`/`reason` from state that must equal the referenced receipt's `blocked_reason`.

JSON fields: `state_version`, `plan` (path, SHA-256), `source_revision`, `dirty_identity`, `actions`, `next_action`, `blocked`, `checkpoint_completion`, `evidence_current`, `limitations`. Each action carries `id`, `checkpoint_status` (`completed`/`blocked`/`pending`), recorded `owner`, evidence references with SHA-256/currentness, and `history`.

Completion of every action is checkpoint completion only. Technical verification, business acceptance, and release remain separate records that a handoff must link. Caller identities, `owner`, and `owner_paused` are declarations the helper does not authenticate, and no approval is inferred from a receipt, filename, status string, or reviewer attribution.
