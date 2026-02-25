# Ant Design in Next.js

Guidelines for using Ant Design effectively in Next.js, especially with the App Router and Server Components.

## RSC Compatibility

Ant Design (and most component libraries with runtime CSS-in-JS) requires specific handling for React Server Components.

1.  **Strict Client Borders**: Always wrap AntD components in a Client Component.
2.  **Theme Configuration**: Use the `ConfigProvider` for global styling.

```tsx
// src/components/ui/AntdRegistry.tsx
'use client';

import React, { useState } from 'react';
import { createCache, extractStyle, StyleProvider } from '@ant-design/cssinjs';
import { useServerInsertedHTML } from 'next/navigation';

export default function AntdRegistry({
  children,
}: {
  children: React.ReactNode;
}) {
  const [cache] = useState(() => createCache());
  useServerInsertedHTML(() => (
    <style
      id='antd'
      dangerouslySetInnerHTML={{ __html: extractStyle(cache, true) }}
    />
  ));
  return <StyleProvider cache={cache}>{children}</StyleProvider>;
}
```

## Performance

- **Tree Shaking**: Ensure your build setup supports tree shaking for `antd` to avoid bloated bundles.
- **Static Extraction**: When possible (Pages Router), utilize static CSS extraction.

## Guidelines

- **Form Management**: Use `Form` from `antd` for complex validations. Use the `form` instance hook.
- **Table Patterns**: Use `Table` with standard columns definitions. Manage sorting/filtering via state.
- **Modals**: Prefer the `Modal.method()` syntax (e.g., `Modal.confirm`) for simple alerts.
- **Customization**: Use the `ConfigProvider` for global theme tokens. Avoid overrides in global CSS.

## Anti-Patterns

- **Direct RSC Usage**: Do not use `import { Button } from 'antd'` directly in a Server Component without a `'use client'` wrapper.
- **No Custom Buttons**: Use `<Button />` from `antd`, do not build raw `<button>` elements.
- **No Manual Modals**: Avoid building custom "Glass" modals from scratch if `Modal` suffice.
- **No Mixed UI**: Do not mix `antd` with `MUI` or `Bootstrap`.
