Configure the test environment to use SQLite in memory, typically in `phpunit.xml` or `.env.testing`:

```xml
<env name="DB_CONNECTION" value="sqlite"/>
<env name="DB_DATABASE" value=":memory:"/>
```

Ensure the SQLite PHP extension is installed and migrations are compatible with SQLite (some vendor-specific SQL, JSON/index behavior, or foreign-key semantics differ). Use `RefreshDatabase` so the schema is created for each test run. Keep a separate integration suite against the production database engine for queries and migrations that SQLite cannot faithfully model; an in-memory test passing does not prove MySQL/PostgreSQL compatibility.

