# Mobile/client authority and lifecycle

Use this reference to make client-side state and behavior consistent with the system's authority and user promises. Link critical paths to the canonical [flow-contracts.md](../../system-design-data-architecture/references/flow-contracts.md); this reference intentionally does not reproduce its full field list.

## State the user can observe

Distinguish server-authoritative state from local presentation state, cached copies, and queued work. Define visible state transitions such as `pending`, `confirmed`, and `failed`, and what evidence permits each transition. A local optimistic update can improve responsiveness, but it is not a durable acknowledgment. A server response or later reconciliation determines confirmation according to the operation's contract.

## Sync policy

Choose online-only, read-cache/offline-read, or offline-write behavior from the journey's correctness requirement. Online-only is appropriate when a current server decision is essential (for example, authorization); state the unavailable behavior rather than implying local acceptance. Offline writes need a defined operation identity that survives retries, bounded queue/replay rules, deduplication, and a conflict policy (reject, merge, or resolve with user input) matched to the invariant. Define how stale reads are labeled or refreshed.

## Identity and deletion lifecycle

On logout, account switch, credential revocation, or device reset, specify what happens to credentials, cached sensitive data, and unsent operations. Queued work must remain account-bound and must not be replayed under another identity. Define the deletion path across server authority and material client copies, including offline-device limits and how eventual deletion is surfaced. Protect credentials and sensitive local data with platform-appropriate secure storage; do not assume ordinary preferences or an encrypted store alone establishes authorization.

## Verification prompts

- Can the UI show a pending operation as completed before the authoritative acknowledgment?
- Can a retry or reconnect create a second effect, reorder edits, or overwrite a newer authority?
- Can stale cache data cross an account boundary or survive a deletion promise?
- Does an online-only flow fail closed when the server decision is unavailable?
- Are storage, queue, payload, and network limits tied to workload assumptions?
