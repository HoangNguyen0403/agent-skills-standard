Optimize from evidence rather than guessing:

1. Enable `DB::enableQueryLog()` or use Debugbar and capture the slow SQL, bindings, count, and timing.
2. Add migrations for indexes matching the real join and filter columns.
3. Replace N+1 loops with eager aggregates such as `withCount()`/`withSum()`, `joinSub()`, `whereExists()`, or an `addSelect` subquery.
4. Cache stable, frequently read results with `Cache::remember()` and tags where the backend supports them.
5. Configure read/write connections in `config/database.php` when read replicas are needed.

Use bindings for every raw expression; never concatenate user input into SQL. Verify the resulting query plan and response latency, because an index or cache that does not match the access path can add cost without fixing the bottleneck.

