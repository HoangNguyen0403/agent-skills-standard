# React Testing Reference

Advanced testing patterns and integration testing.

## References

- [**Mocking Patterns**](mocking.md) - API, module, and component mocking.
- [**Integration Tests**](integration-tests.md) - Testing component interactions.

## Mocking API Calls

```jsx
// Using MSW (Mock Service Worker)
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.get('/api/users/:id', (req, res, ctx) => {
    const { id } = req.params;
    return res(
      ctx.json({ id, name: 'John Doe', email: 'john@example.com' })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('fetches and displays user', async () => {
  render(<UserProfile userId="1" />);
  
  expect(await screen.findByText('John Doe')).toBeInTheDocument();
});

// Override handler for error case
test('handles fetch error', async () => {
  server.use(
    rest.get('/api/users/:id', (req, res, ctx) => {
      return res(ctx.status(500));
    })
  );
  
  render(<UserProfile userId="1" />);
  
  expect(await screen.findByText(/error/i)).toBeInTheDocument();
});
```

## Testing Context

```jsx
import { render, screen } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

function TestComponent() {
  const { user } = useAuth();
  return <div>{user ? user.name : 'Not logged in'}</div>;
}

test('provides auth context', () => {
  const mockUser = { id: '1', name: 'John' };
  
  render(
    <AuthProvider initialUser={mockUser}>
      <TestComponent />
    </AuthProvider>
  );
  
  expect(screen.getByText('John')).toBeInTheDocument();
});
```

## Testing Forms

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';

test('submits form with credentials', async () => {
  const onSubmit = jest.fn();
  const user = userEvent.setup();
  
  render(<LoginForm onSubmit={onSubmit} />);
  
  await user.type(screen.getByLabelText(/email/i), 'john@example.com');
  await user.type(screen.getByLabelText(/password/i), 'password123');
  await user.click(screen.getByRole('button', { name: /login/i }));
  
  expect(onSubmit).toHaveBeenCalledWith({
    email: 'john@example.com',
    password: 'password123',
  });
});

test('shows validation errors', async () => {
  const user = userEvent.setup();
  
  render(<LoginForm />);
  
  await user.click(screen.getByRole('button', { name: /login/i }));
  
  expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
});
```

## Testing with React Router

```jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Dashboard } from './Dashboard';

test('renders dashboard at /dashboard', () => {
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </MemoryRouter>
  );
  
  expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
});
```

## Component Integration Tests

```jsx
test('user can complete full workflow', async () => {
  const user = userEvent.setup();
  
  render(<App />);
  
  // Navigate to form
  await user.click(screen.getByRole('link', { name: /create user/i }));
  
  // Fill form
  await user.type(screen.getByLabelText(/name/i), 'Jane Doe');
  await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
  
  // Submit
  await user.click(screen.getByRole('button', { name: /submit/i }));
  
  // Verify success
  expect(await screen.findByText(/user created/i)).toBeInTheDocument();
});
```
