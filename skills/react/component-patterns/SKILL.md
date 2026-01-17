---
name: React Component Patterns
description: Modern React component architecture and composition patterns.
metadata:
  labels: [react, components, composition, patterns]
  triggers:
    files: ['**/*.jsx', '**/*.tsx']
    keywords: [component, props, children, composition, hoc, render-props]
---

# React Component Patterns

## **Priority: P0 (CRITICAL)**

Standards for building scalable, maintainable React components.

## Implementation Guidelines

- **Function Components**: Always use function components with hooks. Never use class components for new code.
- **Composition**: Favor composition over inheritance. Use props.children and component composition.
- **Props**: Define explicit prop types with TypeScript or PropTypes. Destructure props in parameters.
- **Component Size**: Keep components small and focused (< 250 lines). Extract logic into custom hooks.
- **Naming**: Use PascalCase for components. Prefix custom hooks with `use`.
- **File Structure**: One component per file. Co-locate tests, styles, and related files.
- **Export**: Use named exports for better refactoring support.
- **Fragments**: Use `<>...</>` short syntax for fragments when no key is needed.
- **Conditional Rendering**: Use ternary operators or `&&` for simple conditions. Extract complex logic.

## Anti-Patterns

- **No Class Components**: Don't use class components. Use function components with hooks.
- **No Prop Drilling**: Don't pass props through multiple levels. Use Context or state management.
- **No Anonymous Components**: Don't define components inside other components.
- **No Index as Key**: Don't use array index as `key` prop unless list is static.
- **No Inline Functions in JSX**: Extract event handlers to avoid unnecessary re-renders.

## Code

```jsx
// Good component structure
import { useState } from 'react';
import { Button } from './Button';
import styles from './UserCard.module.css';

interface UserCardProps {
  user: {
    id: string;
    name: string;
    email: string;
  };
  onEdit: (userId: string) => void;
}

export function UserCard({ user, onEdit }: UserCardProps) {
  const [expanded, setExpanded] = useState(false);

  const handleEdit = () => {
    onEdit(user.id);
  };

  return (
    <div className={styles.card}>
      <h3>{user.name}</h3>
      {expanded && <p>{user.email}</p>}
      <Button onClick={handleEdit}>Edit</Button>
      <Button onClick={() => setExpanded(!expanded)}>
        {expanded ? 'Collapse' : 'Expand'}
      </Button>
    </div>
  );
}

// Composition pattern
export function Layout({ children, sidebar }) {
  return (
    <div className="layout">
      <aside>{sidebar}</aside>
      <main>{children}</main>
    </div>
  );
}

// Compound component pattern
export function Select({ children }) {
  const [value, setValue] = useState('');
  
  return (
    <select value={value} onChange={e => setValue(e.target.value)}>
      {children}
    </select>
  );
}

Select.Option = function SelectOption({ value, children }) {
  return <option value={value}>{children}</option>;
};

// Usage
<Select>
  <Select.Option value="1">Option 1</Select.Option>
  <Select.Option value="2">Option 2</Select.Option>
</Select>
```

## Reference & Examples

For advanced patterns (HOCs, Render Props, Compound Components):
See [references/REFERENCE.md](references/REFERENCE.md).

## Related Topics

hooks | state-management | performance
