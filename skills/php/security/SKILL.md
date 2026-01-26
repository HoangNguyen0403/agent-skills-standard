---
name: PHP Security
description: PHP security standards for database access, password handling, and input validation.
metadata:
  labels: [php, security, pdo, hashing]
  triggers:
    files: ['**/*.php']
    keywords: [pdo, password_hash, htmlentities, filter_var]
---

# PHP Security

## **Priority: P0 (CRITICAL)**

PHP security standards for database access, password handling, and input validation.

## Implementation Guidelines

- **Prepared Statements**: Mandatory use of PDO. NEVER concatenate variables directly into SQL.
- **Type Binding**: Use `bindParam()` or `bindValue()` with appropriate PDO constants.
- **Password Hashing**: Use `password_hash()` with `PASSWORD_DEFAULT` or `PASSWORD_ARGON2ID`.
- **Password Verification**: Always use `password_verify()` to check passwords.
- **XSS Prevention**: Escape all user content with `htmlentities($data, ENT_QUOTES, 'UTF-8')`.
- **Data Filtering**: Use `filter_var()` for validating emails, URLs, and numeric inputs.
- **CSRF Tokens**: Ensure all state-changing requests (POST/PUT) use a modern CSRF protection.

## Anti-Patterns

- **Raw SQL**: Avoid string concatenation in database queries.
- **Weak Hashing**: Never use `md5()` or `sha1()` for passwords.
- **Untrusted Input**: Never trust `$_GET` or `$_POST` data without validation.
- **Error Exposure**: Never display raw PHP errors in production environments.

## Code

```php
// SQL Injection Prevention
public function findUser(int $id): ?array
{
    $stmt = $this->pdo->prepare("SELECT * FROM users WHERE id = :id");
    $stmt->execute(['id' => $id]);
    return $stmt->fetch() ?: null;
}

// Secure Password Hashing
$hash = password_hash($password, PASSWORD_ARGON2ID);

// Output Escaping
echo 'Hello, ' . htmlentities($username, ENT_QUOTES, 'UTF-8');
```
