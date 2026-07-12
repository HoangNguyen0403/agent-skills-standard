Use composition rather than importing a Server Component into a Client Component:

```tsx
// Server component
<ClientShell><ServerContent /></ClientShell>
```

`ClientShell` accepts `children` and renders it, while `ServerContent` performs server data access. Props crossing the boundary must be serializable; functions, class instances, and raw sensitive objects do not cross safely. A Client Component cannot directly import a Server Component.

