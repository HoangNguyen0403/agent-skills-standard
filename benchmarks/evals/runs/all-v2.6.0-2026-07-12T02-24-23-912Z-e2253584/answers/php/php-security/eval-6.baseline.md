Fetch the stored password hash by an unambiguous identifier, then call password_verify with the submitted password. Use a generic failure response, rate-limit attempts, and regenerate the session ID after successful login.

~~~php
$user = $users->findByEmail($email);

if ($user === null || !password_verify($password, $user->passwordHash)) {
    throw new InvalidArgumentException('Invalid credentials');
}

if (password_needs_rehash($user->passwordHash, PASSWORD_DEFAULT)) {
    $users->updatePasswordHash($user->id, password_hash($password, PASSWORD_DEFAULT));
}

session_regenerate_id(true);
$_SESSION['user_id'] = $user->id;
~~~

Use HTTPS, secure HttpOnly SameSite cookies, CSRF protection for state-changing browser requests, and never log credentials.

