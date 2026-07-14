Validate required config at startup and fail fast if `DATABASE_URL` is missing.

In Go, load config into a typed `Config` struct, read env vars before starting the app, and return an error immediately if a required value is empty. Then inject that config into your services instead of letting code read globals later.

Example:

```go
package config

import (
	"fmt"
	"os"
)

type Config struct {
	DatabaseURL string
	Port        string
}

func Load() (Config, error) {
	cfg := Config{
		DatabaseURL: os.Getenv("DATABASE_URL"),
		Port:        getenv("PORT", "8080"),
	}

	if cfg.DatabaseURL == "" {
		return Config{}, fmt.Errorf("DATABASE_URL is required")
	}

	return cfg, nil
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
```

Then in `main`:

```go
func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}

	app := NewApp(cfg)
	if err := app.Run(); err != nil {
		log.Fatal(err)
	}
}
```

Why this fixes it:

- `DATABASE_URL` is treated as required
- the app crashes immediately at startup instead of later
- config is centralized, typed, and injected cleanly

If you use Viper or Koanf, keep the same rule: load config, override from env, validate required fields immediately, and exit before serving traffic.

