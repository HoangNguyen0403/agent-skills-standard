Named arguments pass parameters by their declared names, improving readability and allowing optional parameters to be skipped.

~~~php
function connect(string $host, int $port = 443, bool $secure = true): void
{
}

connect(host: 'example.com', secure: false);
~~~

Use stable, descriptive parameter names because callers depend on them. Do not use named arguments with APIs whose parameter names are likely to change without considering that compatibility cost.

