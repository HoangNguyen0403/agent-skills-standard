# SDK/library system-design contract

Design the library as a contract embedded in a host application, not as an independently controlled service. Do not assume a particular language, framework, thread model, or persistence layer.

## Public behavior and compatibility

- Define stable inputs, outputs, errors, and observable completion semantics. Distinguish accepted, completed, cancelled, and failed operations; document partial results where applicable.
- State semantic-versioning policy, supported host/runtime versions, deprecation window, and compatibility guarantees for public APIs, serialized data, and wire contracts. A migration path must exist before removing a supported contract.
- Specify whether calls are synchronous, asynchronous, or callback/stream based, and who owns execution context, callbacks, and thread/actor affinity. Prevent undocumented callbacks on arbitrary threads.

## Cancellation and concurrency

- Define cancellation propagation, races with completion, cleanup, and whether cancellation stops local work, remote work, or both. Cancellation is not proof that a remote side effect was rolled back; expose the result as unknown when the outcome cannot be established.
- Set concurrency guarantees per client/handle/operation. Identify shared mutable state, ordering guarantees, and synchronization ownership. Require stable operation identity when a retry could repeat a side effect.

## Resource and host lifecycle

- Bound in-flight requests, buffers, retries, memory, disk, and network use; define backpressure or rejection behavior rather than allowing unbounded growth.
- Specify ownership and release of handles, streams, callbacks, temporary files, and background tasks. Respect host cancellation, process death, app lifecycle, and host-provided credentials/configuration.
- State which responsibilities belong to the SDK and which remain with the host (auth presentation, persistence, scheduling, UI, and policy). Avoid silently retaining credentials or data beyond the declared lifecycle.

## Failure and verification

Return typed, actionable failure outcomes that distinguish retryable, permanent, cancelled, unauthenticated, conflict, and indeterminate-remote-result cases when those distinctions affect safe caller behavior. Do not require callers to parse human-readable messages. Verify old supported clients against new server/library behavior, cancellation/completion races, concurrent calls, memory/network bounds, process interruption, and host cleanup. Evidence must identify tested versions and conditions; a design proposal is not compatibility test evidence.
