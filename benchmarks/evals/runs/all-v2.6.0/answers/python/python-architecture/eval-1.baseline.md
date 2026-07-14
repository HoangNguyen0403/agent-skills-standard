No—assuming a layered Python architecture, a domain rule should not import `psycopg2` directly.

Put database access behind a repository/port interface, inject it into the rule, and keep the `psycopg2` implementation in the infrastructure layer. This preserves domain isolation and makes the rule testable without PostgreSQL.
