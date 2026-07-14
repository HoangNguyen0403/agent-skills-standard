Configure the test environment to use SQLite in memory:

```xml
<env name="DB_CONNECTION" value="sqlite"/>
<env name="DB_DATABASE" value=":memory:"/>
```

Keep `RefreshDatabase` on database-backed tests so migrations and state reset are deterministic. Run the suite with the project’s normal Pest/PHPUnit command and ensure migrations use SQLite-compatible features; if production-specific SQL cannot run on SQLite, use a dedicated integration database for that case. Use Eloquent factories instead of raw inserts and mock network services so the test process remains fast and isolated.

