Hash passwords with password_hash and verify them with password_verify. Never store plaintext or reversible encryption. Store the complete generated hash, because it contains the algorithm, cost, and salt.

~~~php
$hash = password_hash($password, PASSWORD_DEFAULT);

if (!password_verify($password, $hash)) {
    throw new RuntimeException('Invalid credentials');
}
~~~

Use password_needs_rehash after successful authentication when changing algorithm or cost settings, and rate-limit login attempts.

