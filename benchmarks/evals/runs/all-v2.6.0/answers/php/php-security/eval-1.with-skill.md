Use PDO prepared statements with bound parameters; never concatenate user input into SQL:

~~~php
$statement = $pdo->prepare(
    'SELECT * FROM users WHERE id = :id'
);
$statement->execute(['id' => $userId]);

$user = $statement->fetch(PDO::FETCH_ASSOC);
~~~

Enable exception mode and validate the input before querying. Parameterization protects the SQL structure but does not replace authorization.

