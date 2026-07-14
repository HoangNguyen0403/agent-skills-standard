Define a package-level sentinel error and wrap it when adding context.

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
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("get item %s: %w", id, ErrNotFound)
		}
		return nil, fmt.Errorf("get item %s: %w", id, err)
	}
	return item, nil
}
```

Callers can then check:

```go
if errors.Is(err, repository.ErrNotFound) {
	// handle missing record
}
```

