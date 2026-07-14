Validate the email before using it:

~~~php
$email = filter_var($input, FILTER_VALIDATE_EMAIL);

if ($email === false) {
    throw new InvalidArgumentException('Invalid email address');
}
~~~

Normalize only according to application rules, whitelist allowed values, and still apply authorization and output escaping.

