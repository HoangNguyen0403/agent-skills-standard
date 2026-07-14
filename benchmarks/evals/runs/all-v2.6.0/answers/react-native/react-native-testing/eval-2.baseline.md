# Mocking AsyncStorage

Mock the storage boundary in Jest rather than replacing application behavior throughout the test. The AsyncStorage package provides a Jest mock in common setups:

```js
// jest.setup.js
import '@react-native-async-storage/async-storage/jest/async-storage-mock';
```

Alternatively, map the module to a small manual mock implementing the async methods the app uses (`getItem`, `setItem`, `removeItem`, `clear`) and reset its in-memory data in `beforeEach`. Keep the mock’s return values Promise-based and include rejection cases. Do not test AsyncStorage’s implementation; test that the app reads, writes, handles missing values, and responds to storage errors. For auth tokens or sensitive data, use a secure-storage abstraction and mock that interface instead of making tests depend on a concrete storage package. Ensure Jest’s module mapping matches the project’s RN preset and avoid leaking state between tests.

