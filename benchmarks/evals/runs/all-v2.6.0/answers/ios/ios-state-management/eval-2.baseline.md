Common anti-patterns in iOS state management include:

- Using global mutable state everywhere, which makes behavior hard to predict and test.
- Duplicating the same state in multiple places so different views can drift out of sync.
- Letting views own too much business state and logic instead of separating UI state from app/domain state.
- Mutating state from many code paths without a clear single source of truth.
- Tight coupling between networking, persistence, and UI state updates.
- Overusing singletons or NotificationCenter for core state flow, which hides dependencies.
- Updating state off the main thread in UI-driven code, causing race conditions or inconsistent rendering.
- Creating massive view models/controllers that mix navigation, side effects, and presentation state.
- Treating derived state as stored state, increasing bugs and synchronization overhead.
- Lacking unidirectional data flow, so it becomes unclear what changed state and why.
- Ignoring lifecycle issues, such as state being recreated unexpectedly or retained too long.
- Not making state observable in a disciplined way, leading to manual refresh bugs.

In general, the biggest issues are unclear ownership, multiple sources of truth, and uncontrolled mutation.

