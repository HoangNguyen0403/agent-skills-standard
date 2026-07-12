Avoid a global variable for the Echo router. Create the router during application setup and pass it to the component that owns the server lifecycle, or wrap the router in an application struct. A global makes tests share mutable state, complicates parallel tests, hides dependencies, and makes multiple server instances difficult.

For example:

```go
type App struct {
	Echo *echo.Echo
}

func NewApp(deps Dependencies) *App {
	e := echo.New()
	registerRoutes(e, deps)
	return &App{Echo: e}
}

func main() {
	app := NewApp(loadDependencies())
	if err := app.Echo.Start(":8080"); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatal(err)
	}
}
```

Package-level constants and stateless helper functions are fine. Keep mutable router state owned by the application instance and inject dependencies into handlers or route registration.
