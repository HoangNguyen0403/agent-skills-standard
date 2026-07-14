Objects are recreated on each render, so strict identity changes and the effect loops. Use primitive dependencies when possible or memoize the config:

```tsx
const config = useMemo(() => ({ id, type }), [id, type]);
```
