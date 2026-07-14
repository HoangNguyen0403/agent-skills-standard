Validate that filter_var returns a string rather than false. Trim only if the application defines that behavior, and normalize or canonicalize the address according to the domain requirements.

~~~php
$email = trim((string) ($_POST['email'] ?? ''));

if (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
    throw new InvalidArgumentException('Invalid email address');
}
~~~

Email validation is not proof that a mailbox exists; use confirmation mail when ownership matters.

