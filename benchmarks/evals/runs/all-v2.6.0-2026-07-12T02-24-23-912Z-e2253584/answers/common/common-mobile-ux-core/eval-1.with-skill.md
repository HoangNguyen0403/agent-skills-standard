# Common Mobile UX Core: Implementation Guide

Build mobile interfaces around touch, variable insets, on-screen keyboards, and platform conventions.

## Core implementation rules

1. **Size interactive targets generously.** Use at least 44 × 44 pt on iOS and 48 × 48 dp on Android. The visible icon may be smaller, but its tappable container should meet the minimum. Add padding rather than relying on a tiny glyph.
2. **Respect safe areas and system insets.** Keep content clear of notches, status bars, gesture areas, and navigation bars. Apply `SafeArea` in Flutter or `WindowInsets` handling on Android; also include bottom inset padding for fixed controls.
3. **Design for touch feedback.** Replace hover-only behavior with pressed/active states. Provide short haptic feedback where it confirms an important action, without making every tap noisy.
4. **Use readable text.** Keep body text at least 16 sp and target roughly 1.5× line height. Support dynamic text sizing and avoid layouts that clip or overlap when text grows.
5. **Make forms keyboard-aware.** Choose the correct input type (email, number, password, phone), set an appropriate keyboard action, and scroll or resize the form so the focused field and submit action remain visible.
6. **Follow the platform.** Use Material patterns on Android and Cupertino conventions on iOS where appropriate. Keep back navigation, dialogs, switches, system gestures, and destructive-action confirmation familiar to the user.

## Validation checklist

Test with one hand, large text, screen readers, portrait and landscape orientations, a visible keyboard, a notch/home indicator, and slow or interrupted network conditions. Verify that every action remains reachable and that no bottom control is hidden behind system UI.

