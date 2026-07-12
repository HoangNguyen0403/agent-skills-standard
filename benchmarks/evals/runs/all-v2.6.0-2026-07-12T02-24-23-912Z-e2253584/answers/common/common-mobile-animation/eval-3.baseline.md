# Quick-start mobile animation example

Example: animate a card expanding into a detail view.

1. Define the states first: `collapsed`, `expanded`, and `reducedMotionExpanded`. The card’s title, image, and destination data must be available independently of the animation.
2. On tap, update the interaction state immediately and start a shared-element or container-transform transition. Animate the card’s position and scale with a platform-supported transform, and animate opacity only for content that must cross-fade. Keep the destination screen’s layout stable where possible.
3. Use a short ease-out transition for the expansion, or a moderately damped spring if the design benefits from physical settling. Choose values from the app’s motion tokens rather than hard-coding a different curve on this screen.
4. Make the transition interruptible. If the user taps Back or swipes down, cancel the forward animation, reverse from the current progress, and end in the collapsed state. If navigation leaves the screen, cancel visual work and still complete the state update safely.
5. Respect reduced motion. When the system preference is enabled, skip the transform and use an immediate state change or a brief opacity change that does not alter spatial scale or create large movement.
6. Verify the result on a slow device and with large text. Confirm that the card reaches the correct final state after rapid repeated taps, rotation, backgrounding, and cancellation. Profile the transition to ensure images, shadows, and layout work do not exceed the frame budget.

A framework-neutral pseudocode sketch:

```text
onCardTapped(card):
    if prefersReducedMotion:
        state = EXPANDED
        return

    cancel(currentTransition)
    state = EXPANDING
    currentTransition = animate(
        from = currentProgress,
        to = 1.0,
        duration = motion.expandDuration,
        easing = motion.enterCurve,
        properties = [transform, opacity]
    )
    currentTransition.onFinished = () => state = EXPANDED

onBackOrDismiss():
    cancel(currentTransition)
    state = COLLAPSING
    currentTransition = animate(
        from = currentProgress,
        to = 0.0,
        duration = motion.reverseDuration,
        easing = motion.exitCurve,
        properties = [transform, opacity]
    )
    currentTransition.onFinished = () => state = COLLAPSED
```

The callback only records the visual end state; navigation, persistence, and other correctness-critical actions should be performed by the state transition itself. In production, use the native animation and accessibility APIs for the target platform, and instrument dropped frames and cancellation paths.
