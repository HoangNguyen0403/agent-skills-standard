# Accessible form validation errors

A red border alone is insufficient because it may be invisible to people who are color-blind, have low vision, or use a screen reader. Use multiple signals and expose the error programmatically:

1. Put a clear text message next to the affected field, such as “Password must be at least 12 characters.” The message should state what is wrong and how to correct it.
2. Keep the field’s visible label. Do not replace it with the error or rely on placeholder text.
3. Set `aria-invalid="true"` on the invalid input and connect it to the message with `aria-describedby="field-error"`. Give the error a unique, stable `id`.
4. Announce dynamically added errors with an appropriate live-region behavior, commonly `role="alert"` for a concise immediate error or an `aria-live` region for status updates. Avoid repeatedly announcing the same message on every keystroke.
5. On submit, provide an error summary when there are multiple errors. Make the summary a heading or landmark with an accessible name, link each summary item to its field, and move focus to the summary or the first invalid field so keyboard and screen-reader users know that submission failed.
6. Preserve the user’s entered values and place focus predictably. Do not clear the form or move focus unexpectedly while the user is correcting an error.
7. Ensure the text, border/icon, and focus indicators have sufficient contrast. Add a non-color cue such as an icon with an accessible name, an explanatory message, or a pattern change, but do not use an icon without an accessible text alternative.
8. Keep errors associated with the correct control and update/remove `aria-invalid` and the message when the field becomes valid. Test errors from keyboard-only operation, zoom/reflow, and a screen reader.

Example:

```html
<label for="email">Email address</label>
<input
  id="email"
  name="email"
  type="email"
  aria-invalid="true"
  aria-describedby="email-error"
  class="input input--error"
/>
<p id="email-error" role="alert">
  Enter a valid email address, such as name@example.com.
</p>
```

The CSS class can add the red border, but the semantic state, explanatory text, focus behavior, and programmatic association are what make the error accessible.

