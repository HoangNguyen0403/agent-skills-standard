Use PASSWORD_ARGON2ID with password_hash():

~~~php
$hash = password_hash($password, PASSWORD_ARGON2ID);

if ($hash === false) {
    throw new RuntimeException('Password hashing failed');
}
~~~

Store only the resulting hash, never the password, and use password_verify() for authentication.

