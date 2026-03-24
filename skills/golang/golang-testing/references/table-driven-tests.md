# Table-Driven Tests

```go
func TestAdd(t *testing.T) {
    type args struct {
        a int
        b int
    }
    tests := []struct {
        name string
        args args
        want int
    }{
        {"positive", args{1, 2}, 3},
        {"negative", args{-1, -1}, -2},
        {"mixed", args{1, -1}, 0},
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            if got := Add(tt.args.a, tt.args.b); got != tt.want {
                t.Errorf("Add() = %v, want %v", got, tt.want)
            }
        })
    }
}
```

## Parallel Execution

```go
func TestSomething(t *testing.T) {
    t.Parallel() // 1. Parent parallel
    // ... logic
    for _, tt := range tests {
        tt := tt // Capture range var
        t.Run(tt.name, func(t *testing.T) {
            t.Parallel() // 2. Subtest parallel
            // ... logic
        })
    }
}
```

## Table-Driven Test with Testify

```go
func TestGetOrder(t *testing.T) {
    tests := []struct {
        name    string
        id      string
        want    *Order
        wantErr bool
    }{
        {
            name: "valid order",
            id:   "order-123",
            want: &Order{ID: "order-123", Status: "confirmed"},
        },
        {
            name:    "missing ID returns error",
            id:      "",
            wantErr: true,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            t.Parallel()
            got, err := svc.GetOrder(context.Background(), tt.id)
            if tt.wantErr {
                require.Error(t, err)
                return
            }
            require.NoError(t, err)
            assert.Equal(t, tt.want.ID, got.ID)
        })
    }
}
```
