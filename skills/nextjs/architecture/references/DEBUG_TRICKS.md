# Next.js Debugging & MCP Protocol

## **1. MCP AI-Assisted Debugging**

Next.js 16+ exposes a Model Context Protocol endpoint for agents to inspect the app state.

- **Endpoint**: `/_next/mcp`
- **Config (<v16)**: `experimental: { mcpServer: true }`

### **Common AI Tools**

- `get_errors`: Retrieves build and runtime errors with source maps.
- `get_routes`: Lists all filesystem-based routes.
- `get_page_metadata`: Segment trie (layouts/boundaries) for active page.
- `get_logs`: Retrieves dev server log path.

## **2. Build Debugging**

Rebuild specific routes (v16+) to isolate build errors without a full project rebuild.

```bash
# Specific route
next build --debug-build-paths "/dashboard"

# Dynamic route
next build --debug-build-paths "/blog/[slug]"
```

## **3. Hydration Debugging**

Hydration errors (Text content mismatch) usually stem from:

1. Browser-only APIs used in render (`typeof window`, `Date.now()`).
2. Invalid HTML nesting (`<p><div>...</div></p>`).
3. Browser extensions modifying the DOM.

**Fix**: Use `useEffect` + `useState(false)` to defer rendering client-only content until after the first paint.
