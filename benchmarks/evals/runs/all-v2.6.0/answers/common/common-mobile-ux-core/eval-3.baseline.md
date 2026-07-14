# Quick-start mobile UX example

Imagine a grocery-list screen whose main task is adding an item and checking it off.

1. Put a clear title, a compact input labeled “Add item,” and one prominent “Add” action near the bottom of the screen where it is reachable by a thumb. Use a large enough input and button, and keep the keyboard from covering them.
2. Show list rows with the item name, a sufficiently large checkbox, and an accessible label such as “Mark milk as purchased.” Keep the row tap target generous and provide an alternative to any swipe-only action.
3. Define every important state: an empty message with an example, a visible loading state, an offline banner that explains local changes will sync later, a retryable sync error, and a success indication after adding an item. Preserve typed text if saving fails.
4. Use semantic headings and controls, adequate contrast, scalable text, screen-reader announcements for additions and errors, and layouts that work in dark mode, right-to-left locales, and large text settings.
5. Save local changes optimistically only when conflicts and rollback are handled. Make synchronization idempotent, prevent duplicate submissions, and show whether an item is pending, synced, or failed.
6. Verify the flow on a small phone, a large phone, slow and offline networks, keyboard-visible and rotated layouts, with a screen reader and large fonts. Track whether users add items successfully, how often they retry, and where they abandon the flow.

This small example demonstrates the core pattern: prioritize one task, use platform-standard interaction, make state and recovery explicit, and treat accessibility and unreliable mobile conditions as normal requirements.
