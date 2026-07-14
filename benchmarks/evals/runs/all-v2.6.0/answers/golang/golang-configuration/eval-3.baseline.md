Validate required config at startup and fail fast instead of letting the app boot with an empty value.

Typical fix:

```go
package config

import (
	"fmt"
	"os"
)

type Config struct {
	DatabaseURL string
}

func Load() (Config, error) {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		return Config{}, fmt.Errorf("DATABASE_URL is required")
	}

	return Config{
		DatabaseURL: dbURL,
	}, nil
}
```

Then in `main`:

```go
cfg, err := config.Load()
if err != nil {
	log.Fatalf("config error: %v", err)
}
```

Why this works:
- the service refuses to start with invalid configuration
- the failure happens immediately and clearly
- downstream database initialization never sees a missing URL

If you already use a config library, apply the same rule there: mark `DATABASE_URL` as required or explicitly validate after loading.

