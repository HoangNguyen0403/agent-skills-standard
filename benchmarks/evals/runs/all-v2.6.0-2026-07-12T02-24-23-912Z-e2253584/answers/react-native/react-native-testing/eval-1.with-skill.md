Render the component with React Native Testing Library, find the control by an accessible role or visible text, press it, and assert the user-visible result:

render(<Counter />);
fireEvent.press(getByRole('button', { name: /increment/i }));
expect(getByText('Count: 1')).toBeTruthy();

Prefer getByRole or getByText over testID, and use waitFor or findBy queries for asynchronous updates. Test behavior rather than component implementation details.



