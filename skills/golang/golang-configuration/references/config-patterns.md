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
