Configure `read` and `write` hosts in `config/database.php` for the connection:

```php
'mysql' => [
    'driver' => 'mysql',
    'read' => ['host' => [env('DB_READ_HOST')]],
    'write' => ['host' => [env('DB_WRITE_HOST')]],
    'sticky' => true,
    // shared database options...
],
```

Laravel routes reads to replicas and writes to the primary. `sticky` keeps reads in the same request on the write connection after a write, reducing read-after-write inconsistency. It does not solve cross-request replication lag, so use the primary for critical immediately-consistent reads or an explicit connection. Keep credentials/config in environment-backed config, monitor replica lag, and verify migrations/write traffic against the primary.

