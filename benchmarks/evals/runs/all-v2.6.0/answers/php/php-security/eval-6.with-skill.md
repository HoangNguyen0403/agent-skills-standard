Authenticate by loading the stored hash and calling password_verify(); never compare plaintext or hashes manually:

~~~php
if (!password_verify($password, $user->passwordHash)) {
    throw new AuthenticationException();
}

if (password_needs_rehash($user->passwordHash, PASSWORD_ARGON2ID)) {
    $user->replacePasswordHash(password_hash($password, PASSWORD_ARGON2ID));
}
~~~

Add rate limiting, secure session handling, and MFA where appropriate, and avoid exposing whether a username or password was wrong.

