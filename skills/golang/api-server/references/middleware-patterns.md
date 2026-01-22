# Middleware Patterns

## Standard Library Pattern

```go
func LoggingMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        // Serve request
        next.ServeHTTP(w, r)
        // Log after completion
        log.Printf("%s %s %v", r.Method, r.URL.Path, time.Since(start))
    })
}
```

## Chaining

Use libraries like `alice` or just simple composition.

```go
handler = LoggingMiddleware(AuthMiddleware(finalHandler))
```

## Echo Middleware

```go
func Track(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		req := c.Request()
		res := c.Response()
        // Logic before
		if err := next(c); err != nil {
			c.Error(err)
		}
        // Logic after
		return nil
	}
}
```
