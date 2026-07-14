Configure separate `read` and `write` hosts in the connection definition, usually in `config/database.php`:

```php
'mysql' => [
    'driver' => 'mysql',
    'read' => ['host' => [env('DB_READ_HOST')]],
    'write' => ['host' => [env('DB_WRITE_HOST')]],
    'sticky' => true,
    // shared database name, credentials, and options...
],
```

Laravel routes SELECT queries to the read connection and writes to the write connection; no application query rewrite should be needed. `sticky` can keep reads in the same request on the write connection after a write, reducing replica-lag surprises. Access environment values through configuration in application code, cache configuration after deployment, and verify the actual connection routing and replica health before relying on it.

