# Refactoring a 400-line screen

Start by writing or preserving tests for the screen’s observable behavior. Then separate responsibilities in small, verifiable steps:

1. Move HTTP calls, request types, and response mapping into a feature API module.
2. Move reusable business rules into pure functions or a domain/service module.
3. Extract data-fetching and mutation orchestration into a custom hook, or use a server-state library such as TanStack Query.
4. Extract presentational sections into components that receive explicit props and callbacks.
5. Keep the screen as a composition layer: read route params, call the hook, and render loading/error/data states.

For example, the screen can use `const {data, isPending, error, retry} = useOrder(id)` and pass `data` to `OrderView`. Keep local UI state such as a modal’s visibility local; do not move every state value into a global store. Define dependencies at module boundaries so API and domain code can be unit tested without rendering. Refactor one responsibility at a time and run tests, TypeScript, and lint after each extraction.

