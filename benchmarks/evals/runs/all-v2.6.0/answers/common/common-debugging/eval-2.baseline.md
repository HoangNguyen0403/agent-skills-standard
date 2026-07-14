Stop making untracked edits and establish a reproducible baseline. Random changes destroy evidence and make it unclear which change affected the result.

First record the exact symptom, expected behavior, reproduction steps, environment, inputs, logs, stack trace, and the last known working version. Reproduce it with a minimal case if possible. Then form one specific hypothesis at a time, stating what observation would support or falsify it.

Use a controlled loop:

1. Preserve the current state in a branch or commit and run the existing test suite to establish baseline failures.
2. Minimize the failing input and identify the first incorrect value or state transition, rather than focusing only on the final exception.
3. Inspect recent changes, configuration, dependencies, data, and external-service behavior relevant to that path.
4. Add a focused failing test or diagnostic assertion that captures the bug.
5. Make one small change, run the focused test and relevant integration tests, and compare results with the baseline.
6. Keep the change only if it explains and fixes the failure without introducing regressions; otherwise revert that experiment and record the …46541 tokens truncated…on, authorization, rate limits, pagination limits, and tenant/user isolation.

## Acceptance criteria

1. Given an eligible event, when processing succeeds, then exactly one authorized recipient notification appears in the center within one minute.
2. Given unread notifications, when the user opens the center, then the unread count and unread styling match persisted state.
3. Given a notification, when the user marks it read, then refresh and a second device reflect the new state if multi-device sync is supported.
4. Given a disabled optional category, when its event occurs, then no notification is delivered through that category’s disabled channel.
5. Given an unauthorized linked resource, when the user selects the notification, then no protected data is disclosed.
6. Given a duplicate event delivery, when it is retried, then no duplicate notification is created.

## Dependencies, risks, and rollout

Dependencies include an authenticated user model, event source contracts, deep-link routing, preference storage, and observability. Risks include event duplication, notification fatigue, stale links, and sensitive data leakage. Release behind a feature flag, pilot with internal users, monitor latency, delivery, duplicate, read, opt-out, and error metrics, then expand gradually with rollback by disabling creation and delivery while retaining safe history access.

