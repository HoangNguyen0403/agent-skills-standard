~~~jsx
import { render, screen } from '@testing-library/react';
import { UserCard } from './UserCard';

test('shows the user name and email', () => {
  render(<UserCard name="Ada Lovelace" email="ada@example.com" />);

  expect(screen.getByRole('heading', { name: 'Ada Lovelace' })).toBeInTheDocument();
  expect(screen.getByText('ada@example.com')).toBeInTheDocument();
});
~~~

Adjust the role or accessible name to match the component's semantic markup. Prefer user-visible queries and avoid testing internal state or class names.
