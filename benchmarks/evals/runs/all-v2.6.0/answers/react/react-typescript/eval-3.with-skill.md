Yes. Avoid `React.FC`: its implicit children and extra typing behavior are less explicit. Define an `interface Props` and a plain function instead:

```tsx
interface Props { title: string; children?: React.ReactNode; }
function Component({ title, children }: Props): JSX.Element { return <section>{title}{children}</section>; }
```
