Use a signal-aware context and call `Echo.Shutdown` with a timeout context. Start the server in a goroutine, treat `http.ErrServerClosed` as a normal shutdown result, and let the main goroutine wait for the shutdown path.

```go
func run() error {
	e := echo.New()
	// register middleware and routes

	serverErr := make(chan error, 1)
	go func() {
		serverErr <- e.Start(":8080")
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
		if err := e.Shutdown(shutdownCtx); err != nil {
			return err
		}
		return nil
	}
}
```

`Shutdown` stops accepting new connections and waits for active requests until the timeout. For production code, log startup and shutdown errors and ensure handlers honor their request context so they can finish promptly.
