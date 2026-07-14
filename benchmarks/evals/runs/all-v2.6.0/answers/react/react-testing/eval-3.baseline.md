Use userEvent to fill the form as a user would, submit it, and assert the observable result or submitted callback. Mock the submit boundary:

~~~jsx
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { SignupForm } from './SignupForm';

test('submits completed fields', async () => {
  const user = userEvent.setup();
  const onSubmit = vi.fn();
  render(<SignupForm onSubmit={onSubmit} />);

  await user.type(screen.getByLabelText(/name/i), 'Ada Lovelace');
  await user.type(screen.getByLabelText(/email/i), 'ada@example.com');
  await user.click(screen.getByRole('button', { name: /submit/i }));

  expect(onSubmit).toHaveBeenCalledWith({
    name: 'Ada Lovelace',
    email: 'ada@example.com',
  });
});
~~~

Use jest.fn() with Jest instead of vi.fn(), and add separate tests for validation, pending, and failed-submit states.
