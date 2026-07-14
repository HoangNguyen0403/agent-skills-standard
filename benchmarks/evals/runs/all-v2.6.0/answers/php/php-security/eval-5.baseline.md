Use password_hash with PASSWORD_ARGON2ID when the PHP build supports it, and tune memory, time, and thread costs for the production environment.

~~~php
$hash = password_hash($password, PASSWORD_ARGON2ID, [
    'memory_cost' => 65536,
    'time_cost' => 4,
    'threads' => 2,
]);

if ($hash === false) {
    throw new RuntimeException('Password hashing failed');
}
~~~

Do not supply a custom salt; PHP generates a cryptographically secure salt. Store the resulting hash and rehash it when cost policy changes.

