Assuming React + TypeScript with `fetch`, debounce by 300 ms and abort the active request whenever the query changes:

```tsx
const [query, setQuery] = useState("");
const [products, setProducts] = useState<Product[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  const controller = new AbortController();

  const timeoutId = window.setTimeout(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/products?search=${encodeURIComponent(query.trim())}`,
        { signal: controller.signal }
      );

      if (!response.ok) {
        throw new Error("Failed to load products");
      }

      const data: Product[] = await response.json();

      if (!controller.signal.aborted) {
        setProducts(data);
      }
    } catch (err) {
      if ((err as DOMException).name !== "AbortError") {
        setError("Unable to load products");
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, 300);

  return () => {
    window.clearTimeout(timeoutId);
    controller.abort(); // Cancels the previous request on new input/unmount
  };
}, [query]);

return (
  <>
    <input
      value={query}
      onChange={(event) => setQuery(event.target.value)}
      placeholder="Search products"
      type="search"
    />

    {/* Render products, loading, and error states */}
  </>
);
```

This waits 300 ms after the last keystroke and cancels both the pending debounce and any in-flight request when a new search starts.
