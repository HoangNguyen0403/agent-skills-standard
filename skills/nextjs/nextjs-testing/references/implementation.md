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

## Inline Examples

```typescript
// tests/unit/post-card.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PostCard } from '@/components/post-card';

test('calls onLike when heart button is clicked', async () => {
  const onLike = vi.fn();
  render(<PostCard title="Hello" onLike={onLike} />);
  await userEvent.click(screen.getByRole('button', { name: /like/i }));
  expect(onLike).toHaveBeenCalledOnce();
});
```

```text
tests/
├── unit/               # Vitest + RTL
├── e2e/                # Playwright
└── mocks/              # MSW Handlers
```
