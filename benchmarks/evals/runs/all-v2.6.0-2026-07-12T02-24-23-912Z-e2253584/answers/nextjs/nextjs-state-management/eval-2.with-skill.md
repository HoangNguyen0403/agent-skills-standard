Do not mirror server data into `useState` and fetch it in `useEffect`. Fetch initial/server-owned data in a Server Component, or use SWR/TanStack Query when the client needs revalidation, polling, or optimistic updates. Keep `useState` for local UI state, and use a Client Component boundary only where interaction requires it.

