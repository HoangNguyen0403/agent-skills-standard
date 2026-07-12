A red border is only a visual cue, so it is insufficient by itself. Make the error state available through text, semantics, and focus behavior:

- Keep a visible, specific error message next to the field, such as “Email address must contain an @.” Do not rely on the border or red color alone; add an icon only if it has an accessible name or is marked decorative.
- Give the input `aria-invalid="true"` while invalid and connect it to the message with `aria-describedby`. Keep the normal `<label>` in place; do not use the error text as the only label.
- Announce newly displayed errors with a suitable live mechanism, for example an error message with `role="alert"` for an immediate validation error, or a polite live region for non-critical asynchronous status. Avoid repeatedly interrupting the user on every keystroke.
- On submit, provide an error summary when there are multiple errors and move focus to the summary or the first invalid field. The summary should link to each invalid control. Preserve logical keyboard order and never trap focus unintentionally.
- Ensure the error message text has at least 4.5:1 contrast against its background. The red border/state indicator must be distinguishable at at least 3:1 against adjacent colors, and focus styling must remain separately visible. Test the error state in light/dark themes and high-contrast modes.
- State the invalid condition in text or another non-color form, and ensure errors are conveyed consistently to keyboard and screen-reader users. Correct the error when the value becomes valid and remove `aria-invalid` when appropriate.

Example:

```html
<label for="email">Email address</label>
<input id="email" name="email" type="email"
       aria-invalid="true" aria-describedby="email-error">
<p id="email-error" role="alert">Enter a valid email address.</p>
```

Verify with axe-core, a keyboard-only pass, NVDA or VoiceOver, 200% zoom, and a color-contrast check. The goal is that the same error is understandable without seeing color and is announced when it appears.

