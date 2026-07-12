Hash passwords with password_hash() using a modern algorithm and verify them with password_verify():

~~~php
$hash = password_hash($password, PASSWORD_ARGON2ID);

if (!password_verify($password, $hash)) {
    throw new AuthenticationException();
}
~~~

Never store plaintext or MD5/SHA-1 password hashes; consider password_needs_rehash() after a successful login.

