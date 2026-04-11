# Accessibility — Reference Examples

## Semantic Roles (HTML)

```html
<!-- ✅ Correct: semantic button -->
<button type="button" onclick="handleAction()">Submit Order</button>

<!-- ❌ Wrong: div as button -->
<div onclick="handleAction()">Submit Order</div>

<!-- ✅ Accessible form -->
<label for="email">Email address</label>
<input id="email" type="email" aria-describedby="email-error" />
<span id="email-error" role="alert">Please enter a valid email</span>
```

## ARIA Live Regions

```html
<!-- Status messages (non-disruptive) -->
<div aria-live="polite" aria-atomic="true">
  <!-- Content injected here is announced to screen readers -->
</div>

<!-- Critical alerts (disruptive) -->
<div role="alert">Session will expire in 2 minutes.</div>
```

## Focus Management (Modal)

```typescript
// Trap focus inside modal; return focus on close
function openModal(triggerEl: HTMLElement, modalEl: HTMLElement) {
  modalEl.removeAttribute('hidden');
  const focusable = modalEl.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  );
  focusable[0]?.focus();
  modalEl.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal(triggerEl, modalEl);
  });
}
function closeModal(triggerEl: HTMLElement, modalEl: HTMLElement) {
  modalEl.setAttribute('hidden', '');
  triggerEl.focus(); // Return focus to trigger
}
```

## Axe CI Gate (Jest/Vitest)

```typescript
import { axe } from 'jest-axe';

it('has no a11y violations', async () => {
  const { container } = render(<LoginForm />);
  expect(await axe(container)).toHaveNoViolations();
});
```
