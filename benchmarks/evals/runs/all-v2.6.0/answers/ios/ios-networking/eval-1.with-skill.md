Use `URLComponents` with `URLQueryItem` instead of string interpolation.

Example:

```swift
var components = URLComponents(string: "https://api.example.com/search")!
components.queryItems = [
    URLQueryItem(name: "q", value: "iphone 16"),
    URLQueryItem(name: "page", value: "1")
]

let url = components.url!
```

Why:

- Safely encodes query parameters
- Avoids bugs with spaces, `&`, `?`, and other special characters
- Makes optional parameters easier to add/remove

If you also need path composition, keep the base URL fixed and append path segments cleanly before adding query items.

