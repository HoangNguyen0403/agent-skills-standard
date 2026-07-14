Use a thin HTTP handler for `POST /orders`: require JSON, bind and validate the request, call an injected `OrderService`, map service errors to HTTP responses, and return the created order as JSON. Business rules such as pricing, stock checks, and order creation belong in the service or domain layer, not in the handler.

```go
type OrderHandler struct {
	service OrderService
}

func (h *OrderHandler) Create(c echo.Context) error {
	if c.Request().Header.Get(echo.HeaderContentType) != "application/json" {
		return echo.NewHTTPError(http.StatusUnsupportedMediaType, "content type must be application/json")
	}

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

Construct the handler with the service during application setup and register it on the router. Keep middleware such as logging, recovery, auth, and tracing at the router boundary; the handler should parse, delegate, and format the response only.
