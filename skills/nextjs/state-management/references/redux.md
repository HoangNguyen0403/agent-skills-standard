# Redux Toolkit (RTK) in Next.js

Best practices for integrating Redux Toolkit in Next.js projects, following the [Official Redux Style Guide](https://redux.js.org/style-guide/).

## **Priority: P1 (STANDARD)**

Follow these essential rules to ensure a scalable, performant, and maintainable state.

## Core Rules

1.  **Use Redux Toolkit (RTK)**: Always use `createSlice` and `configureStore`. Never write manual action creators or reducers.
2.  **Strict Immutability**: Never mutate state. RTK uses **Immer** internally, so you can write "mutative" code that is safely translated to immutable updates.
3.  **Actions as Events**: Treat actions as "describing events that occurred" (e.g., `cart/itemAdded`) rather than "setters" (`cart/setItems`).
4.  **Put Logic in Reducers**: Move as much logic as possible into reducers rather than in the component that dispatches the action.
5.  **Derive State**: Keep the store state minimal. Use **Selectors** (with `reselect`) to derive data (e.g., `selectVisibleTodos`).

## Folder Structure (Ducks Pattern)

Organize code by **feature**, not by type (reducers/actions/constants). Each feature folder should contain its own slice logic.

```text
src/features/
  ├── auth/
  │   ├── authSlice.ts    # Contains reducer, actions, and selectors
  │   └── login-form.tsx
  └── cart/
      └── cartSlice.ts
```

## Next.js Integration (App Router)

To avoid state leakage between requests in a multi-tenant environment:

### 1. Per-Request Store

Always create a new store instance for every request on the server.

```tsx
// src/lib/store.ts
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/features/auth/authSlice';

export const makeStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
    },
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
```

### 2. Store Provider Wrapper

Wrap client components that need Redux with a local provider to ensure the store is unique to the client session.

```tsx
// src/app/StoreProvider.tsx
'use client';
import { useRef } from 'react';
import { Provider } from 'react-redux';
import { makeStore, AppStore } from '@/lib/store';

export default function StoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const storeRef = useRef<AppStore>();
  if (!storeRef.current) {
    storeRef.current = makeStore();
  }
  return <Provider store={storeRef.current}>{children}</Provider>;
}
```

## Next.js Integration (Pages Router)

For legacy projects using the `pages/` directory, use `next-redux-wrapper` to handle server-side state synchronization.

### 1. Store Configuration

Use a wrapper to create a new store per request.

```tsx
// src/store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import { createWrapper } from 'next-redux-wrapper';
import authReducer from './authSlice';

export const makeStore = () =>
  configureStore({
    reducer: {
      auth: authReducer,
    },
  });

export const wrapper = createWrapper(makeStore);
```

### 2. Handling Hydration

You must handle the `HYDRATE` action from `next-redux-wrapper` in your reducers to sync server-side data into the client store.

```tsx
// src/store/authSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { HYDRATE } from 'next-redux-wrapper';

export const authSlice = createSlice({
  name: 'auth',
  initialState: { user: null },
  reducers: {
    /* ... */
  },
  extraReducers: (builder) => {
    builder.addCase(HYDRATE, (state, action: any) => {
      // Merge server-side state into client-side state
      return {
        ...state,
        ...action.payload.auth,
      };
    });
  },
});
```

### 3. Usage in Pages

```tsx
// pages/profile.tsx
import { wrapper } from '../store';

export const getServerSideProps = wrapper.getServerSideProps(
  (store) => async (context) => {
    // Dispatch actions on the server
    await store.dispatch(fetchUser(context.params.id));
    return { props: {} }; // Data will be hydrated automatically
  },
);
```

## Data Fetching (RTK Query)

Avoid using `useEffect` or manual thunks for data fetching. Use **RTK Query** for automated caching, deduplication, and loading states.

```tsx
// src/features/api/apiSlice.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  endpoints: (builder) => ({
    getUsers: builder.query({ query: () => '/users' }),
  }),
});

export const { useGetUsersQuery } = apiSlice;
```

## Anti-Patterns

- **Non-Serializable Values**: Never put Promises, Symbols, or Functions into the Redux state.
- **Connecting Everything**: Do not connect every tiny component to Redux. Use local `useState` for UI state (e.g., `isDropdownOpen`).
- **Sequential Dispatches**: Avoid dispatching multiple actions in a row. Use a single action that describes the event, and let multiple reducers respond.
- **Static Global Store**: Never use `export const store = configureStore(...)` in a Next.js app that uses SSR.
