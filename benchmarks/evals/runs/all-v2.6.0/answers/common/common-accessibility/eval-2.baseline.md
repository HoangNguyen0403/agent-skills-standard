# Login-form accessibility audit

The form has several accessibility problems:

- `div` elements are not form controls. Replace them with native `<input>` elements (and a real `<button type="submit">`) so keyboard interaction, form submission, validation, and assistive-technology semantics work by default.
- Give every input a persistent, visible `<label>` and connect it with `htmlFor`/`id`. Placeholder text is only a hint: it disappears while typing, is often low contrast, and does not provide a reliable accessible name.
- Use the appropriate input types and attributes, such as `type="email"`, `type="password"`, `autocomplete="username"`, and `autocomplete="current-password"`. Do not disable paste or password-manager use.
- Preserve a visible `:focus`/`:focus-visible` indicator on every interactive element. A blue submit button is not a problem by itself, but its text/background contrast must meet the applicable contrast requirement, and the focus indicator must be clearly distinguishable from the unfocused state. Do not remove the browser outline without providing an equivalent.
- Ensure the form can be completed in a logical DOM and tab order. The submit control should be reachable by keyboard and have an accessible name such as “Sign in.”
- Associate instructions and validation messages with their fields using `aria-describedby`; use `aria-invalid="true"` only when a field currently has an error. Error text should explain how to fix the problem and should not rely on color alone.
- If authentication fails, expose a concise error summary or status message, move focus to the most useful place (usually the summary or first invalid field), and make the message available to screen readers without stealing focus unnecessarily.
- Check contrast for labels, input text, borders, error indicators, and the button in all states. Make sure zoom/reflow and touch targets remain usable.

A basic structure is:

```html
<form>
  <div>
    <label for="email">Email address</label>
    <input
      id="email"
      name="email"
      type="email"
      autocomplete="username"
      aria-describedby="email-error"
    />
    <p id="email-error" role="alert"></p>
  </div>

  <div>
    <label for="password">Password</label>
    <input
      id="password"
      name="password"
      type="password"
      autocomplete="current-password"
    />
  </div>

  <button type="submit">Sign in</button>
</form>
```

The error element should be rendered only when it contains a real message, and the corresponding input should then receive `aria-invalid="true"`. Verify the result with keyboard-only use, browser zoom/reflow, and at least one screen reader rather than relying only on an automated scan.

