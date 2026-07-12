Analyze a production-mode build with the tool matching the bundler: rollup-plugin-visualizer for Vite/Rollup, webpack Bundle Analyzer for webpack, or source-map-explorer. Inspect initial and lazy chunks.

Look for duplicate packages, whole-library imports, large locale/data files, polyfills, and assets on the critical path. Record a baseline, then apply tree-shaking-friendly imports, code splitting, and dependency or asset changes. Add CI budgets for compressed and uncompressed output and validate real metrics such as LCP, not only a treemap.
