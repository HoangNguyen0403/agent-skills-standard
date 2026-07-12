Create the Echo router, wrap it in an `http.Server`, start it in a goroutine, and shut it down on `SIGINT` or `SIGTERM` with a bounded context. Treat `http.ErrServerClosed` as a normal server exit.

```go
func run() error {
	e := echo.New()
	e.Use(middleware.Logger(), middleware.Recover())
	e.GET("/health", healthHandler)
	e.GET("/ready", readyHandler)

	srv := &http.Server{Addr: ":8080", Handler: e}
	serverErr := make(chan error, 1)
	go func() {
		serverErr <- e.StartServer(srv)
	}()

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	select {
	case err := <-serverErr:
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return err
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := srv.Shutdown(shutdownCtx); err != nil {
			return err
		}
		return nil
	}
}
```

`Shutdown` stops accepting new connections and lets in-flight requests finish until the timeout. Handlers should honor their request context so they can terminate promptly; expose `/health` and `/ready` for operational checks.
