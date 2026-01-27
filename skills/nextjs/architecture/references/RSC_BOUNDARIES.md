# RSC Boundaries & Serialization

Rules for passing data between Server and Client Components.

## **The Golden Rule**

Props passed from Server → Client must be **JSON-serializable**.

## **Forbidden Types**

If you pass these, the app will crash or methods will be stripped:

- **Functions**: (Exception: Server Actions marked with `'use server'`).
- **Date Objects**: Move `.toISOString()` to the server.
- **Class Instances**: Methods are lost; pass a plain object instead.
- **Complex Types**: `Map`, `Set`, `Symbol`.

## **Recommended Patterns**

### 1. Handling Dates

```tsx
// ❌ Server
<ClientComponent date={new Date()} />

// ✅ Server
<ClientComponent date={post.createdAt.toISOString()} />
```

### 2. Handling Functions

```tsx
// ❌ Server
<ClientButton onClick={() => console.log('hit')} />;

// ✅ Client Component
('use client');
export function ClientButton() {
  return <button onClick={() => console.log('hit')}>...</button>;
}
```

### 3. Server Actions (The Exception)

Functions exported from a `'use server'` file CAN be passed as props.

```tsx
// ✅ Valid
import { submitAction } from './actions';
<ClientForm action={submitAction} />;
```

## **Quick Verification**

- [ ] Are all props serializable (Strings, Numbers, Booleans, Plain Objects/Arrays)?
- [ ] Did you convert `Dates` to strings on the server?
- [ ] Are `async` functions strictly limited to Server Components?
