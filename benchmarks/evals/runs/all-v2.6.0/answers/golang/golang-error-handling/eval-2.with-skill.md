Define an exported sentinel with `errors.New`, then wrap lower-level errors with context and check via `errors.Is`.

```go
package repository

import (
	"errors"
	"fmt"
)

var ErrNotFound = errors.New("not found")

func (r *Repo) Get(id string) (*Item, error) {
	item, err := r.load(id)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return nil, fmt.Errorf("get item %q: %w", id, err)
		}
		return nil, fmt.Errorf("get item %q: %w", id, err)
	}
	return item, nil
}
```

If your repository maps another source error like `sql.ErrNoRows`, convert it once at the boundary:

```go
if errors.Is(err, sql.ErrNoRows) {
	return nil, fmt.Errorf("load item %q: %w", id, ErrNotFound)
}
```

And callers should check it like:

```go
if errors.Is(err, repository.ErrNotFound) {
	// handle missing record
}
```

Avoid comparing `err.Error()` strings. Use `errors.Is` so wrapping keeps working.

