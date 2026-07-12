# Common mobile UX anti-patterns

- Replacing familiar platform navigation with custom gestures, hidden menus, or inconsistent back behavior. Users should not have to discover the basic structure of the app.
- Making controls too small, tightly packed, or difficult to reach with one hand; placing destructive and primary actions next to one another without an intentional distinction.
- Using unlabeled icons, placeholder text as the only field label, low-contrast text, tiny typography, or color alone to communicate meaning. These choices harm comprehension and accessibility.
- Designing only the ideal connected state. Missing loading, empty, offline, timeout, permission, validation, and error states leaves users without a clear next step.
- Showing indefinite spinners, blocking the entire interface for a small request, or providing no confirmation that a tap succeeded. Conversely, using excessive animation, vibration, or transient toasts for important information also causes confusion.
- Clearing entered data after validation or network failure, silently failing, or presenting technical error messages without an actionable recovery path.
- Requesting permissions at launch without explaining the benefit, requesting more access than necessary, or making core functionality unusable when a nonessential permission is denied.
- Ignoring keyboard, safe-area, rotation, system bars, text scaling, localization, right-to-left layout, dark mode, reduced motion, and screen-reader semantics.
- Relying on precise swipes, drag targets, or multi-finger gestures without an accessible alternative; intercepting system gestures or preventing normal scrolling.
- Making network operations non-idempotent, retrying automatically without limits, or allowing duplicate submissions when the user taps repeatedly.
- Overloading a screen with competing calls to action, long unstructured forms, unexplained jargon, or modal dialogs for routine information. This increases cognitive load and interrupts the user's task.
- Treating a desktop layout as a mobile design by merely shrinking it, or testing only on one recent high-end device and a fast network.
