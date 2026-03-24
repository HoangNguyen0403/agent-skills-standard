# Config Pattern

Using `viper` or simple env loading.

```go
type Config struct {
    Server   ServerConfig
    Database DatabaseConfig
}

type ServerConfig struct {
    Port int    `mapstructure:"PORT"`
    Mode string `mapstructure:"MODE"` // debug, release
}

func LoadConfig() (*Config, error) {
    viper.SetDefault("PORT", 8080)
    viper.AutomaticEnv()

    var cfg Config
    if err := viper.Unmarshal(&cfg); err != nil {
        return nil, err
    }

    // Validation
    if cfg.Server.Port == 0 {
        return nil, fmt.Errorf("PORT is required")
    }

    return &cfg, nil
}
```

## Config Struct with env Tags

```go
type Config struct {
    Port        int    `env:"PORT" envDefault:"8080"`
    DatabaseURL string `env:"DATABASE_URL,required"`
    LogLevel    string `env:"LOG_LEVEL" envDefault:"info"`
    JWTSecret   string `env:"JWT_SECRET,required"`
}

func LoadConfig() (*Config, error) {
    cfg := &Config{}
    if err := env.Parse(cfg); err != nil {
        return nil, fmt.Errorf("config parse failed: %w", err)
    }
    return cfg, nil
}
```

## Usage in main.go

```go
func main() {
    cfg, err := LoadConfig()
    if err != nil {
        log.Fatalf("failed to load config: %v", err)
    }
    db := postgres.NewConnection(cfg.DatabaseURL)
    srv := server.New(cfg.Port, db)
    srv.Start()
}
```
