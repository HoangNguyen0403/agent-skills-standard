# Golang Security Implementation Examples

## Crypto/Rand vs Math/Rand

```go
// ❌ BAD: math/rand is predictable
import "math/rand"
token := rand.Intn(1000000) // NEVER for security

// ✅ GOOD: crypto/rand is cryptographically secure
import "crypto/rand"
import "encoding/base64"

func GenerateToken() (string, error) {
    b := make([]byte, 32)
    _, err := rand.Read(b)
    if err != nil {
        return "", err
    }
    return base64.URLEncoding.EncodeToString(b), nil
}
```

## SQL Injection Prevention

```go
// ❌ BAD: String concatenation
query := fmt.Sprintf("SELECT * FROM users WHERE email = '%s'", email)
db.Query(query)

// ✅ GOOD: Parameterized query
db.Query("SELECT * FROM users WHERE email = $1", email)
```

## Password Hashing with bcrypt

```go
import "golang.org/x/crypto/bcrypt"

// Hash password
func HashPassword(password string) (string, error) {
    bytes, err := bcrypt.GenerateFromPassword([]byte(password), 14)
    return string(bytes), err
}

// Verify password
func CheckPassword(password, hash string) bool {
    err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
    return err == nil
}
```

## JWT Validation

```go
import (
    "github.com/golang-jwt/jwt/v5"
)

func ValidateJWT(tokenString string) (*jwt.Token, error) {
    return jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
        // Validate algorithm
        if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
            return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
        }

        // Validate claims
        if claims, ok := token.Claims.(jwt.MapClaims); ok {
            if !claims.VerifyIssuer("your-issuer", true) {
                return nil, fmt.Errorf("invalid issuer")
            }
            if !claims.VerifyExpiresAt(time.Now().Unix(), true) {
                return nil, fmt.Errorf("token expired")
            }
        }

        return []byte(os.Getenv("JWT_SECRET")), nil
    })
}
```
