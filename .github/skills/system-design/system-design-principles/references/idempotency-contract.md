# Idempotency Contract

This contract applies when retries, duplicate delivery, or replay may repeat a business effect. Identity belongs to the business operation, not a transport attempt. A transport retry reuses the same operation ID and intended payload. The operation owner records the identity, normalized parameters or an equivalent comparison value, lifecycle/result, and effect in a durable consistency boundary appropriate to the invariant.

## Required Decisions

- **Identity and scope:** Define who creates the stable operation ID, its uniqueness scope, and which business intent it names. A new user intent gets a new ID; a retry of the same intent does not.
- **Effect owner and atomic arbitration:** Name the authoritative owner and effect guarded by the operation identity. Every contender must be arbitrated atomically at the authoritative effect owner so concurrent duplicates cannot both apply the effect. Guarantee effect safety through either (1) operation state and local effect in one consistency boundary, or (2) a named durable recovery protocol in which the effect carries the operation identity and recovery detects an already-applied effect before retrying it. Separate operation/effect commits without such detection are unsafe.
- **Parameter reuse:** Same ID plus same intended parameters resumes/returns the operation according to the API contract. Same ID plus different parameters is rejected or explicitly resolved; it must not silently mutate the original intent.
- **Commit boundary and crash:** Before the authoritative effect is applied, recovery may attempt it after atomically arbitrating the operation. After the effect but before a completion marker or response, recovery must find the effect by operation identity and mark/return it as complete without reapplying it. If that prior effect cannot be determined, do not retry blindly; reconcile until its outcome is known.
- **Response semantics:** Specify outcomes for accepted, in-progress, completed, conflicting, unknown, and response-replay-expired operations. Replaying a stored response is one valid API contract, not a universal requirement; see [Stripe's API-specific idempotency behavior](https://docs.stripe.com/api/idempotent_requests).
- **Distinct horizons:** Declare the supported client retry horizon, operation/effect-deduplication retention, and stored-response replay lifetime separately, with their start point and scope. The effect owner must recognize repeats throughout the supported retry horizon; if its deduplication record expires sooner, a durable business-state lookup or reconciliation path must prevent a new effect. Response replay may expire earlier or be `N/A` for an API that does not promise it. After response-only expiry, return current operation status or an explicit replay-unavailable result without creating a new effect. After operation/effect retention expiry, resolve the prior effect from durable authoritative state or reconciliation before accepting a new effect.
- **Retry control:** Bound retries and deadline, designate the retrying layer, and account for backoff/jitter. Retries consume capacity, amplify load during overload, and can worsen tail latency. See [AWS retry guidance](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/).

## Teaching Ladder

Each scenario names the effect, owner, adverse outcome, and verification. Keep the API result specific to its contract.

| Scenario | Effect and state owner | Adverse outcome to prevent | Verification |
| --- | --- | --- | --- |
| Payment response is lost after commit | One capture and ledger posting; payment operation/ledger owner | Client retries under a new transport attempt and captures twice | Apply the effect, crash before its completion marker/response, recover using the same operation ID; assert the prior effect is found, not reapplied, and the API returns its documented status/result |
| Two duplicate requests arrive concurrently | One operation record/effect; authoritative operation owner | Both requests pass a read-before-write check and create two effects | Synchronize concurrent same-ID submissions; assert one effect and the documented in-progress/completed response for each |
| Same ID arrives with changed amount or currency | Original intent remains owned by the first accepted payload | Reuse silently changes the operation or executes a second intent under the same identity | Submit changed parameters under the original ID; assert explicit mismatch response and unchanged original state/effect |
| Client retries after response replay expires, within the supported retry horizon | Authoritative operation/effect record remains retained by its owner | Expired response cache is mistaken for an expired duplicate guard and repeats the effect | Expire only the stored response; retry the same ID while deduplication remains retained; assert no new effect and the documented current-status or replay-unavailable result |
| Requirement changes to an external effect whose outcome is ambiguous after timeout | Local operation record plus external processor's operation/event state | Local transaction commits but response is lost; blind retry duplicates processor effect or ledger posting | Crash after external commit before local confirmation; assert retry first reconciles provider outcome and ledger advances once |

## Different-Mechanism Trigger

If the required client retry horizon exceeds operation/effect-deduplication retention and no durable operation lookup or authoritative external reconciliation exists, the retained key record alone cannot meet the invariant. Extend effect deduplication or add an authoritative recovery path before enabling retries beyond that horizon. Verification: retry after the operation key record expires and prove the prior effect is found before any new side effect can occur.

## Source Boundaries

- Stripe documents API v1 response replay, parameter comparison, concurrent conflicts, and key pruning; API v2 semantics differ. Implementations must use the relevant endpoint/version contract, not assume one universal response policy: [Stripe idempotent requests](https://docs.stripe.com/api/idempotent_requests).
- AWS documents timeout/retry trade-offs, retry load amplification, bounded exponential backoff, and jitter: [Timeouts, retries, and backoff with jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/).
