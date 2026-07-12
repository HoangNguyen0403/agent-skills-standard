This is a network waterfall. Measure request timing first, then fetch independent data in parallel with Promise.all, batch requests where possible, or move orchestration to an API that returns the required view model.

For genuinely dependent requests, cache each resource and avoid refetching on every render. A query library can deduplicate, cache, prefetch, and expose loading/error states. Verify the change with browser network traces and React Profiler so it reduces wait time rather than merely adding memoization.
