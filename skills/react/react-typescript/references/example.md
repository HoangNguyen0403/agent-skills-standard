# React TypeScript Examples

## Typed Props with Native Element Extension

```tsx
// Extend native button with custom variants
type ButtonProps = ComponentProps<'button'> & {
  variant?: 'primary' | 'secondary';
};

function Button({ variant = 'primary', ...props }: ButtonProps) {
  return <button className={`btn-${variant}`} {...props} />;
}
```

## Generic Component

```tsx
type ListProps<T> = {
  items: T[];
  getKey: (item: T) => string | number;
  render: (item: T) => ReactNode;
};

function List<T>({ items, render, getKey }: ListProps<T>) {
  return <ul>{items.map((item) => <li key={getKey(item)}>{render(item)}</li>)}</ul>;
}

// Usage
<List items={users} getKey={(u) => u.id} render={(u) => <span>{u.name}</span>} />
```

## Hook Ref Typing

```tsx
// DOM ref — must be nullable
const inputRef = useRef<HTMLInputElement>(null);

// Mutable value ref — non-null
const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
```

## Polymorphic `as` Prop Pattern

```tsx
type BoxProps<T extends React.ElementType = 'div'> = {
  as?: T;
} & React.ComponentPropsWithoutRef<T>;

function Box<T extends React.ElementType = 'div'>({ as, ...props }: BoxProps<T>) {
  const Component = as ?? 'div';
  return <Component {...props} />;
}

// <Box as="section" className="wrapper" />
```
