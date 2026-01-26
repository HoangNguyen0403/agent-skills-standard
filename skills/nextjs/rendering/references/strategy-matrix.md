# Strategy Selection Matrix

Choose the right rendering strategy based on your requirements for data freshness, performance, and scaling characteristics.

## Comparison Matrix

| Strategy | Ideal For              | Data Freshness       | Performance (TTFB)          | Scaling Risk                         |
| :------- | :--------------------- | :------------------- | :-------------------------- | :----------------------------------- |
| **SSG**  | Marketing, Docs, Blogs | Build Time           | **Instant** (CDN)           | **None**                             |
| **ISR**  | E-commerce, CMS        | Periodic (e.g., 60s) | **Instant** (CDN)           | **Low** (Background Rebuilds)        |
| **SSR**  | Dashboards, Auth Gates | Real-Time (Request)  | **Slow** (Waits for Server) | **Critical** (1 Request = 1 Compute) |
| **PPR**  | Personalized Apps      | Hybrid               | **Instant** (Shell)         | **Medium** (Streaming Holes)         |

## Decision Guide

### Use SSG when

- Content changes infrequently (e.g., blog posts, marketing pages)
- All users see the same content
- Maximum performance is critical (CDN edge caching)
- Zero scaling concerns

### Use ISR when

- Content updates periodically but not in real-time
- You have many pages and rebuilding all is expensive
- E-commerce product pages, CMS content
- Balance between freshness and performance

### Use SSR when

- Data must be fresh on every request
- User-specific content (dashboards, auth gates)
- Cannot be cached (personalized data)
- Accept slower TTFB for real-time accuracy

### Use PPR when

- Mix of static shell and dynamic content
- Want instant perceived performance
- Personalized sections within otherwise static pages
- Modern approach combining best of SSG + SSR

## Cost Implications

**SSG/ISR**: Lowest cost - CDN bandwidth only, no compute per request  
**SSR**: Highest cost - Server compute on every request (can scale exponentially)  
**PPR**: Medium cost - CDN for shell + server for dynamic holes
