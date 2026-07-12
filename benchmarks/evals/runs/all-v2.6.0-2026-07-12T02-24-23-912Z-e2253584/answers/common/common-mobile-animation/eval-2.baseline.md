# Common mobile animation anti-patterns

- Animating without a purpose. Decorative motion that delays a task, competes with content, or makes the interface feel busy should be removed or reduced.
- Using one duration and easing curve everywhere. A modal, a pressed button, a list insertion, and a navigation transition have different perceptual needs; a single global value usually makes some interactions feel sluggish and others abrupt.
- Using linear motion by default. Constant-speed movement often feels mechanical. Choose easing or a spring based on whether the element is entering, leaving, responding, or physically settling.
- Animating layout-expensive properties frame by frame. Repeated constraint solving, measurement, large shadows, blur, and complex vector or image effects can cause dropped frames. Prefer transforms and opacity, simplify the content during motion, or use the platform’s optimized layout transition APIs.
- Starting unbounded or duplicated animations. Timers and repeated callbacks can create animation storms, retain screens, drain battery, and cause a property to be updated by multiple owners. Scope animation work to the visible lifecycle and cancel or replace stale work.
- Ignoring interruption and reversal. A user can tap twice, swipe back, rotate the device, navigate away, or receive new data mid-transition. If the code assumes completion, the UI can freeze, jump, or end in the wrong state. Make transitions restartable and commit a deterministic final state.
- Coupling correctness to animation completion. Saving data, changing authorization, or updating navigation should not depend on a visual callback that may be cancelled or skipped.
- Blocking interaction until motion finishes. Keep touch targets, focus, and cancellation available unless temporarily disabling input is necessary to prevent a real duplicate action.
- Ignoring reduced-motion settings. Continuous parallax, zooming, bouncing, and large travel distances can cause discomfort. Provide a reduced or instant alternative and test it.
- Creating motion that harms accessibility or comprehension. Do not flash content, move controls unexpectedly, hide important information behind a long transition, or use motion as the only signal of state. Pair motion with labels, color, or structure.
- Assuming every device has the same frame budget. Test different refresh rates, low-end hardware, thermal throttling, background load, large text, and long lists. A smooth emulator or flagship phone is not sufficient evidence.
- Overusing physics and overshoot. Excessive bounce, elastic scaling, or parallax can make a product feel playful when the context requires clarity and can cause visual instability.
- Testing only screenshots or exact frame counts. Animation tests should verify state, cancellation, accessibility behavior, and performance budgets; exact intermediate frames are often brittle across devices and refresh rates.
