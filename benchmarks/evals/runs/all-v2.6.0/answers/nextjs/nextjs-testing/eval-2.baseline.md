Do not let component tests call real services. Mock at the network boundary with Mock Service Worker (MSW), defining handlers for the test API routes and starting the server in the test setup:

```ts
const server = setupServer(
  http.get('/api/profile', () => HttpResponse.json({ name: 'Sam' })),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

Use an absolute test API base URL when the application requires one, and keep handlers deterministic. Override a handler in a specific test to cover errors, latency, or unauthorized responses. Do not mock `fetch` differently in every test or silently allow unhandled calls; that hides production bugs and creates CI/network dependence. For Server Components, test data-access functions separately and use integration/E2E tests for the real route wiring. Ensure Jest/Vitest has the correct Node/jsdom environment and that MSW setup runs in CI.

