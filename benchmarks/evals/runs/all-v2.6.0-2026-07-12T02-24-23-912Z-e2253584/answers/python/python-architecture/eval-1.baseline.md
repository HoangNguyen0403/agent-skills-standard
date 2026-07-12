Directly importing `psycopg2` in a domain rule is usually a layering violation. The domain should depend on an abstract repository or task lookup port, while an infrastructure adapter owns the PostgreSQL and `psycopg2` details.

Pass the repository (or port) into the rule/use case, return a domain model rather than a database row, and keep connection management, SQL, and driver exceptions at the adapter boundary. A small script may pragmatically combine these concerns, but a reusable domain layer should keep the dependency inverted so it can be tested without PostgreSQL.
