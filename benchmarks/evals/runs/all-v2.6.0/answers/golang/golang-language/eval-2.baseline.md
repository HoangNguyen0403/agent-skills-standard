In Go, keep imports in a single `import` block when there are multiple packages, and let `gofmt` handle the formatting.

General conventions:

- Group imports with standard library packages first
- Leave a blank line before third-party or local module imports
- Avoid unused imports
- Prefer automatic formatting with `gofmt` or `goimports`

Example:

```go
import (
    "context"
    "fmt"
    "net/http"

    "github.com/gin-gonic/gin"
    "myapp/internal/service"
)
```

Tips:

- Use a single-line import only for one package
- Keep import paths exact and lowercase as defined by the module
- Run `gofmt` after edits to keep style consistent

