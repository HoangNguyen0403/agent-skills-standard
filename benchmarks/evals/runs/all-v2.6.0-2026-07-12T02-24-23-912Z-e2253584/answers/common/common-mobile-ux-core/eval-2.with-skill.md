# Common Mobile UX Core: Anti-Patterns

Avoid these failure modes in touch-first interfaces:

- **Tiny click targets:** A 16–24 px icon with no surrounding hit area is hard to tap accurately. Keep the interactive region at least 44 × 44 pt on iOS or 48 × 48 dp on Android.
- **Ignoring safe areas:** Fixed headers or bottom bars that overlap a notch, gesture indicator, or navigation bar can hide content and make actions unreliable. Apply safe-area/window-inset padding, including when the keyboard opens.
- **Hover-dependent interaction:** Mobile users have no cursor. Do not make essential actions appear only on hover; use visible affordances and pressed/active states.
- **Unreadable typography:** Body text below 16 sp, cramped line spacing, clipped labels, and layouts that fail with larger accessibility text create avoidable barriers. Use adequate line height and dynamic sizing.
- **Keyboard-obscured forms:** Do not leave the focused field behind the keyboard or require users to dismiss the keyboard before reaching the next action. Auto-scroll and configure the correct input type and action key.
- **Platform mixing:** Avoid blindly combining Material and Cupertino patterns, especially for navigation, dialogs, controls, and destructive actions. Respect the conventions of the target OS.
- **Unbounded haptics:** Feedback on every minor event can become distracting. Use short haptics selectively for meaningful confirmation and ensure the action also has visual feedback.
- **Fixed bottom UI without inset handling:** A bottom action bar that is merely positioned at the screen edge may collide with the home indicator or keyboard. Anchor it within the current safe/inset-aware layout.

The practical test is simple: every important action should be discoverable, comfortably tappable, visible in every system-inset state, and usable without precision gestures.

