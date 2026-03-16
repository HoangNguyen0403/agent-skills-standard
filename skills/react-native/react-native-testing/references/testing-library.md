# React Native Testing Reference

Setup and patterns for high-quality mobile testing.

## RNTL Setup & Configuration

```javascript
// jest-setup.js
import 'react-native-gesture-handler/jestSetup';

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Silence warnings
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
```

## Testing Context & Providers

Use a custom render function to wrap components with necessary providers.

```tsx
// test-utils.tsx
const AllTheProviders = ({ children }) => (
  <ThemeProvider>
    <NavigationContainer>{children}</NavigationContainer>
  </ThemeProvider>
);

const customRender = (ui, options) =>
  render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react-native';
export { customRender as render };
```

## Integration Test Flow

Testing a full user flow including navigation and API calls.

```tsx
test('full login flow success', async () => {
  const { getByPlaceholderText, getByText } = render(<App />);

  fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
  fireEvent.changeText(getByPlaceholderText('Password'), 'password');
  fireEvent.press(getByText('Login'));

  // Wait for navigation after successful login
  await waitFor(() => {
    expect(getByText('Welcome back, Test User')).toBeTruthy();
  });
});
```

## Mocking Navigation

```tsx
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

test('navigates to details on press', () => {
  const { getByText } = render(<Card id='1' />);
  fireEvent.press(getByText('View Details'));
  expect(mockNavigate).toHaveBeenCalledWith('Details', { id: '1' });
});
```
