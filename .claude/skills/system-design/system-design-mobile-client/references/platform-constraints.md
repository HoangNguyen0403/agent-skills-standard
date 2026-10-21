# Mobile platform constraints

Platform policies and quotas change. Treat the official documentation as the authority, state the platform/version and access date for concrete claims, and re-check before implementation. Accessed 2026-10-12.

## Android

Android's offline-first repository pattern reads through a canonical local source; that local source can use a relational database, DataStore, or files. The guide separately treats the network source as the actual application state. This pattern is not mandatory for online-only applications, and it does not make a relational local database mandatory. Keep local read behavior distinct from authoritative server acceptance for writes.

Persisted work such as WorkManager requests is suitable for deferrable work that must survive process restarts, but execution time depends on system constraints and scheduling. A persisted request is not an exact-time guarantee. Keep correctness independent of a precise background start time; make work idempotent/recoverable and expose delay where user-visible.

Sources: [Android offline-first data layer](https://developer.android.com/topic/architecture/data-layer/offline-first) (accessed 2026-10-12); [Persistent work with WorkManager](https://developer.android.com/develop/background-work/background-tasks/persistent) (accessed 2026-10-12).

## Apple platforms

Select a background strategy for the actual task and lifecycle. BackgroundTasks APIs let the system schedule eligible work; submission or persistence does not guarantee an exact start time or uninterrupted execution. Design resumable work around expiration/cancellation and preserve correctness if the process is suspended or terminated.

Use Keychain services for secrets/credentials when appropriate to the platform's protection and accessibility requirements. Choose accessibility and sharing semantics deliberately; do not treat general-purpose local storage as a credential vault. Deletion and logout behavior must include the app's own caches and queued payloads, not just the credential.

Sources: [Choosing Background Strategies](https://developer.apple.com/documentation/backgroundtasks/choosing-background-strategies-for-your-app) (accessed 2026-10-12); [Background Tasks](https://developer.apple.com/documentation/backgroundtasks) (accessed 2026-10-12); [Keychain Services](https://developer.apple.com/documentation/security/keychain_services) (accessed 2026-10-12).

## Design implication

State constraints as platform-specific assumptions, not cross-platform guarantees. Include OS/version, permitted background mode, expected suspension/termination, local storage and network limits, and evidence needed for any hard timing promise. Reassess these assumptions for each supported platform release.
