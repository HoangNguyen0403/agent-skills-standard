A table-driven unit test in Go usually looks like this:

```go
package order

import "testing"

func TestParseOrderStatus(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		want    OrderStatus
		wantErr bool
	}{
		{
			name:    "pending status",
			input:   "pending",
			want:    StatusPending,
			wantErr: false,
		},
		{
			name:    "shipped status",
			input:   "shipped",
			want:    StatusShipped,
			wantErr: false,
		},
		{
			name:    "cancelled status",
			input:   "cancelled",
			want:    StatusCancelled,
			wantErr: false,
		},
		{
			name:    "unknown status",
			input:   "oops",
			want:    "",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ParseOrderStatus(tt.input)

			if (err != nil) != tt.wantErr {
				t.Fatalf("ParseOrderStatus(%q) error = %v, wantErr %v", tt.input, err, tt.wantErr)
			}

			if got != tt.want {
				t.Fatalf("ParseOrderStatus(%q) = %v, want %v", tt.input, got, tt.want)
			}
		})
	}
}
```

The pattern is:

- define a slice of test cases
- give each case a name, input, expected output, and expected error state
- loop over the cases
- use `t.Run(...)` so each case runs as a named subtest

If your parser should ignore case or whitespace, add cases like `" Pending "` and `"SHIPPED"` too.

