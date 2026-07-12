Treat API data as server state and use @tanstack/react-query. The query cache owns fetching, deduplication, stale times, refetching, loading, and error states, so the component reads query data directly instead of copying it into useState.

Use mutations to update server data and invalidate or update affected query keys. Keep only genuinely local UI state in useState and reserve Zustand or Redux for client state that is not a cache of the server response.



