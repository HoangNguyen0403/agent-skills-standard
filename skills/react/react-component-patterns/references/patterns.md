# React Component Patterns

## Composition (The "Slot" Pattern)

Avoid prop drilling by accepting `ReactNode` slots.

```tsx
export function Layout({
  children,
  aside,
}: {
  children: ReactNode;
  aside: ReactNode;
}) {
  return (
    <div className='grid'>
      <aside>{aside}</aside>
      <main>{children}</main>
    </div>
  );
}
```

## Compound Components

Manage implicit state between related components.

```tsx
export function Select({ children }: { children: ReactNode }) {
  const [val, setVal] = useState(null);

  return (
    <SelectContext.Provider value={{ val, setVal }}>
      <select value={val} onChange={(e) => setVal(e.target.value)}>
        {children}
      </select>
    </SelectContext.Provider>
  );
}
```

```tsx
Select.Option = ({ value, children }) => (
  <option value={value}>{children}</option>
);

// Usage
<Select>
  <Select.Option value='1'>One</Select.Option>
  <Select.Option value='2'>Two</Select.Option>
</Select>;
```

## Render Props

Invert control of rendering logic.

```tsx
<List renderItem={(item) => <CustomCard item={item} />} />
```
