Mock the network boundary rather than the component's fetch implementation. Mock Service Worker is a good default: define handlers for the API routes and deterministic success, empty, slow, and error responses. Render the component, assert loading, await the result, and assert the error state separately.

Reset handlers after each test and keep response data isolated. If a request should never occur, make the handler fail loudly. This keeps request behavior realistic without live-network flakiness; do not rely on sleeps or a real API.
