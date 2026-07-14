For production, load database credentials from environment variables or a secret manager that exposes them as env vars at runtime. In Go, put them into a typed `Config` struct at startup, validate required fields immediately, and fail fast if anything is missing. Avoid hardcoding secrets, committing `.env` files with real credentials, or reading config from globals throughout the app.

Typical fields would be things like `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME`. You can load them with `os.Getenv` for simple services, or use a config library like Viper, Koanf, or `caarlos0/env` if your app is more complex. Non-secret defaults are fine, but secrets should come only from env vars or a managed secret store.

A good pattern is: load config once at startup, validate it, build the DSN from that config, then inject the config or DB client into the rest of the application through constructors.

