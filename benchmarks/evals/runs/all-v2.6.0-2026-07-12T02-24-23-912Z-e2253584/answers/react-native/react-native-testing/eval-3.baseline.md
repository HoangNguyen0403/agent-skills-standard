# Testing behavior instead of component internals

No. Tests that inspect `component.state` or `component.props` are coupled to implementation details and are not the recommended approach for modern React Native components. They can pass while the user-visible behavior is broken and fail during harmless refactors such as moving state into a hook.

Use React Native Testing Library to render the component and interact through accessible roles, labels, text, and realistic events. Assert visible output, navigation/callback contracts, loading/error states, and accessibility behavior. Mock external boundaries such as network and native modules, but do not mock the component’s state machinery. Use `userEvent`/`fireEvent` as appropriate and await async updates with `findBy...` or `waitFor`. Keep a small number of integration tests for flows spanning components, and reserve direct tests of pure functions for domain logic. This produces tests that protect behavior while allowing implementation changes.

