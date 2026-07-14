Use a database index for structured equality/range/order queries and Elasticsearch when you need full-text relevance, fuzzy matching, complex filtering, or aggregations over a search document. Keep PostgreSQL/MySQL as the write source of truth and project flatter read documents into the search engine through an event-driven or CDC pipeline.

Do not introduce Elasticsearch merely to replace a missing database index. Add the appropriate relational index first, measure query behavior, and accept the eventual-consistency and operational cost of a search cluster when the search requirements justify it.

