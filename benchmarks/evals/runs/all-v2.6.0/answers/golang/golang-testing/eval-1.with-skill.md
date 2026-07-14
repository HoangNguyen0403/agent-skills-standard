Use a table-driven test: define cases as a slice of structs, then loop with `t.Run(...)` so each status case is isolated.

```go
package order

import (
	"testing"
)

func TestParseOrderStatus(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		input   string
		want    OrderStatus
		wantErr bool
	}{
		{
			name:    "paid",
			input:   "paid",
			want:    StatusPaid,
			wantErr: false,
		},
		{
			name:    "pending",
			input:   "pending",
			want:    StatusPending,
			wantErr: false,
		},
		{
			name:    "unknown status",
			input:   "oops",
			want:    "",
			wantErr: true,
		},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			got, err := ParseOrderStatus(tc.input)

			if tc.wantErr {
				if err == nil {
					t.Fatalf("expected error for input %q, got nil", tc.input)
				}
				return
			}

			if err != nil {
				t.Fatalf("unexpected error for input %q: %v", tc.input, err)
			}

			if got != tc.want {
				t.Fatalf("ParseOrderStatus(%q) = %q, want %q", tc.input, got, tc.want)
			}
		})
	}
}
```

Example production code shape:

```go
type OrderStatus string

const (
	StatusPaid    OrderStatus = "paid"
	StatusPending OrderStatus = "pending"
	StatusShipped OrderStatus = "shipped"
)

func ParseOrderStatus(s string) (OrderStatus, error) {
	switch s {
	case "paid":
		return StatusPaid, nil
	case "pending":
		return StatusPending, nil
	case "shipped":
		return StatusShipped, nil
	default:
		return "", fmt.Errorf("invalid order status: %s", s)
	}
}
```

Why this pattern works well:

- Easy to add new statuses without duplicating test logic
- Failures are isolated by subtest name
- Valid and invalid inputs are covered in one compact test

Run it with:

```bash
go test ./...
```

