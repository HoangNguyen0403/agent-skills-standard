# Synthetic mobile/client practice pairs

All workloads and SLOs below are illustrative assumptions for practice, not production measurements. For each pair: commit to a base design, walk the adverse timeline, revise the mechanism, then re-evaluate after the changed constraint. A proposed check is not evidence that it was run.

## 1. Offline notes and conflicting edits

**Base assumptions:** 50,000 monthly users; each device edits up to 200 notes offline for 24 hours; reconnect sync target p95 under 10 minutes. Notes are user-owned; one active writer is common but multi-device edits occur.

**Invariant:** An acknowledged server revision is never silently lost; the UI distinguishes local pending edits from server-confirmed content. **Adverse timeline:** Device A edits offline; Device B updates the same note and syncs; A reconnects after its base revision is stale. Blind last-write-wins would erase B's content. **Mechanism revision:** Store an account-bound operation with base revision and stable ID; server detects conflict, preserves both versions or requests user resolution, and returns confirmed only after durable acceptance. Bound queue growth and mark unresolved edits.

**Changed constraint (variant):** A user logs out while edits remain pending and requests account-data deletion. Do not replay under the next account; apply the deletion contract to server and local copies, and surface any offline-device deletion limitation. **Rejected alternative:** Always-on local database with silent last-write-wins; it hides conflicts and does not solve cross-device authority. **Verification:** Simulate A/B concurrent edits, duplicate reconnect delivery, logout/account switch, and deletion while offline; assert no silent loss, cross-account replay, or false confirmation.

## 2. Chat send, deduplication, and ordering

**Base assumptions:** 100,000 daily active users; burst 5 messages/s per connection; send acknowledgment target p95 under 500 ms while online; temporary reconnect gaps up to 2 minutes. Conversation order is server-assigned.

**Invariant:** A user retry produces at most one message effect per stable client operation ID within the supported retry horizon, and accepted messages have an explicit conversation sequence. **Adverse timeline:** The server commits a send, its acknowledgment is lost, then the client reconnects and retries; a new transport-attempt ID would create a duplicate. Concurrent devices may also submit messages in overlapping order.

**Mechanism revision:** Keep the same operation ID across retries; set a maximum retry/replay horizon and retain deduplication records at least as long as that horizon. Within it, return the existing result for duplicates and use server sequence/ordering policy rather than device-clock order. After that retention expires, reconcile using durable message identity; if identity cannot be established, reject the retry as expired/indeterminate and require status reconciliation or a new user-confirmed send with a new operation ID. Never treat the same expired operation ID as a new message. Show pending until authoritative acknowledgment, then reconcile. Bound unacknowledged sends and backpressure.

**Changed constraint (variant):** Messages may contain attachments and the client can be backgrounded or terminated during upload. Separate resumable attachment transfer from message commit, tie the final message to verified attachment state, and make resume/cancellation semantics explicit. **Rejected alternative:** Treat socket write or local bubble insertion as delivery; neither proves server acceptance. **Verification:** Drop acknowledgment after commit, retry within the retained horizon and verify the original result; then retry the same operation ID after retention, remove any short-lived dedup entry, and verify durable identity returns the same message or the client receives an explicit expired/indeterminate result that remains pending for reconciliation—never a second message. Also duplicate/reorder retries, run two devices concurrently, interrupt upload, and verify one logical message, declared ordering, and correct pending/failed/confirmed UI.


## 3. Online-only banking authorization

**Base assumptions:** 20,000 payment attempts/hour peak; authorization decision target p99 under 2 seconds; the client requires a current server decision before presenting an accepted payment. No offline authorization is allowed.

**Invariant:** The client never represents a payment as authorized without an authoritative server result. **Adverse timeline:** User submits during a network partition; a local optimistic “success” is shown; request outcome is unknown and user retries. This can misstate authorization or create a duplicate operation.

**Mechanism revision:** Disable offline acceptance; show submitting/unknown separately from authorized/declined; use stable business-operation identity across safe retries and query/reconcile an indeterminate result. Keep credentials in platform-appropriate secure storage and avoid persisting payment secrets in queued payloads.

**Changed constraint (variant):** The API can commit authorization while the response is lost and the client can be killed before reconciliation. Persist only a non-sensitive operation reference if justified; on restart query authoritative status and retain unknown until resolved. **Rejected alternative:** Queue authorization for background execution; a later schedule cannot satisfy a current authorization decision. **Verification:** Deny network, kill during submission, lose the response after server commit, retry with same identity, and assert no local success before authoritative status and no duplicate business effect.

## 4. Resumable media upload

**Base assumptions:** 5,000 uploads/day; media up to 2 GiB; interrupted mobile connectivity is common; resume should continue without restarting completed chunks, with a user-visible progress estimate and bounded local staging. **Synthetic SLO:** p95 time from eligible foreground resume to first server-acknowledged byte is under 15 minutes, measured only while the user is authenticated, the app remains foregrounded, and a usable network connection is available. Time suspended/backgrounded or offline is excluded; this is not a background scheduling or completion-time guarantee.

**Invariant:** The server exposes a completed asset only after all required bytes and integrity checks are accepted. **Adverse timeline:** A chunk is accepted but its acknowledgment is lost; the app retries after process death. Naive append duplicates bytes or finalizes a truncated object.

**Mechanism revision:** Negotiate an upload session, use stable chunk/range identity and checksums, make repeated chunks idempotent, and finalize only after server-side completeness/integrity validation. Expire abandoned sessions and clean up temporary local/server data. Bound concurrency, disk, and network usage; expose cancellation and indeterminate finalization.

**Changed constraint (variant):** The OS may suspend the app for an unbounded interval and the user may log out or request deletion before resume. Treat persisted work as best-effort scheduling, bind session credentials to the account, reauthorize before resuming, and cancel/expire plus delete material copies as policy requires.

**Rejected alternative:** Claim exact background completion time or restart the entire upload after every interruption; neither fits mobile lifecycle and resource constraints. **Verification:** Interrupt after a committed chunk with lost acknowledgment, terminate/restart, retry the chunk, expire a session, cancel, logout, and delete; assert no duplicate/corrupt final asset, no cross-account resume, and bounded cleanup. For the SLO, timestamp eligible foreground resume and first server-acknowledged progress under authenticated usable-network conditions across representative sessions; compute p95 against 15 minutes and report suspended/backgrounded or offline intervals separately as excluded, not as successful samples.
