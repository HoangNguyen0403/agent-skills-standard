Unit test the service by depending on an interface, not a concrete DB client.

Your service should receive a repository or store interface:

```go
type UserStore interface {
    GetByID(ctx context.Context, id string) (*User, error)
}

type Service struct {
    store UserStore
}

func NewService(store UserStore) *Service {
    return &Service{store: store}
}
```

Then in tests, replace the real DB with a mock or fake implementation:

```go
type mockUserStore struct {
    user *User
    err  error
}

func (m *mockUserStore) GetByID(ctx context.Context, id string) (*User, error) {
    return m.user, m.err
}
```

Use table-driven tests so you can cover success and failure paths cleanly:

```go
func TestService_GetUser(t *testing.T) {
    t.Parallel()

    tests := []struct {
        name    string
        store   UserStore
        wantErr bool
    }{
        {
            name:    "returns user",
            store:   &mockUserStore{user: &User{ID: "1"}},
            wantErr: false,
        },
        {
            name:    "propagates store error",
            store:   &mockUserStore{err: errors.New("db failed")},
            wantErr: true,
        },
    }

    for _, tt := range tests {
        tt := tt
        t.Run(tt.name, func(t *testing.T) {
            t.Parallel()

            svc := NewService(tt.store)
            _, err := svc.GetUser(context.Background(), "1")

            if (err != nil) != tt.wantErr {
                t.Fatalf("got err=%v, wantErr=%v", err, tt.wantErr)
            }
        })
    }
}
```

This keeps the unit test fast and deterministic because you are testing service logic, not database integration.

If you want to test the real DB wiring, keep that as a separate integration test.

