Put cleanup in finally so it runs after success, an exception, or an early return:

~~~php
$handle = fopen($path, 'rb');

try {
    return $this->read($handle);
} finally {
    fclose($handle);
}
~~~

Use finally for file handles, transactions, and other resources; log or rethrow failures rather than hiding them.

