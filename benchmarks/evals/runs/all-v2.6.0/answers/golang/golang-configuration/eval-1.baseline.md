For production, don’t hardcode database credentials in your Go code or commit them to the repo.

Load them from environment variables or a secret manager, then build your DB connection string at startup.

Example with environment variables:

```go
package main

import (
	"fmt"
	"os"
)

func main() {
	host := os.Getenv("DB_HOST")
	port := os.Getenv("DB_PORT")
	user := os.Getenv("DB_USER")
	password := os.Getenv("DB_PASSWORD")
	name := os.Getenv("DB_NAME")

	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=require",
		host, port, user, password, name,
	)

	fmt.Println(dsn)
}
```

In real deployments, a common pattern is:

- local development: `.env` file or local environment variables
- staging/production: injected environment variables from Docker, Kubernetes, systemd, or your cloud platform
- higher security: fetch secrets from AWS Secrets Manager, GCP Secret Manager, HashiCorp Vault, or similar

Good practices:

- fail fast if required env vars are missing
- never log raw passwords
- rotate credentials regularly
- give the DB user only the permissions it needs
- enable TLS/SSL for production connections

If you want, I can also show a production-ready example using `pgx`, `database/sql`, or Viper.

