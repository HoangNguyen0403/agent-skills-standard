# Next.js Bundling & Package Compatibility

Fix common bundling issues with third-party packages in Server Components.

## **1. Server-Incompatible Packages**

Packages using browser APIs (`window`, `localStorage`, etc.) fail on the server.

### **Symptoms**

- `ReferenceError: window is not defined`
- `Module not found: Can't resolve 'fs'`

### **Solutions**

1. **Dynamic Import (Client Only)**:
   ```tsx
   import dynamic from 'next/dynamic';
   const NoSSRComponent = dynamic(() => import('@/components/heavy-lib'), {
     ssr: false,
   });
   ```
2. **Externalize from Server Bundle**:
   Use for native bindings (sharp, bcrypt) or problematic ORMs.
   ```js
   // next.config.js
   module.exports = { serverExternalPackages: ['bcrypt'] };
   ```
3. **Client Wrapper**: Wrap the library in a `'use client'` component.

## **2. ESM/CommonJS Compatibility**

If an ESM package fails in a CommonJS project (or vice-versa):

```js
// next.config.js
module.exports = { transpilePackages: ['some-esm-package'] };
```

## **3. Bundle Analysis (v16.1+)**

Analyze build size with the built-in analyzer:

```bash
next experimental-analyze
# next experimental-analyze --output (saves to .next/diagnostics/analyze)
```

## **4. CSS & Polyfills**

- **CSS**: Always use `import './styles.css'` or CSS Modules. Avoid manual `<link>` tags.
- **Polyfills**: Don't load external polyfills (e.g., polyfill.io). Next.js includes `fetch`, `Promise`, `Map`, `Set`, etc., by default.
