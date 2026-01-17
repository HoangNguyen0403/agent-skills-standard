---
name: React Testing
description: Testing strategies for React components and hooks.
metadata:
  labels: [react, testing, jest, vitest, testing-library]
  triggers:
    files: ['**/*.test.jsx', '**/*.test.tsx', '**/*.spec.jsx', '**/*.spec.tsx']
    keywords: [test, expect, render, fireEvent, waitFor, jest, vitest]
---

# React Testing

## **Priority: P2 (MAINTENANCE)**

Standards for testing React applications.

## Implementation Guidelines

- **Testing Library**: Use React Testing Library for component tests. Query by user-visible elements.
- **Test Structure**: Use Arrange-Act-Assert pattern. Keep tests focused and isolated.
- **What to Test**:
  - User interactions (clicks, inputs, form submissions)
  - Component output based on props/state
  - Integration with context/hooks
  - Error states and loading states
- **What Not to Test**: Implementation details (state, lifecycle methods, internal functions).
- **Mocking**: Mock external dependencies (API calls, modules). Keep mocks close to tests.
- **Async Testing**: Use `waitFor`, `findBy` queries for async operations.
- **Coverage**: Aim for >80% coverage on critical user flows.

## Anti-Patterns

- **No Testing Implementation**: Don't test how components work internally.
- **No Snapshot Overuse**: Use sparingly. They're brittle and hard to review.
- **No Shallow Rendering**: Use full rendering with React Testing Library.
- **No `getByTestId` Unless Needed**: Prefer semantic queries (getByRole, getByLabelText).

## Code

```jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserProfile } from './UserProfile';

describe('UserProfile', () => {
  it('renders user information', () => {
    const user = { name: 'John Doe', email: 'john@example.com' };
    
    render(<UserProfile user={user} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', async () => {
    const user = { id: '1', name: 'John' };
    const onEdit = jest.fn();
    
    render(<UserProfile user={user} onEdit={onEdit} />);
    
    const editButton = screen.getByRole('button', { name: /edit/i });
    await userEvent.click(editButton);
    
    expect(onEdit).toHaveBeenCalledWith('1');
  });

  it('shows loading state while fetching', async () => {
    render(<UserProfile userId="1" />);
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
  });

  it('displays error message on fetch failure', async () => {
    // Mock API failure
    global.fetch = jest.fn(() => Promise.reject(new Error('API Error')));
    
    render(<UserProfile userId="1" />);
    
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});

// Testing custom hooks
import { renderHook, act } from '@testing-library/react';
import { useCounter } from './useCounter';

describe('useCounter', () => {
  it('increments counter', () => {
    const { result } = renderHook(() => useCounter());
    
    expect(result.current.count).toBe(0);
    
    act(() => {
      result.current.increment();
    });
    
    expect(result.current.count).toBe(1);
  });
});
```

## Reference & Examples

For testing patterns, mocking, and integration tests:
See [references/REFERENCE.md](references/REFERENCE.md).

## Related Topics

component-patterns | hooks | state-management
