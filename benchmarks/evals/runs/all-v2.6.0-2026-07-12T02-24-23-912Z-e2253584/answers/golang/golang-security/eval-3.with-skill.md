The recommended password hashing algorithm for Go is Argon2id, typically via `golang.org/x/crypto/argon2`. It is preferred over bcrypt, MD5, or SHA-1 for new password hashing. A common baseline is `time=1`, `memory=64MB`, and `threads=4`, with a unique random salt per password.

