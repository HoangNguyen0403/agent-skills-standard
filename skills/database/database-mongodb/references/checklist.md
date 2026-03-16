# MongoDB Review Checklist

## Schema Design

- [ ] **Embedding Check**: Are 1:1 and 1:Few relations embedded?
- [ ] **Array Check**: Do all arrays have a logical or hard limit? (e.g., `< 100` items).
- [ ] **Data Types**: Are Dates stored as `Date` objects (not strings)? Numbers as proper Number types?
- [ ] **Indexes**: Do all queries utilize an index? (Check `.explain("executionStats")`).
  - [ ] **Redundancy**: Are suffix indexes removed? (e.g., remove `{a:1}` if `{a:1, b:1}` exists).
  - [ ] **TTL**: Are ephemeral data (logs/sessions) using TTL indexes?

## Performance

- [ ] **Explain Plan**: Is `totalDocsExamined` close to `nReturned`? (Constraint: Ratio < 1.1).
- [ ] **ESR Rule**: Do compound indexes follow Equality -> Sort -> Range?
- [ ] **Projections**: do queries return only needed fields (`{ field: 1 }`)?
- [ ] **Aggregation**: Is logic performed in DB (`$group`) rather than app code?
- [ ] **Pagination**: Using `_id` range instead of `skip()` for large lists?

## Sharding (If Applicable)

- [ ] **Shard Key**: Validated high-cardinality and non-monotonic distribution?
- [ ] **Targeting**: Do most queries include the Shard Key? (Avoid Scatter-Gather).

## Security & Reliability

- [ ] **Injection**: Are inputs validated/sanitized? (Avoid constructing query objects from raw user JSON).
- [ ] **timeouts**: Are connection and socket timeouts configured?
- [ ] **Error Handling**: Are duplicate key errors (`E11000`) handled gracefully?
