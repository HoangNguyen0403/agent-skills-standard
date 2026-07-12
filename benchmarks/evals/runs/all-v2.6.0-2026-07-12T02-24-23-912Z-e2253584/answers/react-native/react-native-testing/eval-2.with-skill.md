Mock the native module at the Jest boundary, for example with jest.mock for @react-native-async-storage/async-storage, and provide deterministic getItem, setItem, and removeItem implementations. Reset or clear mock state between tests so one test's stored value cannot affect another.

Render the component through any required providers, exercise it with RNTL user-facing queries and events, and assert the resulting behavior. Keep the mock narrow and avoid testing the module's internals; integration tests should cover the real native behavior where the test environment permits.



