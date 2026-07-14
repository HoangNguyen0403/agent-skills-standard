Keep the HTTP handler focused on transport concerns: decode and validate the request, call an injected order service, map service errors to HTTP status codes, and encode the response as JSON. Put business rules and order creation in the service/use-case layer, not in the Echo handler.

```go
type OrderService interface {
	Create(ctx context.Context, req CreateOrderRequest) (Order, error)
}

type OrderHandler struct {
	service OrderService
}

func (h *OrderHandler) Create(c echo.Context) error {
	var req CreateOrderRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request")
	}
	if err := validate(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	order, err := h.service.Create(c.Request().Context(), req)
	if err != nil {
		return mapOrderError(err)
	}
	return c.JSON(http.StatusCreated, order)
}
```

Register the handler with the router and construct it with the service implementation at application startup. This keeps the endpoint testable and prevents Echo-specific code from becoming the business layer.
