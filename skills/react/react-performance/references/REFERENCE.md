# React Performance Reference

Advanced optimization techniques and profiling.

## References

- [**Profiling**](profiling.md) - React DevTools Profiler usage.
- [**Bundle Analysis**](bundle-analysis.md) - Analyzing and reducing bundle size.

## React DevTools Profiler

```jsx
// Wrap components to profile
import { Profiler } from 'react';

function onRenderCallback(
  id, // component id
  phase, // "mount" or "update"
  actualDuration, // time spent rendering
  baseDuration, // estimated time without memoization
  startTime,
  commitTime,
  interactions
) {
  console.log(`${id} (${phase}) took ${actualDuration}ms`);
}

export function App() {
  return (
    <Profiler id="App" onRender={onRenderCallback}>
      <Dashboard />
    </Profiler>
  );
}
```

## Bundle Analysis

```bash
# Analyze bundle size
npm install --save-dev webpack-bundle-analyzer

# Add to webpack config or use with Vite
npm run build -- --analyze
```

## Image Optimization

```jsx
// Lazy loading images
function OptimizedImage({ src, alt }) {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
    />
  );
}

// Next.js Image component (automatic optimization)
import Image from 'next/image';

function Hero() {
  return (
    <Image
      src="/hero.jpg"
      alt="Hero"
      width={1200}
      height={600}
      priority
    />
  );
}
```

## Web Workers for Heavy Computation

```jsx
// worker.js
self.addEventListener('message', (e) => {
  const result = heavyComputation(e.data);
  self.postMessage(result);
});

// Component
import { useEffect, useState } from 'react';

function HeavyComponent({ data }) {
  const [result, setResult] = useState(null);

  useEffect(() => {
    const worker = new Worker(new URL('./worker.js', import.meta.url));
    
    worker.postMessage(data);
    worker.onmessage = (e) => {
      setResult(e.data);
      worker.terminate();
    };

    return () => worker.terminate();
  }, [data]);

  return <div>{result}</div>;
}
```

## Debouncing and Throttling

```jsx
import { useDeferredValue, useState } from 'react';

// Built-in deferred value
function SearchResults() {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  return (
    <>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      <Results query={deferredQuery} />
    </>
  );
}

// Manual debounce
import { useEffect, useState } from 'react';

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}
```
