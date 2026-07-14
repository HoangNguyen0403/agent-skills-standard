Use `crypto/rand`, not `math/rand`, for a password-reset token.

```go
package main

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
)

func generateResetToken(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

func main() {
	token, err := generateResetToken(32) // 32 random bytes
	if err != nil {
		panic(err)
	}
	fmt.Println(token)
}
```

Why this is secure:

- `crypto/rand` provides cryptographically secure randomness.
- `base64.RawURLEncoding` gives you a URL-safe token without padding.
- `32` bytes is a strong default for reset tokens.

Notes:

- Store only a hash of the reset token server-side if possible, not the raw token.
- Set a short expiration time and make the token single-use.
- Do not use predictable values or `math/rand` for anything security-sensitive.

