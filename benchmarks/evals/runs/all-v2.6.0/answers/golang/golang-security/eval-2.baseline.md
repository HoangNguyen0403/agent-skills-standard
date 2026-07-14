Use Go's `crypto/rand` package, not `math/rand`.

Example:

```go
package main

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
)

func generateResetToken(nBytes int) (string, error) {
	b := make([]byte, nBytes)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func main() {
	token, err := generateResetToken(32) // 32 bytes = 64 hex chars
	if err != nil {
		panic(err)
	}
	fmt.Println(token)
}
```

If you want a URL-safe token, you can use `encoding/base64` with `RawURLEncoding` instead of hex.

In general:

- Use at least 32 random bytes for reset tokens.
- Store an expiry time.
- Prefer storing a hashed version of the token server-side if possible.
- Compare tokens carefully and invalidate them after use.

