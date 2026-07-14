Use `URLComponents` instead of string concatenation. It safely handles path and query encoding.

Example:

```swift
var components = URLComponents()
components.scheme = "https"
components.host = "api.example.com"
components.path = "/v1/users"
components.queryItems = [
    URLQueryItem(name: "page", value: "1"),
    URLQueryItem(name: "search", value: "john doe")
]

guard let url = components.url else {
    fatalError("Invalid URL")
}
```

Tips:

- Keep the base URL in one place, like config.
- Build endpoints with paths, not raw full strings everywhere.
- Use `queryItems` for query parameters.
- Avoid manual percent-encoding unless absolutely necessary.
``` 

