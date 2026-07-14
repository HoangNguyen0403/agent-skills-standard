Unit test it by removing the real database from the test boundary.

The usual Go pattern is:

1. Define a small interface for the DB behavior your service needs.
2. Make your service depend on that interface, not a concrete DB client.
3. In tests, pass a fake, stub, or mock implementation.
4. Use integration tests separately for real DB behavior.

Example:

```go
package app

import "context"

type User struct {
	ID   string
	Name string
}

type UserStore interface {
	GetUser(ctx context.Context, id string) (User, error)
}

type Service struct {
	store UserStore
}

func NewService(store UserStore) *Service {
	return &Service{store: store}
}

func (s *Service) LoadUserName(ctx context.Context, id string) (string, error) {
	user, err := s.store.GetUser(ctx, id)
	if err != nil {
		return "", err
	}
	return user.Name, nil
}
```

Test with a fake:

```go
package app

import (
	"context"
	"errors"
	"testing"
)

type fakeUserStore struct {
	user User
	err  error
}

func (f *fakeUserStore) GetUser(ctx context.Context, id string) (User, error) {
	if f.err != nil {
		return User{}, f.err
	}
	return f.user, nil
}

func TestLoadUserName_Success(t *testing.T) {
	store := &fakeUserStore{
		user: User{ID: "1", Name: "Alice"},
	}
	svc := NewService(store)

	got, err := svc.LoadUserName(context.Background(), "1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got != "Alice" {
		t.Fatalf("got %q, want %q", got, "Alice")
	}
}

func TestLoadUserName_Error(t *testing.T) {
	store := &fakeUserStore{
		err: errors.New("db failure"),
	}
	svc := NewService(store)

	_, err := svc.LoadUserName(context.Background(), "1")
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}
```

If you want stricter interaction checks, you can use a mock library, but simple fakes are often easier to maintain.

Rule of thumb:

- unit tests: fake the DB
- integration tests: use a real DB
- keep DB logic behind an interface seam

