# Dispatch Observations

Record one dispatch-scoped event per delegated unit of work with `scripts/record_dispatch.py`. The events land in `artifacts/metrics/delivery-observations.json` beside the change-level observations, and nothing reading that file is required of a consumer. The registry's metrics reader (optional; not required by consumers) reads the same format when it is present.

```bash
record_dispatch.py <kind> --observations <FILE> --change <ID> --revision <REV> [fields] [--observed-at <TS>] [--lock-timeout-ms <MS>]
```

## Common fields

`id`, `change_id`, `revision`, `observed_at` (UTC ISO, default now), `source_ref`, `kind`. Every free string is a reference string: `[A-Za-z0-9][A-Za-z0-9._:@#-]{0,127}`, fully matched, so no path, whitespace or trailing newline. `unknown` is a legal value wherever a host cannot resolve one.

## Fields per kind

| Kind | Fields beyond the common ones |
| --- | --- |
| `dispatch` | `dispatch_id` `role` `capability_hint` (fast/standard/strong/unknown) `actual{provider,model,effort}` `authority_ref` `orchestrator_model` `orchestrator_ref` |
| `round` | `dispatch_id` `round` (positive integer) |
| `verdict` | `dispatch_id` `round` `verdict` (approved/changes_requested) `reviewer_ref` |
| `acceptance` | `dispatch_id` `round` `decision` (accepted/rejected) `authority_ref` |
| `end` | `dispatch_id` `state` (completed/cancelled/failed/errored) |
| `coverage` | `revisions` `from` `through` `kinds` `complete` |

## Identity

`id` is `<kind>#` plus the first 32 lowercase hex characters of SHA-256 over the `|`-joined domain identity: `dispatch|d`, `dispatch-round|d|1`, `dispatch-verdict|d|1|r`, `dispatch-acceptance|d`, `dispatch-end|d`. Deterministic and at most 60 characters. A replay of the same identity with the same fields is a no-op; the same identity with different fields is refused; the same id with a different identity is refused.

## Invariants

- `dispatch` comes first; every later kind names a dispatch that exists, carries its `change_id`, and is observed at or after it.
- Rounds run 1..n per dispatch with no gaps, strictly increasing, and never after `end`.
- `verdict` and `acceptance` name an existing round and are observed at or after it. `acceptance` names the dispatch's last round.
- One `end` per dispatch. `acceptance` requires that `end` to exist, and only `completed` permits `accepted`; `rejected` is permitted for any terminal state.
- A corrective follow-up is not its own kind: it is a `changes_requested` verdict followed by the next round.

## Coverage

`coverage --from <TS> --through <TS> [--complete]` declares that the five recorded kinds (`dispatch`, `dispatch-round`, `dispatch-verdict`, `dispatch-acceptance`, `dispatch-end`) were recorded for the change and revision over the interval. `complete` defaults to false; add `--complete` only when the task's dispatch inventory is final. Without that declaration a row stays partial, which is the honest reading of a skipped record.

## When to record

| Moment | Kind |
| --- | --- |
| A dispatch succeeds | `dispatch`, naming the approved authority |
| A worker report arrives | `round` |
| A review result arrives | `verdict` |
| The terminal state is known | `end` |
| An authorized acceptance decision exists | `acceptance` |
| The dispatch inventory is final | `coverage --complete` |

## Exit codes and validation

Exit 0 written or replay no-op; exit 1 rejected, conflict, filesystem or lock failure; exit 2 usage error. Diagnostics carry a fixed code and at most one argument name or reference string — never a path, a supplied value or a traceback. A refused write leaves the previous file intact, and a lock is never broken automatically: report its code and, when stale, its age.

The helper validates the kinds it writes. Overlap rules for usage and inventory events belong to the importer that writes them and to the reader that accepts them.
