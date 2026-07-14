In Go, keep imports in a single `import` block, grouped and automatically formatted with `gofmt` or `goimports`.

General structure:

```go
import (
    "context"
    "fmt"

    "github.com/acme/project/internal/service"
)
```

Use these rules:

- Standard library imports first
- Blank line
- Third-party or local project imports after that
- Let `goimports` sort and clean them automatically
- Avoid unused imports
- Prefer one grouped `import (...)` block when there are multiple imports

Also:

- Use short, lowercase package names
- Alias imports only when necessary, such as name collisions or clearer intent
- Avoid dot imports except in rare cases like some tests
- Avoid renaming imports without a real reason

In practice, the safest approach is: write the code, then run `goimports` so import order, formatting, and cleanup stay idiomatic.*** End Patch

