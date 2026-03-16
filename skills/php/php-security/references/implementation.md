# PHP Security Reference

## Secure Database & Password Handling

### Prepared Statements (PDO)

```php
// SQL Injection Prevention
public function findUser(int $id): ?array
{
    $stmt = $this->pdo->prepare("SELECT * FROM users WHERE id = :id");
    $stmt->execute(['id' => $id]);
    return $stmt->fetch() ?: null;
}
```

### Modern Password Hashing

```php
// Use Argon2id for maximum security
$hash = password_hash($password, PASSWORD_ARGON2ID);

// Verify securely
if (password_verify($inputPassword, $storedHash)) {
    // ... logic
}
```

### Output Escaping (XSS)

```php
// Escape for HTML context
echo 'Hello, ' . htmlentities($username, ENT_QUOTES, 'UTF-8');
```
