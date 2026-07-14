Use a database index when queries are exact, relational, transactional, and fit the database’s supported operators and scale. Add the appropriate B-tree, GIN, GiST, trigram, or full-text index and inspect the query plan before introducing another system.

Use Elasticsearch when search is a primary capability requiring relevance scoring, analyzers, stemming, fuzzy/autocomplete queries, faceting, very large denormalized indexes, or independent search scaling. It introduces operational cost and eventual consistency, so it should not replace the source of truth. Compare query latency, index size/update rate, freshness requirements, ranking quality, and failure behavior under representative data. A hybrid design is common: PostgreSQL owns writes and Elasticsearch serves rich search.

