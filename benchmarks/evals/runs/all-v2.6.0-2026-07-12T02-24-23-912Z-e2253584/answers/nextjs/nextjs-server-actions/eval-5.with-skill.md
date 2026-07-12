Use `useActionState` in a Client Component to bind a Server Action and expose its returned state:

```tsx
const [state, formAction, pending] = useActionState(action, initialState)
return <form action={formAction}>...</form>
```

The action should return a serializable success/error state, validate inputs, authenticate/authorize, and revalidate after success. Use `pending` for disabled controls; keep redirects and thrown errors in the action’s expected control flow rather than swallowing them.

