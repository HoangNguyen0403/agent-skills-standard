# Next.js Testing Reference

## Vitest & React Testing Library (Unit)

```tsx
// tests/components/Button.test.tsx
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/Button';

test('renders correctly', () => {
  render(<Button>Click me</Button>);
  expect(screen.getByText('Click me')).toBeDefined();
});
```

## Playwright (E2E)

```ts
// tests/e2e/home.spec.ts
import { test, expect } from '@playwright/test';

test('homepage has title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/My App/);
});
```

## Mock Service Worker (MSW)

```ts
// tests/mocks/handlers.ts
export const handlers = [
  http.get('/api/user', () => {
    return HttpResponse.json({ id: '1', name: 'Hoang' });
  }),
];
```
