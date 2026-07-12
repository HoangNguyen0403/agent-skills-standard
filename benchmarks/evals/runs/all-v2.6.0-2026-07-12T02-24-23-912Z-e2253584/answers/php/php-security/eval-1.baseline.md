Use PDO prepared statements with bound parameters; never concatenate request data into SQL. Keep credentials outside source control, validate inputs for business rules, and use least-privilege database accounts.

~~~php
$statement = $pdo->prepare(
    'SELECT id, email FROM users WHERE email = :email'
);
$statement->execute(['email' => $email]);
$user = $statement->fetch(PDO::FETCH_ASSOC);
~~~

Set PDO::ATTR_EMULATE_PREPARES to false when supported by the driver and handle database errors without exposing query details.

