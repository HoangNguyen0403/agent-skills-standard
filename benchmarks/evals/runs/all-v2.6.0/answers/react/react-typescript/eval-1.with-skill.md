Use an explicit interface and `PropsWithChildren` or `ReactNode`:

```tsx
interface Props { className?: string; children: React.ReactNode; }
function Panel({ className, children }: Props): JSX.Element { return <div className={className}>{children}</div>; }
```

Avoid `React.FC`; use `ComponentPropsWithoutRef<'div'>` when extending native div props.
