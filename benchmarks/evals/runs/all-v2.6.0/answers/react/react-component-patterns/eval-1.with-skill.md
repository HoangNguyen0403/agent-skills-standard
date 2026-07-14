Use the Compound Components pattern: `<Select>` owns the value and `React.createContext()` shares state, while `<Select.Option>` consumes that Context directly.

```tsx
<Select value={value} onChange={setValue}>
  <Select.Option value="a">A</Select.Option>
</Select>
```
