# Revision-bound progress receipts

`sdd_progress.py` records durable local checkpoints from explicit observation files. It is not an approval service, notification receiver, host lock, or wakeup guarantee. `owner_paused` and owner identity are declarations in a receipt; the helper does not authenticate the owner or enforce a pause.

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
