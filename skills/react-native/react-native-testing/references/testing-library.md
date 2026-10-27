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

## Screen Reader Accessibility & Roles (A11y Test)

```tsx
// Note: RNTL getByRole and getByLabelText verify accessibility tree attributes in-memory.
// They do NOT prove actual TalkBack/VoiceOver audio announcements or device focus traversal.
test('order button provides valid accessible role and label', () => {
  const { getByRole, getByLabelText } = render(
    <TouchableOpacity
      testID="submit-order-button"
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel="Submit order for 3 items"
      onPress={jest.fn()}
    >
      <Text>Submit Order</Text>
    </TouchableOpacity>
  );

  // Assert accessible role exists for screen reader
  expect(getByRole('button')).toBeTruthy();
  expect(getByLabelText('Submit order for 3 items')).toBeTruthy();
});
```

## Offline Mutation, Reconstruction & Reconnect (stateful, not mock calls)

Assert persisted state and server-side effects — a `setItem` call proves only that a setter ran. Use a stateful in-memory storage and a fake server that records effects.

```tsx
// Stateful doubles: storage survives "restart" via the same backing map;
// the fake server commits the effect before its response can be lost.
const makeStorage = (backing = new Map()) => ({
  setItem: async (k, v) => void backing.set(k, v),
  getItem: async (k) => backing.get(k) ?? null,
  _backing: backing,
});

class FakeServer {
  effects = [];
  ids = new Set();
  loseNextResponse = false;
  async flush(batch) {
    for (const mutation of batch) {
      if (this.ids.has(mutation.idempotencyKey)) continue; // retried key is a no-op
      this.ids.add(mutation.idempotencyKey);
      this.effects.push(mutation); // committed
    }
    if (this.loseNextResponse) {
      this.loseNextResponse = false;
      throw new Error('response lost after commit'); // client never saw the ack
    }
  }
}

test('pending mutation survives response loss and syncs exactly once', async () => {
  const storage = makeStorage();
  const order = { id: 'order_123', total: 49.99 };

  // 1. Queue while offline
  await new OfflineOrderQueue(storage).queueOrder(order);

  // 2. Reconstruct from persisted bytes (simulated app restart)
  const reconstructed = new OfflineOrderQueue(storage);
  const [queued] = await reconstructed.pending();
  expect(queued.idempotencyKey).toBeTruthy();

  // 3. Commit-then-response-loss: the server applied it, the client saw an error
  const server = new FakeServer();
  server.loseNextResponse = true;
  await expect(reconstructed.flush(server)).rejects.toThrow('response lost after commit');

  // 4. The mutation MUST stay pending with its ORIGINAL key (a fresh key duplicates the effect)
  const [retry] = await reconstructed.pending();
  expect(retry.idempotencyKey).toBe(queued.idempotencyKey);

  // 5. Retry: exactly one server effect, then the queue drains
  await reconstructed.flush(server);
  expect(server.effects).toHaveLength(1);
  expect(await reconstructed.pending()).toHaveLength(0);
});
```

- The queue must only drain after an acknowledged response; draining on send (or regenerating the key on retry) is the defect this case is designed to catch.
- This verifies the queue contract at the JS/storage-adapter boundary. It does **not** prove native secure storage, background sync scheduling or device network behavior; those require a native E2E case (`BLOCKED` without a device).
- Conflict policy comes from the approved requirement; do not assert an invented winner.
- Cleanup: clear the fake storage backing map after each test so a queued mutation cannot leak into the next one.
