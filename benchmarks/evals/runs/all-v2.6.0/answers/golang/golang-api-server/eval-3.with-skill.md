No—avoid a global Echo router. Create the router during application composition and pass it to route registration or the component that owns the server lifecycle. This keeps dependencies explicit, prevents shared mutable state between tests, and supports multiple server instances.

```go
type App struct {
	Echo *echo.Echo
}

func NewApp(deps Dependencies) *App {
	e := echo.New()
	e.Use(middleware.Logger(), middleware.Recover())
	registerRoutes(e, deps)
	e.GET("/health", healthHandler)
	e.GET("/ready", readyHandler)
	return &App{Echo: e}
}

func main() {
	app := NewApp(loadDependencies())
	// Start app.Echo through an http.Server and add signal-aware graceful shutdown.
	if err := app.Echo.Start(":8080"); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatal(err)
	}
}
```

Inject services into handlers and keep middleware and route registration in startup code. Package-level constants and stateless helpers are fine; mutable router state should belong to the application instance.
